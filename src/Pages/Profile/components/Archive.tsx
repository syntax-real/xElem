import PostsComponent from './PostsComponent';

const Archive = ({ profileData, profileLoaded }) => {
    return (
        <PostsComponent
            profileData={profileData}
            profileLoaded={profileLoaded}
            postsType="archive"
        />
    )
};

export default Archive;
