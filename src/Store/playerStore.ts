import { create } from 'zustand';

interface Song {
    id: number;
    title: string;
    artists: any[];
    album?: string;
    old_cover?: any | null;
    cover?: any;
    original_file: number;
    liked: boolean | null;
    duration: number;
}

interface PlayerState {
    song: Song;
    playlist: string;
    playing: boolean;

    currentTime: number;
    duration: number;
    desiredTime: number | null;

    volume: number;

    random: boolean;
    loop: boolean;

    songSelected: boolean;
    timeTrigger: boolean;

    setSong: (song: Song, selected?: boolean) => void;
    setPlaylist: (playlist: string) => void;
    setPlaying: (playing: boolean) => void;
    setTime: (time: number) => void;
    setDuration: (duration: number) => void;
    setDesiredTime: (time: number | null) => void;
    setVolume: (volume: number) => void;
    setRandom: (random: boolean) => void;
    setLoop: (loop: boolean) => void;
    setLiked: (liked: boolean) => void;
    setTimeTrigger: () => void;

    clear: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
    song: {
        id: 0,
        title: 'Пусто',
        artists: [],
        old_cover: null,
        cover: null,
        original_file: 0,
        liked: false,
        duration: 0
    },
    playlist: '0',
    playing: false,

    currentTime: 0,
    duration: 0,
    desiredTime: null,

    volume: 1,

    random: false,
    loop: false,

    songSelected: false,
    timeTrigger: false,

    setSong: (song, selected = true) =>
        set({
            song: {
                ...song,
                old_cover: song.cover
            },
            songSelected: selected,
            currentTime: 0,
            desiredTime: 0
        }),
    setPlaylist: (playlist) => set({ playlist }),
    setPlaying: (playing) => set({ playing }),
    setDuration: (duration: number) => set({ duration }),
    setTime: (currentTime) => set({ currentTime }),
    setDesiredTime: (desiredTime) => set({ desiredTime }),
    setVolume: (volume: number) => set({ volume }),
    setRandom: (random: boolean) => set({ random }),
    setLoop: (loop: boolean) => set({ loop }),
    setLiked: (liked: boolean) =>
        set((state) => ({
            song: {
                ...state.song,
                liked
            }
        })),
    setTimeTrigger: () =>
        set((state) => ({
            timeTrigger: !state.timeTrigger
        })),
    clear: () =>
        set({
            song: {
                id: 0,
                title: 'Пусто',
                artists: [],
                old_cover: null,
                cover: null,
                original_file: 0,
                liked: false,
                duration: 0
            },
            playing: false,
            currentTime: 0,
            duration: 0,
            desiredTime: null,
            songSelected: false
        })
}));