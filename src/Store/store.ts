import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth';
import uiReducer from './slices/ui';
import postsReducer from './slices/posts';
import profilesReducer from './slices/profiles';
import artistReducer from './slices/music/artistsSlice';
import musicPlayerReducer from './slices/music/musicPlayer';
import imageViewReducer from './slices/imageView';
import messengerReducer from './slices/messenger';
import notificationsReducer from './slices/notifications';

const store = configureStore({
    reducer: {
        auth: authReducer,
        ui: uiReducer,
        posts: postsReducer,
        profiles: profilesReducer,
        musicPlayer: musicPlayerReducer,
        artists: artistReducer,
        imageView: imageViewReducer,
        messenger: messengerReducer,
        notifications: notificationsReducer
    },
});

export default store;