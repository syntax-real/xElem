import { useEffect, useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { AnimatePresence, motion } from 'framer-motion';
import HandleSong from '../components/HandleSong';
import { PreloadArtists, PreloadSongs } from '../../../System/UI/Preload';
import { I_ARROW_LEFT, I_ARROW_RIGHT, I_LIKE } from '../../../System/UI/IconPack';
import { useTranslation } from 'react-i18next';
import { useWebSocket } from '@/System/Context/WebSocket';
import { AddButton, Avatar } from '@/UIKit';
import { useAuth } from '@/System/Hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setLibrary } from '@/Store/slices/music/musicPlayer';
import { useModalsStore } from '@/Store/modalsStore';
import ArtistManager from '../components/ArtistManager';
import SongManager from '../components/SongManager';
import PlaylistManager from '../components/PlaylistManager';
import { usePlayerStore } from '@/Store/playerStore';

export interface Category {
    title: string;
    type: number;
    get?: string;
    items: any;
    loaded: boolean;
    startIndex: number;
}

interface HandleCategoryProps {
    category: Category;
    loadMore: (category: Category) => void;
    setTransitionSource: any;
}

const HandleCategory: React.FC<HandleCategoryProps> = ({ category, loadMore, setTransitionSource }) => {
    const [isHovered, setIsHovered] = useState<boolean>(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { ref: endSpanRef, inView } = useInView({ threshold: 0 });

    useEffect(() => {
        if (inView) {
            loadMore(category);
        }
    }, [inView]);

    const animations = {
        hide: {
            opacity: 0,
            filter: 'blur(2px)'
        },
        show: {
            opacity: 1,
            filter: 'blur(0px)'
        }
    };

    const scrollLeft = () => {
        scrollRef.current?.scrollTo({
            left: (scrollRef.current?.scrollLeft || 0) - 350,
            behavior: 'smooth'
        });
    };

    const scrollRight = () => {
        scrollRef.current?.scrollTo({
            left: (scrollRef.current?.scrollLeft || 0) + 350,
            behavior: 'smooth'
        });
    };

    return (
        <div
            className="Music-List"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="Title">{category.title}</div>
            <div className="SH_L"></div>
            <div className="SH_R"></div>
            <AnimatePresence>
                {isHovered && (
                    <motion.button
                        onClick={scrollLeft}
                        className="ScrollButton SC-L"
                        initial="hide"
                        animate="show"
                        exit="hide"
                        variants={animations}
                    >
                        <I_ARROW_LEFT />
                    </motion.button>
                )}
            </AnimatePresence>
            <div ref={scrollRef} className="Scroll">
                {category.loaded ? (
                    (Array.isArray(category.items) && category.items.length > 0) && (
                        <>
                            {category.items.map((item) => (
                                <HandleSong
                                    key={item.id}
                                    item={item}
                                    category={category}
                                    setTransitionSource={setTransitionSource}
                                />
                            ))}
                            <span ref={endSpanRef}></span>
                        </>
                    )
                ) : (
                    <PreloadSongs />
                )}
            </div>
            <AnimatePresence>
                {isHovered && (
                    <motion.button
                        onClick={scrollRight}
                        className="ScrollButton SC-R"
                        initial="hide"
                        animate="show"
                        exit="hide"
                        variants={animations}
                    >
                        <I_ARROW_RIGHT />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};

const Artists = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { wsClient } = useWebSocket();

    const [isLoaded, setIsLoaded] = useState(false);
    const [artists, setArtists] = useState<any[]>([]);
    const [isHovered, setIsHovered] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        wsClient
            .send({
                type: 'social',
                action: 'music/get_artists'
            })
            .then((res: any) => {
                if (res.status === 'success') {
                    setArtists(res.artists);
                }
            })
            .finally(() => {
                setIsLoaded(true);
            });
    }, []);

    const animations = {
        hide: {
            opacity: 0,
            filter: 'blur(2px)'
        },
        show: {
            opacity: 1,
            filter: 'blur(0px)'
        }
    };

    const scrollLeft = () => {
        scrollRef.current?.scrollTo({
            left: (scrollRef.current.scrollLeft || 0) - 350,
            behavior: 'smooth'
        });
    };

    const scrollRight = () => {
        scrollRef.current?.scrollTo({
            left: (scrollRef.current.scrollLeft || 0) + 350,
            behavior: 'smooth'
        });
    };

    return (
        <div
            className="Music-List"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="Title">
                {t('artists')}
            </div>

            <div className="SH_L" />
            <div className="SH_R" />

            <AnimatePresence>
                {isHovered && (
                    <motion.button
                        onClick={scrollLeft}
                        className="ScrollButton SC-L"
                        initial="hide"
                        animate="show"
                        exit="hide"
                        variants={animations}
                    >
                        <I_ARROW_LEFT />
                    </motion.button>
                )}
            </AnimatePresence>

            <div ref={scrollRef} className="Scroll">
                {!isLoaded ? (
                    <PreloadArtists />
                ) : (
                    artists.map((item) => (
                        <div onClick={() => navigate(`/music/artists/${item.slug}`)} className="Music-ArtistPrev" key={item.id}>
                            <Avatar
                                avatar={item.avatar}
                                name={item.name}
                                size={90}
                            />

                            <div className="Name">
                                {item.name}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <AnimatePresence>
                {isHovered && (
                    <motion.button
                        onClick={scrollRight}
                        className="ScrollButton SC-R"
                        initial="hide"
                        animate="show"
                        exit="hide"
                        variants={animations}
                    >
                        <I_ARROW_RIGHT />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};

const Main = ({ setTransitionSource }) => {
    const { t } = useTranslation();
    const { wsClient } = useWebSocket();
    const { accountData } = useAuth();
    const { setSong } = usePlayerStore();
    const params = useParams<{ song_id: string }>();
    const playerState = useSelector((state: any) => state.musicPlayer);
    const dispatch = useDispatch();
    const { openModal } = useModalsStore();

    // Категории
    const [categories, setCategories] = useState<Category[]>([
        {
            title: t('music_my'),
            type: 1,
            items: [
                {
                    id: 'fav',
                    type: 1,
                    title: t('music_favorites'),
                    author: {
                        name: accountData.name
                    },
                    cover: null,
                    icon: <I_LIKE />
                },
                ...playerState.my_library
            ],
            loaded: true,
            startIndex: 0
        },
        {
            title: t('music_latest'),
            type: 0,
            get: 'latest',
            items: [],
            loaded: false,
            startIndex: 0
        },
        {
            title: t('music_playlists'),
            type: 0,
            get: 'playlists',
            items: [],
            loaded: false,
            startIndex: 0
        },
        {
            title: t('music_random'),
            type: 0,
            get: 'random',
            items: [],
            loaded: false,
            startIndex: 0
        }
    ]);

    useEffect(() => {
        setCategories(prevCategories =>
            prevCategories.map(cat => {
                if (cat.type !== 1) return cat;

                const favItem = cat.items.find(item => item.id === 'fav');

                const newLibrary = playerState.my_library.filter(item => item.id !== 'fav');

                const newItems = favItem
                    ? [favItem, ...newLibrary]
                    : newLibrary;

                return {
                    ...cat,
                    items: newItems,
                    loaded: true
                };
            })
        );
    }, [playerState.my_library]);

    useEffect(() => {
        wsClient.send({
            type: 'social',
            action: 'music/load_library'
        }).then((res: any) => {
            if (res.status === 'success') {
                dispatch(setLibrary(res.playlists));
            }
        });
        categories.forEach((category) => {
            wsClient.send({
                type: 'social',
                action: 'load_songs',
                songs_type: category.get,
                start_index: 0
            }).then((res: any) => {
                if (res.status === 'success') {
                    setCategories((prevCategories) =>
                        prevCategories.map((cat) =>
                            (cat.get === category.get) && (cat.type !== 3) ? { ...cat, items: res.songs, loaded: true } : cat
                        )
                    );
                }
            })
        });
    }, []);

    const openCreatePlaylist = () => {
        openModal({
            type: 'window',
            props: {
                title: t('add_music_playlist'),
                layoutId: 'music-create_playlist',
                childrenClassName: 'MultiForm',
                children: (
                    <PlaylistManager />
                )
            }
        })
    };

    const openAddForm = () => {
        openModal({
            type: 'window',
            props: {
                title: t('add_music'),
                layoutId: 'music-upload',
                childrenClassName: 'Music-AddFrom_content',
                children: <SongManager />
            }
        })
    };

    const openCreateArtist = () => {
        openModal({
            type: 'window',
            props: {
                title: t('music.add_artist'),
                layoutId: 'music-create_artist',
                childrenClassName: 'MultiForm',
                children: <ArtistManager />
            }
        })
    }

    const loadMore = (category: Category) => {
        wsClient.send({
            type: 'social',
            action: 'load_songs',
            songs_type: category.get,
            start_index: category.startIndex + 25
        }).then((res: any) => {
            if (res.status === 'success') {
                setCategories((prevCategories) =>
                    prevCategories.map((cat) =>
                        cat.get === category.get
                            ? {
                                ...cat,
                                items: [...cat.items, ...res.songs],
                                loaded: true
                            }
                            : cat
                    )
                );
            }
        });
        setCategories((prevCategories) =>
            prevCategories.map((cat) =>
                cat.get === category.get ? { ...cat, startIndex: category.startIndex + 25 } : cat
            )
        );
    };

    useEffect(() => {
        if (params.song_id) {
            wsClient.send({
                type: 'social',
                action: 'load_song',
                song_id: params.song_id
            }).then((res: any) => {
                if (res.status === 'success') {
                    setSong(res.song);
                }
            })
        }
    }, [params.song_id]);

    return (
        <>
            <div className="Music-Add UI-B_FIRST">
                <AddButton
                    title={t('add_music_playlist')}
                    onClick={openCreatePlaylist}
                    layoutId='music-create_playlist'
                />
                <AddButton
                    title={t('add_music')}
                    onClick={openAddForm}
                    layoutId='music-upload'
                />
                <AddButton
                    title={t('music.add_artist')}
                    onClick={openCreateArtist}
                    layoutId='music-create_artist'
                />
            </div>
            <Artists />
            {categories.map((category, i) => (
                <HandleCategory
                    key={i}
                    category={category}
                    loadMore={loadMore}
                    setTransitionSource={setTransitionSource}
                />
            ))}
        </>
    )
}

export default Main;