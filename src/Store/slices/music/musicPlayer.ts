import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Song {
    id: number;
    title: string;
    artists: any[];
    old_cover?: string | null;
    cover?: any;
    original_file: number;
    liked: boolean | null;
    duration: number;
}

interface MusicPlayerState {
    my_library: any;
    songsQueue: Song[];
    currentSongIndex: number;
}

const initialState: MusicPlayerState = {
    my_library: [],
    songsQueue: [],
    currentSongIndex: 0
};

const musicPlayerSlice = createSlice({
    name: 'musicPlayer',
    initialState,
    reducers: {
        setSongQueue: (state, action: PayloadAction<{ id: number }>) => {
            const idx = state.songsQueue.findIndex(song => song.id === action.payload.id);
            if (idx !== -1) {
                state.currentSongIndex = idx;
            }
        },
        setLibrary: (state, action) => {
            state.my_library = action.payload;
        },
        addToQueue: (state, action: PayloadAction<Song[]>) => {
            state.songsQueue = action.payload;
            state.currentSongIndex = 0;
        },
        removePlaylist: (state, action: PayloadAction<any>) => {
            state.my_library = state.my_library.filter((playlist: any) => playlist.id !== action.payload);
        },
        toggleLike: (state, action: PayloadAction<number>) => {
            const songIndex = state.songsQueue.findIndex(
                song => song.id === action.payload
            );

            if (songIndex !== -1) {
                state.songsQueue[songIndex].liked =
                    !state.songsQueue[songIndex].liked;
            }
        },

        setCurrentSongIndex: (state, action: PayloadAction<number>) => {
            const index = action.payload;

            if (index < 0 || index >= state.songsQueue.length) {
                return;
            }

            state.currentSongIndex = index;
        },
        nextSong: (state) => {
            if (state.songsQueue.length === 0) return;

            state.currentSongIndex =
                (state.currentSongIndex + 1) % state.songsQueue.length;
        },
        prevSong: (state) => {
            if (state.songsQueue.length === 0) return;

            state.currentSongIndex =
                state.currentSongIndex === 0
                    ? state.songsQueue.length - 1
                    : state.currentSongIndex - 1;
        },
        clearPlayer: (state) => {
            state.songsQueue = [];
            state.currentSongIndex = 0;
        }
    }
});

export const {
    setSongQueue,
    setLibrary,
    addToQueue,
    removePlaylist,
    toggleLike,
    nextSong,
    prevSong,
    setCurrentSongIndex,
    clearPlayer
} = musicPlayerSlice.actions;
export default musicPlayerSlice.reducer;
