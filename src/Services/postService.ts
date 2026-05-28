import { addPosts, appendToCategory, setCategory } from '../Store/slices/posts';
import store from '../Store/store';
import { updateProfileSection } from '../Store/slices/profiles';
import { websocketClient } from './WebSocketClient';

type LoadPostsParams = {
    postsType: string;
    profileType?: number;
    profileId?: string;
    username?: string;
    startIndex: number;
};

class PostService {

    async load({ postsType, profileType, profileId, username, startIndex }: LoadPostsParams) {
        try {
            let payload: any = {
                posts_type: postsType,
                start_index: startIndex
            };

            if (username !== undefined) {
                payload.username = username;
            }

            if (postsType === 'profile') {
                payload.author_type = profileType;
                payload.author_id = profileId;
            }

            const data: any = await websocketClient.send({
                type: 'social',
                action: 'load_posts',
                payload
            });

            const posts = data.posts || [];

            if (postsType === 'last' || postsType === 'rec' || postsType === 'subscribe') {
                if (startIndex === 0) {
                    store.dispatch(setCategory({ category: postsType, posts }));
                } else {
                    store.dispatch(appendToCategory({ category: postsType, posts }));
                }
            } else if (postsType === 'wall' || postsType === 'archive' || postsType === 'trash_bin' || postsType === 'profile') {
                store.dispatch(addPosts(posts));
                store.dispatch(updateProfileSection({
                    type: profileType,
                    id: profileId,
                    section: postsType === 'profile' ? 'posts' : postsType,
                    posts: posts,
                    start_index: startIndex
                }));
            }

            return posts;
        } catch (err) {
            console.error('Ошибка загрузки постов:', err);
            return [];
        }
    }
}

export const postService = new PostService();