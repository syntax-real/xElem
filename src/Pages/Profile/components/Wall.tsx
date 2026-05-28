import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AddPost from '../../../UIKit/Components/Layout/AddPost';
import PostsComponent from './PostsComponent';

const Wall = ({ profileData, profileLoaded }) => {
    const { t } = useTranslation();
    const [update, setUpdate] = useState(0);

    const onSend = () => {
        setUpdate(prev => prev + 1);
    }

    return (
        <>
            <AddPost
                onSend={onSend}
                inputPlaceholder={t('wall_input')}
                isWall={true}
                wallUsername={profileData?.username}
            />
            <PostsComponent
                profileData={profileData}
                profileLoaded={profileLoaded}
                postsType="wall"
                username={profileData?.username}
                update={update}
            />
        </>
    )
}

export default Wall;