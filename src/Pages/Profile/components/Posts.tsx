import { useTranslation } from 'react-i18next';
import AddPost from '../../../UIKit/Components/Layout/AddPost';
import { useState } from 'react';
import PostsComponent from './PostsComponent';
import { useAuth } from '@/System/Hooks/useAuth';

const Posts = ({ profileData, profileLoaded }) => {
    const { accountData } = useAuth();
    const { t } = useTranslation();
    const [update, setUpdate] = useState(0);

    const onSend = () => {
        setUpdate(prev => prev + 1);
    }

    return (
        <>
            {
                accountData?.id && (accountData.id === profileData?.id) && (
                    <AddPost
                        onSend={onSend}
                        inputPlaceholder={t('post_text_input')}
                    />
                )
            }
            <PostsComponent
                profileData={profileData}
                profileLoaded={profileLoaded}
                postsType="posts"
                update={update}
            />
        </>
    )
}

export default Posts;