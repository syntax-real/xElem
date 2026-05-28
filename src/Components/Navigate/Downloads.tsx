import { useTranslation } from 'react-i18next';
import { useDownloadStore } from '../../Store/downloadStore';
import { I_CLOSE } from '../../System/UI/IconPack';
import { motion } from 'framer-motion';
import { BlurHash, MusicCover, Slider } from '../../UIKit';
import { HandleFileSize } from '../../System/Elements/Handlers';
import { useClickAway } from '@uidotdev/usehooks';
import { useEffect } from 'react';

const DownloadProgress = ({ file }) => {
    const progress = file.size ? (file.downloaded / file.size) * 100 : 0;

    return (
        <div className="DownloadProgress">
            {
                file.status !== 'completed' && (
                    <Slider
                        value={progress}
                        min={0}
                        max={100}
                        draggable={false}
                    />
                )
            }
            <HandleFileSize bytes={file.downloaded} />
            {' / '}
            <HandleFileSize bytes={file.size} />
        </div>
    );
}

const HandleMusic = ({ file }) => {
    return (
        <button className="UI-ListElement">
            <MusicCover
                cover={file.downloadContent.cover}
                width={40}
                borderRadius={8}
                shadows={false}
            />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div className="Body">
                    <div className="Title">{file.downloadContent.title}</div>
                    <div className="Desc">{file.downloadContent.artist}</div>
                </div>
                <DownloadProgress file={file} />
            </div>
        </button>
    )
}

const HandleImage = ({ file }) => {
    useEffect(() => {
        console.log('Скачивается', file);
    }, [])
    return (
        <button className="UI-ListElement">
            <div className="BlurHash">
                <BlurHash image={file.downloadContent} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div className="Body">
                    <div className="Title">Изображение, {file?.variant}</div>
                </div>
                <DownloadProgress file={file} />
            </div>
        </button>
    )
}

const Downloads = ({ setIsDownloadsOpen, variants }) => {
    const { t } = useTranslation();
    const { downloads } = useDownloadStore();
    const ref = useClickAway(() => {
        setIsDownloadsOpen(false);
    }) as React.RefObject<HTMLDivElement> | any;

    return (
        <motion.div
            className="UI-LG_Block Downloads"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={variants}
            ref={ref}
        >
            <div className="Header">
                <div className="Title">{t('downloads')}</div>
                <button className="Close" onClick={() => setIsDownloadsOpen(false)}>
                    <I_CLOSE />
                </button>
            </div>
            <div className="UI-ScrollView">
                <div className="Results">
                    {
                        Object.values(downloads)
                            .sort((a, b) => b.downloadDate - a.downloadDate)
                            .map((file) => {
                                if (file.downloadType === 'song') {
                                    return <HandleMusic key={file.id} file={file} />;
                                }

                                if (file.downloadType === 'image') {
                                    return <HandleImage key={file.id} file={file} />;
                                }

                                return null;
                            })
                    }
                </div>
            </div>
        </motion.div>
    );
};

export default Downloads;
