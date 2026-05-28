import { websocketClient } from '../../Services/WebSocketClient';
import { db } from '../../System/Context/Database';

export const getCover = async (cover, logger) => {
    if (!cover) return null;

    logger.info('Загрузка обложки начата');

    const coverFile = await db.image_cache.get([cover.path, cover.file]);
    if (coverFile && coverFile.file_blob) {
        logger.info('Загрузка обложки завершена, обложка была найдена в базе данных', coverFile);

        return coverFile.file_blob;
    }

    logger.info('В базе данных обложки не была найдена, начинается загрузка');

    const res = await websocketClient.send({
        type: 'download',
        action: 'image',
        image: {
            path: cover.path,
            file: cover.file
        },
        lossless: true,
    });

    if (res.status === 200) {
        logger.info('Загрузка обложки завершена', res.file);
        return new Blob([res.file.buffer], { type: `image/${res.file.ext}` })
    } else {
        return null;
    }
};
