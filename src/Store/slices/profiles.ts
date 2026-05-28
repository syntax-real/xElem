import { createSlice } from '@reduxjs/toolkit';

type Sections = 'profile' | 'posts' | 'wall' | 'archive' | 'trash_bin';

type SectionMeta = {
    loaded: boolean;
    loading: boolean;
    allLoaded: boolean;
    lastFetched: number;
    start_index: number;
};

type SectionMetaMap = {
    profile: {
        loaded: boolean;
        loading: boolean;
        lastFetched: number;
    };
    posts: SectionMeta;
    wall: SectionMeta;
    archive: SectionMeta;
    trash_bin: SectionMeta;
};

type Meta = {
    [id: string]: Partial<{
        [K in Sections]: SectionMetaMap[K];
    }>;
};

interface TypeState {
    byId: Record<string, any>;
    meta: Meta;
    posts: Record<string, any>;
    wall: Record<string, any>;
    archive: Record<string, any>;
    trash_bin: Record<string, any>;
    allIds: string[];
}

interface State {
    byType: {
        0: TypeState;
        1: TypeState;
    };
    byUsername: Record<string, any>;
}

const initialState: State = {
    byType: {
        0: {
            byId: {},
            meta: {},
            posts: {},
            wall: {},
            archive: {},
            trash_bin: {},
            allIds: []
        },
        1: {
            byId: {},
            meta: {},
            posts: {},
            wall: {},
            archive: {},
            trash_bin: {},
            allIds: []
        }
    },
    byUsername: {}
};

const profilesSlice = createSlice({
    name: 'profiles',
    initialState,
    reducers: {
        setProfile(state, action) {
            const { type, profile } = action.payload;
            const id = profile.id;
            const username = profile.username;

            state.byType[type].byId[id] = profile;

            if (!state.byType[type].meta[id]) {
                state.byType[type].meta[id] = {};
            }

            state.byType[type].meta[id].profile = {
                loaded: true,
                lastFetched: Date.now()
            };

            if (!state.byType[type].allIds.includes(id)) {
                state.byType[type].allIds.push(id);
            }

            if (username) {
                state.byUsername[username] = { id, type };
            }
        },

        updateProfile(state, action) {
            const { type, profile } = action.payload;
            const id = profile.id;
            const username = profile.username;

            if (state.byType[type].byId[id]) {
                const oldUsername = state.byType[type].byId[id].username;

                state.byType[type].byId[id] = {
                    ...state.byType[type].byId[id],
                    ...profile
                };

                if (username && username !== oldUsername) {
                    if (oldUsername) {
                        delete state.byUsername[oldUsername];
                    }
                    state.byUsername[username] = { id, type };
                }
            }
        },

        updateProfileSection(
            state,
            action: {
                payload: {
                    id: any;
                    type: any;
                    section: string;
                    posts: { id: number }[];
                    start_index?: number;
                    replace?: boolean;
                };
            }
        ) {
            const { id, type, section, posts, start_index, replace = false } = action.payload;

            if (!state.byType[type]?.byId[id]) return;

            if (!state.byType[type].meta[id]) state.byType[type].meta[id] = {};
            if (!state.byType[type].meta[id][section]) state.byType[type].meta[id][section] = {};

            const existing: number[] = state.byType[type][section][id] || [];

            const updated = replace
                ? posts.map(p => p.id)
                : [...existing, ...posts.map(p => p.id).filter(pid => !existing.includes(pid))];

            state.byType[type][section][id] = updated;

            state.byType[type].meta[id][section] = {
                loaded: true,
                lastFetched: Date.now(),
                start_index: start_index ?? updated.length,
                allLoaded: !replace && posts.length === 0 ? true : undefined
            };
        },

        setProfileSectionLoaded(state, action) {
            const { id, type, section, value } = action.payload;

            if (!state.byType[type].meta[id]) return;

            state.byType[type].meta[id][section].loaded = value;
        },

        clearProfileSection(state, action) {
            const { id, type, section } = action.payload;

            if (!state.byType[type]?.byId[id]) return;

            delete state.byType[type][section][id];

            if (state.byType[type].meta[id]) {
                delete state.byType[type].meta[id][section];
            }
        },

        updateProfileSubscribed(state, action) {
            const { type, id, subscribed } = action.payload;

            const profile = state.byType[type]?.byId[id];

            if (!profile) return;

            const wasSubscribed = !!profile.subscribed;

            const nextSubscribed =
                subscribed !== undefined
                    ? subscribed
                    : !wasSubscribed;

            profile.subscribed = nextSubscribed;

            if (typeof profile.subscribers !== 'number') {
                profile.subscribers = 0;
            }

            if (wasSubscribed !== nextSubscribed) {
                profile.subscribers += nextSubscribed ? 1 : -1;

                if (profile.subscribers < 0) {
                    profile.subscribers = 0;
                }
            }
        },

        updateProfileMuted(state, action) {
            const { type, id, muted } = action.payload;

            const profile = state.byType[type]?.byId[id];

            if (!profile) return;

            profile.muted = !!muted;
        }
    }
});

export const {
    setProfile,
    updateProfile,
    setProfileSectionLoaded,
    updateProfileSection,
    clearProfileSection,
    updateProfileSubscribed,
    updateProfileMuted
} = profilesSlice.actions;

export default profilesSlice.reducer;