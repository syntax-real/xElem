import { downloadBlob } from '../../System/Elements/Function';
import { createLogger } from '../Logger';

const logger = createLogger('AudioDownloader');

type FlacMetadataBlock = {
    type: number;
    length: number;
    data: Uint8Array;
};

const parseFlac = (arrayBuffer: ArrayBuffer): FlacMetadataBlock[] => {
    const view = new DataView(arrayBuffer);

    let offset = 0;

    const signature =
        String.fromCharCode(view.getUint8(0)) +
        String.fromCharCode(view.getUint8(1)) +
        String.fromCharCode(view.getUint8(2)) +
        String.fromCharCode(view.getUint8(3));

    if (signature !== 'fLaC') {
        throw new Error('Это не FLAC файл');
    }

    offset = 4;

    const blocks: FlacMetadataBlock[] = [];
    let lastBlock = false;

    while (!lastBlock) {
        const headerByte = view.getUint8(offset++);
        lastBlock = (headerByte & 0x80) !== 0;
        const blockType = headerByte & 0x7f;

        const length =
            (view.getUint8(offset) << 16) |
            (view.getUint8(offset + 1) << 8) |
            view.getUint8(offset + 2);

        offset += 3;

        const blockData = new Uint8Array(arrayBuffer, offset, length);

        blocks.push({
            type: blockType,
            length,
            data: blockData,
        });

        offset += length;
    }

    return blocks;
};

const handleFlacBlob = async (blob) => {
    try {
        const blocks = await parseFlac(await blob.arrayBuffer());

        const typeMap = {
            0: 'STREAMINFO',
            1: 'PADDING',
            2: 'APPLICATION',
            3: 'SEEKTABLE',
            4: 'VORBIS_COMMENT',
            5: 'CUESHEET',
            6: 'PICTURE',
        };

        logger.debug('FLAC blocks:');
        blocks.forEach((b, i) => {
            logger.debug(`${i + 1}. ${typeMap[b.type] || 'UNKNOWN'} (${b.type}) — ${b.length} bytes`);
        });

        return blocks;
    } catch (err) {
        logger.error('Ошибка парсинга FLAC:', err);
    }
};

const buildVorbisComment = (tags) => {
    const encoder = new TextEncoder();

    const vendor = 'custom';
    const vendorBytes = encoder.encode(vendor);

    const comments = Object.entries(tags)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) =>
            encoder.encode(`${key.toUpperCase()}=${value}`)
        );

    let size = 4 + vendorBytes.length + 4;

    comments.forEach((c) => (size += 4 + c.length));

    const buffer = new Uint8Array(size);
    let offset = 0;

    // vendor length
    const dv = new DataView(buffer.buffer);
    dv.setUint32(offset, vendorBytes.length, true);
    offset += 4;

    buffer.set(vendorBytes, offset);
    offset += vendorBytes.length;

    // comment count
    dv.setUint32(offset, comments.length, true);
    offset += 4;

    // comments
    comments.forEach((c) => {
        dv.setUint32(offset, c.length, true);
        offset += 4;

        buffer.set(c, offset);
        offset += c.length;
    });

    return buffer;
};

const buildPicture = (imageBuffer, mime = 'image/jpeg') => {
    const encoder = new TextEncoder();

    const mimeBytes = encoder.encode(mime);
    const descBytes = encoder.encode('');

    const buffer = new Uint8Array(
        4 +
        4 +
        mimeBytes.length +
        4 +
        descBytes.length +
        4 * 4 +
        4 +
        imageBuffer.byteLength,
    );

    const dv = new DataView(buffer.buffer);

    let offset = 0;

    // helper: big-endian writer
    const writeUint32 = (value) => {
        dv.setUint32(offset, value, false); // ❗ big-endian
        offset += 4;
    };

    // type = 3 (front cover)
    writeUint32(3);

    // MIME
    writeUint32(mimeBytes.length);
    buffer.set(mimeBytes, offset);
    offset += mimeBytes.length;

    // description
    writeUint32(descBytes.length);
    buffer.set(descBytes, offset);
    offset += descBytes.length;

    // width / height / color depth / colors
    writeUint32(0); // width (можно попробовать реальные значения)
    writeUint32(0); // height
    writeUint32(0); // color depth
    writeUint32(0); // colors

    // image data
    writeUint32(imageBuffer.byteLength);
    buffer.set(new Uint8Array(imageBuffer), offset);

    return buffer;
};

type FlacBlock = {
    type: number;
    data: Uint8Array;
};

type FlacTags = Record<string, string | number | null | undefined>;

interface FlacMetadata {
    tags?: FlacTags;
    coverFile?: Blob | null;
}

export const writeFlacMetadata = async (
    blob: Blob,
    { tags = {}, coverFile = null }: FlacMetadata
): Promise<Blob> => {
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);

    // Проверка сигнатуры
    const signature =
        String.fromCharCode(view.getUint8(0)) +
        String.fromCharCode(view.getUint8(1)) +
        String.fromCharCode(view.getUint8(2)) +
        String.fromCharCode(view.getUint8(3));

    if (signature !== 'fLaC') {
        throw new Error('Not a FLAC file');
    }

    let offset = 4;

    const blocks: FlacBlock[] = [];
    let lastBlock = false;

    // читаем блоки
    while (!lastBlock) {
        const headerByte = view.getUint8(offset++);
        lastBlock = (headerByte & 0x80) !== 0;
        const blockType = headerByte & 0x7f;

        const length =
            (view.getUint8(offset) << 16) |
            (view.getUint8(offset + 1) << 8) |
            view.getUint8(offset + 2);

        offset += 3;

        const blockData = new Uint8Array(buffer, offset, length);

        blocks.push({ type: blockType, data: blockData });

        offset += length;
    }

    // STREAMINFO обязателен
    const streamInfo = blocks.find((b) => b.type === 0);
    if (!streamInfo) throw new Error('STREAMINFO not found');

    // строим новые metadata блоки
    const newBlocks: FlacBlock[] = [];

    // 1. STREAMINFO
    newBlocks.push({
        type: 0,
        data: streamInfo.data,
    });

    // 2. VORBIS_COMMENT
    if (tags && Object.keys(tags).length > 0) {
        const vorbis = buildVorbisComment(tags);
        newBlocks.push({
            type: 4,
            data: vorbis,
        });
    }

    // 3. PICTURE
    if (coverFile) {
        const coverBuffer = await coverFile.arrayBuffer();

        const picture = buildPicture(
            coverBuffer,
            coverFile.type || 'image/jpeg'
        );

        newBlocks.push({
            type: 6,
            data: picture,
        });
    }

    // AUDIO DATA
    const audioStart = offset;
    const audioData = new Uint8Array(buffer.slice(audioStart));

    // сборка
    const chunks: Uint8Array[] = [];

    // header
    chunks.push(new Uint8Array([0x66, 0x4c, 0x61, 0x43]));

    // metadata blocks
    newBlocks.forEach((block, index) => {
        const isLast = index === newBlocks.length - 1;

        const header = new Uint8Array(4);
        header[0] = (block.type & 0x7f) | (isLast ? 0x80 : 0x00);

        const len = block.data.length;
        header[1] = (len >> 16) & 0xff;
        header[2] = (len >> 8) & 0xff;
        header[3] = len & 0xff;

        chunks.push(header);
        chunks.push(block.data);
    });

    // audio
    chunks.push(audioData);

    // merge
    const totalSize = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalSize);

    let pos = 0;
    for (const c of chunks) {
        result.set(c, pos);
        pos += c.length;
    }

    return new Blob([result], { type: 'audio/flac' });
};

export const downloadFlac = async (song, file, coverFile) => {
    logger.info('Загрузка flac начата', song, file, coverFile);

    const blob = new Blob([file.file_blob], { type: 'audio/flac' });
    handleFlacBlob(blob);
    const cleanBlob = await writeFlacMetadata(blob, {
        tags: {
            TITLE: song.title,
            ARTIST: song.artist,
            ALBUM: song.album,
            DATE: song.release_year,
            TRACKNUMBER: song.track_number,
            GENRE: song.genre
        },
        coverFile: coverFile ? coverFile : null
    });
    handleFlacBlob(cleanBlob);
    downloadBlob(cleanBlob, `${song.artist} - ${song.title}.flac`);
    return;
}
