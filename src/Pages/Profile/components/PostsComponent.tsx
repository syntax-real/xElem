import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';
import { PreloadPosts } from '../../../System/UI/Preload';
import { postService } from '../../../Services/postService';
import { useSelector } from 'react-redux';
import { makeSelectProfileSectionPosts, selectProfileSectionMeta } from '../../../Store/selectors/profilesSelectors';
import CachedPost from '../../../Components/CachedPost';
import { Ring } from 'ldrs/react';
import { useAuth } from '@/System/Hooks/useAuth';

type PostsComponentProps = {
    profileData: any;
    profileLoaded: boolean;
    postsType: 'posts' | 'wall' | 'archive' | 'trash_bin';
    update?: any | null;
    username?: string;
};

const PostsComponent = ({ profileData, profileLoaded, postsType, update, username }: PostsComponentProps) => {
    const { t } = useTranslation();
    const { accountData } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const sectionMeta = useSelector(state =>
        selectProfileSectionMeta(state, profileData?.username, postsType)
    );

    const selectPosts = useMemo(makeSelectProfileSectionPosts, []);

    const posts = useSelector(state =>
        selectPosts(
            state,
            profileData?.type === 'user' ? 0 : 1,
            profileData?.id,
            postsType
        )
    );

    const { loaded, allLoaded } = sectionMeta || {};

    const { ref: postsEndRef, inView: postsEndIsView } = useInView({
        threshold: 0
    });

    const loadPosts = async (startIndex: number) => {
        if (isLoading || allLoaded) return;

        let payload: any = {
            posts_type: postsType,
            start_index: startIndex
        };

        if (username) {
            payload.username = username;
        }

        const profileType = profileData?.type === 'user' ? 0 : 1;

        await postService.load({
            postsType: postsType === 'posts' ? 'profile' : postsType,
            username: username,
            startIndex: startIndex,
            profileType: profileType,
            profileId: profileData?.id
        });

        setIsLoading(false);
    };

    useEffect(() => {
        if (!profileLoaded) return;
        loadPosts(0);
    }, [update, username, profileLoaded]);

    useEffect(() => {
        if (postsEndIsView && !isLoading && !allLoaded) {
            loadPosts(posts.length);
            setIsLoading(true);
        }
    }, [postsEndIsView, isLoading, allLoaded]);

    return (
        <>
            {accountData && accountData.id ? (
                <>
                    {
                        loaded ? (
                            posts && posts.length > 0 ? (
                                posts.map((post) => (
                                    <CachedPost
                                        key={`PID-${post.id}`}
                                        postId={post.id}
                                    />
                                ))
                            ) : (
                                <div className="UI-ErrorMessage">{t('ups')}</div>
                            )
                        ) : (
                            <PreloadPosts />
                        )
                    }
                </>
            ) : (
                <div className="UI-ErrorMessage">Для просмотра постов нужно иметь аккаунт</div>
            )}
            {
                !isLoading && loaded && posts.length > 0 && !allLoaded && (
                    <span ref={postsEndRef} />
                )
            }
            {
                loaded && isLoading && (
                    <div className="UI-Loading">
                        <Ring
                            size="30"
                            stroke="3"
                            bgOpacity="0"
                            speed="2"
                            color="var(--TEXT_COLOR)"
                        />
                    </div>
                )
            }
        </>
    );
};

export default PostsComponent;