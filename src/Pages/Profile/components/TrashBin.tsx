import PostsComponent from './PostsComponent';

const TrashBin = ({ profileData, profileLoaded }) => {
    return (
        <PostsComponent
            profileData={profileData}
            profileLoaded={profileLoaded}
            postsType="trash_bin"
        />
    );
};

export default TrashBin;
