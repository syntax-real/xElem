import { useDispatch, useSelector } from 'react-redux';
import BaseConfig from '../../../Configs/Base';
import { useModalsStore } from '@/Store/modalsStore';
import { memo, useMemo, useState } from 'react';
import {
    I_DELETE,
    I_DOTS,
    I_DOWNLOAD,
    I_EDIT,
    I_PLUS,
    I_SHARE,
    I_WARNING,
} from '../../../System/UI/IconPack';
import { removePlaylist } from '../../../Store/slices/music/musicPlayer';
import { useTranslation } from 'react-i18next';
import { useWebSocket } from '@/System/Context/WebSocket';
import { useNavigate } from 'react-router-dom';
import { ContextMenu, GovernButtons, MusicCover } from '@/UIKit';
import ReportModal from '../../../Components/Modals/ReportModal';
import { downloadSong } from '../../../Utils/MusicDownloader';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../../../Store/playerStore';
import PlaylistManager from './PlaylistManager';
import SongManager from './SongManager';
import { usePlaySong } from '@/System/Hooks/usePlaySong';

export interface Song {
    id: number | string;
    title: string;
    artist: string;
    cover?: any;
    file: string;
    liked?: boolean;
    [key: string]: any;
}

interface HandleSongProps {
    item: Song;
    category: any;
    setTransitionSource: any;
}

export interface Category {
    title: string;
    get: string;
    songs: Song[];
    loaded: boolean;
    startIndex: number;
}

const HandleSong: React.FC<HandleSongProps> = ({
    item,
    category,
    setTransitionSource
}) => {
    const playSong = usePlaySong();
    const isActive = usePlayerStore(
        s => s.song.id === item.id
    );
    const setPlaying = usePlayerStore(s => s.setPlaying);
    const { wsClient } = useWebSocket();
    const { openModal } = useModalsStore() as any;
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const myLibrary = useSelector((s: any) => s.musicPlayer.my_library);
    const [contextIsOpen, setContextIsOpen] = useState<boolean>(false);

    const download = async () => {
        downloadSong(item);
    };

    const share = () => {
        if (item.type === 0) {
            navigator.clipboard.writeText(
                `${BaseConfig.domains.base}/music/${item.id}`,
            );
            openModal({
                type: 'alert',
                props: {
                    title: t('success'),
                    message: 'Ссылка на песню скопирована в буфер обмена',
                },
            });
        } else {
            navigator.clipboard.writeText(
                `${BaseConfig.domains.base}/music/playlist/${item.id}`,
            );
            openModal({
                type: 'alert',
                props: {
                    title: t('success'),
                    message: 'Ссылка на плейлист скопирована в буфер обмена',
                },
            });
        }
    };

    const deletePlaylist = () => {
        openModal({
            type: 'query',
            props: {
                title: t('are_you_sure'),
                message: 'После удаления плейлист нельзя восстановить',
                onConfirm: () => {
                    wsClient
                        .send({
                            type: 'social',
                            action: 'music/playlists/delete',
                            payload: {
                                playlist_id: item.id,
                            },
                        })
                        .then((res: any) => {
                            if (res.status === 'success') {
                                dispatch(removePlaylist(item.id));
                            }
                        });
                },
            },
        });
    };

    const editPlaylist = () => {
        openModal({
            type: 'window',
            props: {
                title: t('music_edit_playlist'),
                childrenClassName: 'MultiForm',
                children: (
                    <PlaylistManager
                        isEdit
                        playlist={{
                            id: item.id,
                            name: item.title,
                            description: item.description,
                            privacy: item.privacy,
                            author: item.author,
                            add_date: item.add_date
                        }}
                    />
                )
            }
        })
    }

    const openReportModal = () => {
        openModal({
            type: 'routed',
            props: {
                title: t('report_title'),
                children: (
                    <ReportModal
                        targetType="music"
                        targetId={item.id}
                    />
                ),
            },
        });
    }

    const editSong = () => {
        openModal({
            type: 'window',
            props: {
                title: t('add_music'),
                childrenClassName: 'Music-AddFrom_content',
                children: <SongManager
                    isEdit
                    song={item}
                />
            }
        })
    }

    const contextButtons = useMemo(() => [
        ...(item.type === 0
            ? [
                {
                    icon: <I_PLUS />,
                    title: t('add_to_playlist'),
                    children: myLibrary.map((playlist) => ({
                        icon: <I_PLUS />,
                        title: playlist.title,
                        onClick: () => add(playlist.id),
                    })),
                },
                {
                    icon: <I_DOWNLOAD />,
                    title: t('download'),
                    onClick: download,
                },
                {
                    icon: <I_SHARE />,
                    title: t('share'),
                    onClick: share,
                },
                // {
                //     icon: <I_EDIT />,
                //     title: t('edit'),
                //     onClick: editSong,
                // },
                {
                    icon: <I_WARNING />,
                    title: t('report'),
                    onClick: openReportModal,
                },
            ]
            : [
                {
                    icon: <I_EDIT />,
                    title: t('edit'),
                    onClick: editPlaylist,
                },
                {
                    icon: <I_SHARE />,
                    title: t('share'),
                    onClick: share,
                },
                {
                    icon: <I_DELETE />,
                    title: t('delete'),
                    onClick: deletePlaylist,
                },
            ]),
    ], [item.type, myLibrary, t]);

    const add = (id) => {
        wsClient.send({
            type: 'social',
            action: 'music/playlists/add_song',
            payload: {
                playlist_id: id,
                song_id: item.id,
            },
        });
    };

    const open = () => {
        if (item.type === 0) {
            setPlaying(true);
            playSong(item, category.items, null);
        } else {
            setTransitionSource(category.get);
            navigate(`/music/playlist/${item.id}`);
        }
    };

    return (
        <ContextMenu items={contextButtons} isActive={item.id !== 'fav'}>
            <div className="Music-SongPrev">
                <motion.div layoutId={item.type === 1 ? `music-p-cover:${category.get}:${item.id}` : ''}>
                    <MusicCover
                        cover={item.cover}
                        width={150}
                        borderRadius={10}
                        shadows={isActive}
                        icon={item.type === 1 ? item.icon : null}
                        onClick={open}
                        style={
                            isActive ? { scale: 0.93 } : {}
                        }
                        songFileId={item.original_file}
                    />
                </motion.div>
                <div className="MetaAndButton">
                    <div className="Metadata">
                        <motion.div
                            className="Name"
                            layoutId={item.type === 1 ? `music-p-name:${category.get}:${item.id}` : ''}
                        >
                            {item.title}</motion.div>
                        <div className="Author">
                            {item.type === 0 ? (
                                item.artists.map((artist) => artist.name).join(', ')
                            ) : item?.author?.name}
                        </div>
                    </div>
                    {item.id !== 'fav' && (
                        <>
                            <GovernButtons
                                isOpen={contextIsOpen}
                                setIsOpen={setContextIsOpen}
                                buttons={contextButtons}
                            />
                            <button
                                onClick={() => {
                                    setContextIsOpen(!contextIsOpen);
                                }}
                                className="UI-GovernButton"
                            >
                                <I_DOTS />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </ContextMenu>
    );
};

export default memo(HandleSong, (prev, next) => {
    return (
        prev.item.id === next.item.id &&
        prev.item.title === next.item.title &&
        prev.item.cover === next.item.cover &&
        prev.category === next.category
    );
});
