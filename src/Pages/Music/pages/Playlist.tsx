import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '@/System/Context/WebSocket';
import { useTranslation } from 'react-i18next';
import {
    Button,
    MusicCover,
    NavigatedHeader,
} from '@/UIKit';
import {
    I_DISLIKE,
    I_EDIT,
    I_LIKE,
    I_SHARE,
} from '../../../System/UI/IconPack';
import { HandleText } from '../../../System/Elements/Handlers';
import BaseConfig from '../../../Configs/Base';
import { useAuth } from '@/System/Hooks/useAuth';
import { useModalsStore } from '@/Store/modalsStore';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../../../Store/playerStore';
import { PlayButton } from '../../../System/Elements/MusicPlayer';
import PlaylistManager from '../components/PlaylistManager';
import Song from '../components/Song';
import { Ring } from 'ldrs/react';
import { usePlaySong } from '@/System/Hooks/usePlaySong';

const Playlist = ({ transitionSource }: any) => {
    const { t } = useTranslation();
    const { wsClient } = useWebSocket();
    const { accountData } = useAuth();
    const { openModal } = useModalsStore();
    const params = useParams<any>();
    const navigate = useNavigate();
    const playSong = usePlaySong();
    const [playlistData, setPlaylistData] = useState<any>({
        title: t('load'),
        description: t('load'),
        cover: null
    });
    const [songsLoaded, setSongsLoaded] = useState(false);
    const [songs, setSongs] = useState<any>([]);
    const playing = usePlayerStore((state) => state.playing);
    const setPlaying = usePlayerStore((state) => state.setPlaying);
    const playlist = usePlayerStore((state) => state.playlist);
    const setPlaylist = usePlayerStore((state) => state.setPlaylist);

    useEffect(() => {
        if (params.song_id) {
            wsClient
                .send({
                    type: 'social',
                    action: 'load_song',
                    song_id: params.song_id,
                })
                .then((res: any) => {
                    if (res.status === 'success') {
                        playSong(res.song, null, { type: 'playlist', id: params.playlist_id });
                    }
                });
        }
    }, []);

    useEffect(() => {
        if (params.playlist_id === 'fav') {
            wsClient
                .send({
                    type: 'social',
                    action: 'load_songs',
                    songs_type: 'favorites',
                    start_index: 0,
                })
                .then((res: any) => {
                    setPlaylistData({
                        title: t('music_favorites'),
                        description: t('music_favorites_desc'),
                        create_date: accountData.create_date,
                    });
                    if (res.status === 'success') {
                        setSongs(res.songs);
                        setSongsLoaded(true);
                    }
                });
        } else {
            wsClient
                .send({
                    type: 'social',
                    action: 'music/playlists/load',
                    payload: {
                        playlist_id: params.playlist_id,
                    },
                })
                .then((res: any) => {
                    if (res.status === 'success') {
                        setPlaylistData({
                            id: res.playlist_data.id,
                            title: res.playlist_data.title,
                            description: res.playlist_data.description,
                            cover: res.playlist_data.cover,
                            is_my_playlist: res.playlist_data.is_my_playlist,
                            is_liked: res.playlist_data.is_liked,
                            privacy: res.playlist_data.privacy,
                            create_date: accountData.create_date,
                        });
                        setSongs(res.songs);
                        setSongsLoaded(true);
                    } else {
                        navigate('/music');
                    }
                });
        }
    }, [params.playlist_id]);

    const plural = (n: number, one: string, few: string, many: string) => {
        const mod100 = n % 100;
        const mod10 = n % 10;
        if (mod100 > 10 && mod100 < 20) return many;
        if (mod10 > 1 && mod10 < 5) return few;
        if (mod10 === 1) return one;
        return many;
    };

    const formatDuration = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        const parts: string[] = [];

        if (h > 0) {
            parts.push(
                `${h} ${plural(h, t('hours'), t('hours_plural_1'), t('hours_plural_2'))}`,
            );
        }
        if (m > 0) {
            parts.push(
                `${m} ${plural(m, t('minutes'), t('minutes_plural_1'), t('minutes_plural_2'))}`,
            );
        }
        if (h === 0 && m === 0) {
            parts.push(
                `${s} ${plural(s, t('seconds'), t('seconds_plural_1'), t('seconds_plural_2'))}`,
            );
        }

        return parts.join(' ');
    };

    const totalDuration = songs.reduce(
        (sum, song: any) => sum + (Number(song.duration) || 0),
        0,
    );

    const playPlaylist = () => {
        if (playlist !== params.playlist_id) {
            playSong(songs[0], null, { type: 'playlist', id: params.playlist_id });
        }
        setPlaying(!playing);
        if (params.playlist_id) {
            setPlaylist(params.playlist_id);
        }
    }

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
                            id: playlistData.id,
                            name: playlistData.title,
                            description: playlistData.description,
                            privacy: playlistData.privacy,
                        }}
                    />
                )
            }
        })
    }

    const handleAdd = () => {
        wsClient.send({
            type: 'social',
            action: playlistData.is_liked ? 'music/playlists/remove' : 'music/playlists/add',
            payload: {
                playlist_id: params.playlist_id,
            },
        })

        setPlaylistData({
            ...playlistData,
            is_liked: !playlistData.is_liked,
        })
    }

    const share = () => {
        navigator.clipboard.writeText(
            `${BaseConfig.domains.base}/music/playlist/${playlistData.id}`,
        );
        openModal({
            type: 'alert',
            props: {
                title: 'Успешно',
                message: 'Ссылка на плейлист скопирована в буфер обмена',
            },
        });
    }

    return (
        <div className="UI-B_FIRST">
            <NavigatedHeader
                title={t('playlist')}
                isOverlay={false}
                onBack={() => navigate('/music')}
                paddingLeft={0}
            />
            <div>
                <div className="Header">
                    <MusicCover
                        cover={playlistData.cover}
                        width={200}
                        borderRadius={12}
                        shadows={true}
                        layoutId={`music-p-cover:${transitionSource}:${params.playlist_id}`}
                    />
                    <div className="Info">
                        <motion.div
                            className="Title"
                            layoutId={`music-p-name:${transitionSource}:${params.playlist_id}`}
                        >
                            {playlistData.title}
                        </motion.div>
                        <div className="Info">
                            {songs.length} {t('songs')} •{' '}
                            {formatDuration(totalDuration)}
                        </div>
                        <div className="Description">
                            <HandleText text={playlistData.description} />
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        marginBottom: 10,
                        padding: '0 10px',
                        gap: 10
                    }}
                >
                    <Button
                        className="PlaylistPlayButton"
                        buttonStyle="action"
                        isActive={(songs.length > 0)}
                        onClick={playPlaylist}
                    >
                        <PlayButton
                            isPlaying={(playing && playlist === params.playlist_id)}
                            asButton={false}
                        />
                    </Button>
                    {(playlistData?.is_my_playlist === false && params.playlist_id !== 'fav') && (
                        <Button onClick={handleAdd} buttonStyle={!playlistData?.is_liked ? 'action' : 'block'}>
                            <div className="Icon">
                                {
                                    playlistData?.is_liked
                                        ? <I_DISLIKE />
                                        : <I_LIKE />
                                }
                            </div>
                            {playlistData.is_liked ? t('remove') : t('add')}
                        </Button>
                    )}
                    {(playlistData.is_my_playlist === true && (
                        <>
                            <Button onClick={share} buttonStyle="block">
                                <div className="Icon">
                                    <I_SHARE />
                                </div>
                                {t('share')}
                            </Button>
                            <Button onClick={editPlaylist} buttonStyle="block">
                                <div className="Icon">
                                    <I_EDIT />
                                </div>
                                {t('edit')}
                            </Button>
                        </>
                    ))}
                </div>
                <div className="Songs">
                    {songsLoaded ? (
                        songs.length > 0 ? (
                            songs.map((song: any, i) => (
                                <Song
                                    key={i}
                                    song={song}
                                    playlistId={params.playlist_id}
                                    isMyPlaylist={playlistData.is_my_playlist}
                                    trackNumber={i + 1}
                                    onClick={() => playSong(song, songs, { type: 'playlist', id: params.playlist_id })}
                                />
                            ))
                        ) : (
                            <div className="UI-ErrorMessage">{t('ups')}</div>
                        )
                    ) : (
                        <div style={{ margin: '50px auto' }}>
                            <Ring
                                size="30"
                                stroke="3"
                                bgOpacity="0"
                                speed="2"
                                color="var(--TEXT_COLOR)"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Playlist;
