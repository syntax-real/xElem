import { downloadBlob } from '../../System/Elements/Function';
import { createLogger } from '../Logger';

const logger = createLogger('AudioDownloader');

const encodeUTF16 = (str: string): Uint8Array => {
    const buf = new ArrayBuffer(str.length * 2 + 2);
    const view = new DataView(buf);

    // BOM UTF-16BE
    view.setUint16(0, 0xfeff, false);

    for (let i = 0; i < str.length; i++) {
        view.setUint16(2 + i * 2, str.charCodeAt(i), false);
    }

    return new Uint8Array(buf);
};

const textFrame = (id: string, text: string): Uint8Array => {
    const textBytes = encodeUTF16(text);

    const frame = new Uint8Array(10 + 1 + textBytes.length);
    const dv = new DataView(frame.buffer);

    frame.set(new TextEncoder().encode(id), 0);

    dv.setUint32(4, 1 + textBytes.length, false);
    dv.setUint16(8, 0);

    frame[10] = 1; // UTF-16

    frame.set(textBytes, 11);

    return frame;
};

const buildAPIC = async (cover: Blob): Promise<Uint8Array> => {
    const encoder = new TextEncoder();
    const imageBuffer = new Uint8Array(await cover.arrayBuffer());

    const mime = cover.type || 'image/jpeg';
    const mimeBytes = encoder.encode(mime);

    const desc = encoder.encode('');

    const size =
        1 + // encoding
        mimeBytes.length +
        1 + // \0
        1 + // picture type
        desc.length +
        1 + // \0
        imageBuffer.length;

    const frame = new Uint8Array(10 + size);
    const dv = new DataView(frame.buffer);

    frame.set(encoder.encode('APIC'), 0);
    dv.setUint32(4, size, false);
    dv.setUint16(8, 0);

    let offset = 10;

    frame[offset++] = 0;

    frame.set(mimeBytes, offset);
    offset += mimeBytes.length;

    frame[offset++] = 0;

    frame[offset++] = 3; // cover front

    frame.set(desc, offset);
    offset += desc.length;

    frame[offset++] = 0;

    frame.set(imageBuffer, offset);

    return frame;
};

const buildID3Tag = (frames: Uint8Array[]): Uint8Array => {
    const size = frames.reduce((sum, f) => sum + f.length, 0);

    const header = new Uint8Array(10);

    header.set([0x49, 0x44, 0x33], 0); // "ID3"
    header[3] = 3; // version 2.3
    header[4] = 0;
    header[5] = 0;

    // syncsafe size
    header[6] = (size >> 21) & 0x7f;
    header[7] = (size >> 14) & 0x7f;
    header[8] = (size >> 7) & 0x7f;
    header[9] = size & 0x7f;

    const result = new Uint8Array(10 + size);

    result.set(header, 0);

    let offset = 10;
    for (const f of frames) {
        result.set(f, offset);
        offset += f.length;
    }

    return result;
};

const writeMp3Metadata = async (
    blob: Blob,
    { tags = {}, coverFile = null }: any,
): Promise<Blob> => {
    const audioBuffer = new Uint8Array(await blob.arrayBuffer());

    const frames: Uint8Array[] = [];

    if (tags.TITLE) frames.push(textFrame('TIT2', tags.TITLE));
    if (tags.ARTIST) frames.push(textFrame('TPE1', tags.ARTIST));
    if (tags.ALBUM) frames.push(textFrame('TALB', tags.ALBUM));
    if (tags.DATE) frames.push(textFrame('TYER', String(tags.DATE)));
    if (tags.TRACKNUMBER)
        frames.push(textFrame('TRCK', String(tags.TRACKNUMBER)));
    if (tags.GENRE) frames.push(textFrame('TCON', tags.GENRE));

    if (coverFile) {
        frames.push(await buildAPIC(coverFile));
    }

    const id3 = buildID3Tag(frames);

    const result = new Uint8Array(id3.length + audioBuffer.length);

    result.set(id3, 0);
    result.set(audioBuffer, id3.length);

    return new Blob([result], { type: 'audio/mpeg' });
};

export const downloadMp3 = async (song, file, coverFile) => {
    logger.info('Загрузка mp3 начата', song, file, coverFile);

    const blob = new Blob([file.file_blob], { type: 'audio/flac' });
    const cleanBlob = await writeMp3Metadata(blob, {
        tags: {
            TITLE: song.title,
            ARTIST: song.artist,
            ALBUM: song.album,
            DATE: song.release_year,
            GENRE: song.genre,
            TRACKNUMBER: song.track_number
        },
        coverFile: coverFile ? coverFile : null,
    });

    downloadBlob(cleanBlob, `${song.artist} - ${song.title}.mp3`);
    return;
};
