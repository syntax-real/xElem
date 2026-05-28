import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Post {
    id: string;
    author: {
        username: string;
        name: string;
        avatar: string;
        icons?: any;
        blocked?: boolean;
    };
    content: any;
    likes: number;
    dislikes: number;
    create_date: string;
}

export type CategoryKey = 'last' | 'rec' | 'subscribe';

export interface CategoryState {
    si: number;
    loading: boolean;
    loaded: boolean;
    hasMore: boolean;
    ids: string[];
}

export interface PostsSliceState {
    byId: Record<string, Post>;
    categories: Record<CategoryKey, CategoryState>;
}

const PAGE_SIZE = 25;

const initialCategoryState: CategoryState = {
    si: 0,
    loading: false,
    loaded: false,
    hasMore: true,
    ids: [],
};

const initialState: PostsSliceState = {
    byId: {},
    categories: {
        last: { ...initialCategoryState },
        rec: { ...initialCategoryState },
        subscribe: { ...initialCategoryState },
    },
};

const postsSlice = createSlice({
    name: 'posts',
    initialState,
    reducers: {

        addPosts(state, action: PayloadAction<Post[]>) {
            const posts = action.payload;

            posts.forEach(post => {
                state.byId[post.id] = post;
            });
        },

        updatePost(
            state,
            action: PayloadAction<Partial<Post> & { id: string }>
        ) {
            const { id, ...changes } = action.payload;
            const existing = state.byId[id];
            if (existing) {
                Object.assign(existing, changes);
            }
        },

        setCategory(
            state,
            action: PayloadAction<{
                category: CategoryKey;
                posts: Post[];
            }>
        ) {
            const { category, posts } = action.payload;

            posts.forEach(p => {
                state.byId[p.id] = p;
            });

            const cat = state.categories[category];

            cat.ids = posts.map(p => p.id);
            cat.si = posts.length;
            cat.loaded = true;
            cat.hasMore = posts.length >= PAGE_SIZE;
            cat.loading = false;
        },

        // Догрузка (infinite scroll)
        appendToCategory(
            state,
            action: PayloadAction<{
                category: CategoryKey;
                posts: Post[];
            }>
        ) {
            const { category, posts } = action.payload;

            // Добавляем/обновляем посты
            posts.forEach(p => {
                state.byId[p.id] = p;
            });

            const cat = state.categories[category];

            // Добавляем только новые id, избегаем дублей
            const newIds = posts
                .map(p => p.id)
                .filter(id => !cat.ids.includes(id));

            cat.ids.push(...newIds);
            cat.si += posts.length;                // сдвигаем start index
            cat.hasMore = posts.length >= PAGE_SIZE;
            cat.loading = false;
        },

        removePost(state, action: PayloadAction<string>) {
            const id = action.payload;
            delete state.byId[id];

            Object.values(state.categories).forEach(cat => {
                cat.ids = cat.ids.filter(existingId => existingId !== id);
            });
        }
    },
});

// Селекторы
export const selectPostById = (state: { posts: PostsSliceState }, id: string) =>
    state.posts.byId[id];

export const selectPostsForCategory = (state: { posts: PostsSliceState }, category: CategoryKey) =>
    state.posts.categories[category].ids
        .map(id => state.posts.byId[id])
        .filter((p): p is Post => !!p);

export const selectCategoryMeta = (state: { posts: PostsSliceState }, category: CategoryKey) =>
    state.posts.categories[category];

export const {
    updatePost,
    addPosts,
    setCategory,
    appendToCategory,
    removePost
} = postsSlice.actions;

export default postsSlice.reducer;