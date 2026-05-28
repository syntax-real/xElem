import { useSelector } from 'react-redux';
import Post from './Post';
import { selectPostById } from '../Store/slices/posts';

const CachedPost = ({ postId, isInModal }: { postId: string; isInModal?: boolean }) => {
    const post = useSelector((state) => selectPostById(state, postId));

    if (!post) return null;

    return <Post post={post} isInModal={isInModal} />;
};

export default CachedPost;