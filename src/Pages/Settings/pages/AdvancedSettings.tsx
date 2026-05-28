import { useTranslation } from 'react-i18next';
import { Block, Button, DropdownSelect, PartitionName, Switch } from '@/UIKit';
import useSettingsStore from '../../../Store/settingsStore';
import { useWebSocket } from '@/System/Context/WebSocket';
import { useEffect, useRef, useState } from 'react';
import { useModalsStore } from '@/Store/modalsStore';
import styles from './AdvancedSettings.module.scss';
import { HandleFileSize } from '../../../System/Elements/Handlers';
import { useDatabase } from '../../../System/Context/Database';
import { downloadBlob } from '../../../System/Elements/Function';
import { isDesktop } from 'react-device-detect';
import { useAuth } from '@/System/Hooks/useAuth';
import { I_INFO } from '../../../System/UI/IconPack';

const Export = ({ exportItem }) => {
    const { t } = useTranslation();
    const db = useDatabase();
    const { wsClient } = useWebSocket();
    const [progress, setProgress] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const isCancelled = useRef(false);

    const download = async () => {
        if (isLoading) return;

        const cachedFile = await db.files_cache.get(['exports', exportItem.name]);

        if (cachedFile && cachedFile.file_blob && cachedFile.file_blob.size > 0) {
            downloadBlob(cachedFile.file_blob, exportItem.name);
            return;
        }

        setIsLoading(true);
        let offset = 0;
        let isLastChunk = false;

        try {
            while (!isLastChunk && !isCancelled.current) {
                const res = await wsClient.send({
                    type: 'download',
                    action: 'file',
                    payload: {
                        path: 'exports',
                        file: exportItem.name,
                        offset
                    },
                });

                if (isCancelled.current) return;

                if (res.status !== 200) {
                    throw new Error(`Ошибка при скачивании чанка: ${res.status}`);
                }

                const chunkData: Uint8Array = res.buffer;

                await db.files_chunks.put({
                    id: `${exportItem.name}-${offset}`,
                    path: 'posts/files',
                    file: exportItem.name,
                    offset,
                    binary: chunkData
                });

                offset += chunkData.byteLength;
                isLastChunk = res.is_last_chunk;
                setProgress(offset);
            }

            const chunks = await db.files_chunks
                .where('file')
                .equals(exportItem.name)
                .sortBy('offset');
            const buffers = chunks.map(chunk => chunk.binary);

            const blob = new Blob(buffers);
            await db.files_chunks.where('file').equals(exportItem.name).delete();

            await db.files_cache.put({
                path: 'exports',
                file: exportItem.name,
                file_blob: blob
            });

            downloadBlob(blob, exportItem.name);
        } catch (err) {
            console.error('❌ Ошибка при скачивании файла:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.exportContainer}>
            <div className={styles.exportBaseData}>
                <div className={styles.exportName}>
                    {exportItem.name}
                </div>
                <div className={styles.exportSize}>
                    <HandleFileSize bytes={exportItem.size} />
                </div>
            </div>
            <Button
                title={isLoading ? `${t('loading')}... (${Math.round(progress / 1024)} KB)` : t('download')}
                onClick={download}
                isActive={!isLoading}
            />
        </div>
    )
}

const AdvancedSettings = () => {
    const { t } = useTranslation();
    const { wsClient } = useWebSocket();
    const { openModal } = useModalsStore();
    const { accountData, updateAccount } = useAuth();
    const [exports, setExports] = useState([]);
    const [selectedFormat, setSelectedFormat] = useState<number>(0);

    const {
        showOnlineUsers,
        showNewUpdate,
        showDownloads,
        doubleClickLike,
        autoVideoDownload,
        hideProfileAnimation,
        notificationsToast,
        notificationsSound,
        setShowOnlineUsers,
        setShowNewUpdate,
        setShowDownloads,
        setDoubleClickLike,
        setAutoDownload,
        setHideProfileAnimation,
        setNotificationsToast,
        setNotificationsSound
    } = useSettingsStore();


    useEffect(() => {
        wsClient.send({
            type: 'social',
            action: 'account/load_exports'
        }).then((res) => {
            setExports(res.exports);
        })
    }, []);

    const createExport = () => {
        wsClient.send({
            type: 'social',
            action: 'account/create_export'
        }).then((res) => {
            if (res.status === 'error') {
                openModal({
                    type: 'alert',
                    props: {
                        title: t('error'),
                        message: res.message
                    }
                })
                return;
            }
            openModal({
                type: 'alert',
                props: {
                    title: t('success'),
                    message: t('settings.advanced.export_started')
                }
            })
        })
    }

    const formats = [
        {
            title: 'AVIF',
            value: 'avif'
        },
        {
            title: 'JPEG',
            value: 'jpeg'
        },
        {
            title: 'WebP',
            value: 'webp'
        }
    ]

    const changeImagesPreviewFormat = (format) => {
        wsClient.send({
            type: 'social',
            action: 'account/settings/change',
            payload: {
                settings: {
                    images_preview_format: format
                }
            }
        })
        updateAccount({ settings: { images_preview_format: format } });
    }

    useEffect(() => {
        const format = accountData?.settings?.images_preview_format;
        if (!format) return;

        const index = formats.findIndex(f => f.value === format);

        if (index !== -1) {
            setSelectedFormat(index);
        }
    }, [accountData?.settings?.images_preview_format]);

    return (
        <>
            <Block className="Settings-Advanced">
                <div className="UI-Parameter">
                    {t('settings.advanced.show_online_users')}
                    <Switch
                        checked={showOnlineUsers}
                        onChange={(e) => setShowOnlineUsers(e.target.checked)}
                    />
                </div>

                <div className="UI-Parameter">
                    {t('settings.advanced.show_new_update')}
                    <Switch
                        checked={showNewUpdate}
                        onChange={(e) => setShowNewUpdate(e.target.checked)}
                    />
                </div>

                <div className="UI-Parameter">
                    {t('settings.advanced.show_downloads')}
                    <Switch
                        checked={showDownloads}
                        onChange={(e) => setShowDownloads(e.target.checked)}
                    />
                </div>

                <div className="UI-Parameter">
                    {t('settings.advanced.double_click_like')}
                    <Switch
                        checked={doubleClickLike}
                        onChange={(e) => setDoubleClickLike(e.target.checked)}
                    />
                </div>

                <div className="UI-Parameter">
                    {t('settings.advanced.auto_download_video')}
                    <Switch
                        checked={autoVideoDownload}
                        onChange={(e) => setAutoDownload(e.target.checked)}
                    />
                </div>

                <div className="UI-Parameter">
                    {t('settings.advanced.profile_hide_anim')}
                    <Switch
                        checked={hideProfileAnimation}
                        onChange={(e) => setHideProfileAnimation(e.target.checked)}
                    />
                </div>
            </Block>
            <PartitionName
                name={t('image_previews.title')}
            />
            <Block className="Settings-Advanced">
                <div className="UI-Parameter">
                    {t('image_previews.use_previews')}
                    <Switch
                        checked={accountData?.settings?.images_preview_format !== 'original'}
                        onChange={(e) => { changeImagesPreviewFormat(e.target.checked ? 'avif' : 'original') }}
                    />
                </div>
                {
                    accountData?.settings?.images_preview_format !== 'original' && (
                        <>
                            <div className="UI-Parameter">
                                {t('image_previews.select_format')}
                                <DropdownSelect
                                    list={formats}
                                    selected={selectedFormat}
                                    setSelected={(i) => {
                                        changeImagesPreviewFormat(formats[i].value)
                                    }}
                                />
                            </div>
                            <div>
                                {t('image_previews.avif')}
                            </div>
                            <div>
                                {t('image_previews.jpeg')}
                            </div>
                            <div>
                                {t('image_previews.webp')}
                            </div>
                        </>
                    )
                }
            </Block>
            <Block className="UI-InfoBlock">
                <I_INFO />
                {t('image_previews.description')}
            </Block>
            <PartitionName
                name={t('notifications_title')}
            />
            <Block className="Settings-Advanced">
                <div className="UI-Parameter">
                    {t('settings.advanced.notifications_sound')}
                    <Switch
                        checked={notificationsSound}
                        onChange={(e) => setNotificationsSound(e.target.checked)}
                    />
                </div>
                {
                    isDesktop && (
                        <div className="UI-Parameter">
                            {t('settings.advanced.notifications_toast')}
                            <Switch
                                checked={notificationsToast}
                                onChange={(e) => setNotificationsToast(e.target.checked)}
                            />
                        </div>
                    )
                }
            </Block>
            <PartitionName
                name={t('settings.advanced.export')}
            />
            <Block>
                <Button
                    title={t('settings.advanced.create_export')}
                    onClick={createExport}
                    buttonStyle='action'
                />
            </Block>
            <PartitionName
                name={t('settings.advanced.exports')}
            />
            <Block className={styles.exports}>
                {
                    exports && exports.length > 0 ? (
                        exports.map((exportItem: any, i) => (
                            <Export exportItem={exportItem} key={i} />
                        ))
                    ) : (
                        <div className="UI-ErrorMessage">
                            {t('ups')}
                        </div>
                    )
                }
            </Block>
        </>
    );
};

export default AdvancedSettings;
