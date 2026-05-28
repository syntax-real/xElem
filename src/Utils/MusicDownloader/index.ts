import { useModalsStore } from '../../Store/modalsStore';
import { db } from '../../System/Context/Database';
import { createLogger } from '../Logger';
import { downloadFlac } from './Flac';
import { getCover } from './getCover';
import { downloadMp3 } from './Mp3';

const logger = createLogger('AudioDownloader');

export const downloadSong = async (song) => {
    const { openModal } = useModalsStore.getState();
    logger.info('Загрузка песни начата', song);

    const file = await db.file_cacheV2
        .where('file_id')
        .equals(song.original_file)
        .first();
    const coverFile = await getCover(song.cover, logger);

    if (!file) {
        openModal({
            type: 'alert',
            props: {
                title: 'Ошибка',
                message: 'Файл не найден в кэше, для начала загрузите его, это можно сделать прослушав его один раз.'
            }
        });
        return;
    }

    const handleError = () => {
        openModal({
            type: 'alert',
            props: {
                title: 'Ошибка',
                message: 'Пока что можно скачать только flac/mp3 файлы'
            }
        });
    }

    switch (file?.mime) {
        case 'audio/flac':
            downloadFlac(song, file, coverFile);
            break;
        case 'audio/mpeg':
            downloadMp3(song, file, coverFile)
            break;
        default:
            handleError();
            break;
    }
};
