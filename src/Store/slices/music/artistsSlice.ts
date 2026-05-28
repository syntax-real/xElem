import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Artist {
    id: number;
    name: string;
    slug: string;
    avatar_file_id?: number | null;
    verified: boolean;
    owner: number;
    created_at: string;
}

interface ArtistsState {
    currentArtist: Artist | null;
    loading: boolean;
}

const initialState: ArtistsState = {
    currentArtist: null,
    loading: false
};

const artistsSlice = createSlice({
    name: 'artists',
    initialState,
    reducers: {
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },

        setArtist: (state, action: PayloadAction<Artist>) => {
            state.currentArtist = action.payload;
            state.loading = false;
        },

        clearArtist: (state) => {
            state.currentArtist = null;
            state.loading = false;
        }
    }
});

export const {
    setLoading,
    setArtist,
    clearArtist
} = artistsSlice.actions;

export default artistsSlice.reducer;