import { playerEngine } from '@/Services/PlayerEngine';
import { useNavigate, useParams } from 'react-router-dom';

export const usePlaySong = () => {
    const navigate = useNavigate();
    const params = useParams();

    return (song, queue, context) => {
        playerEngine.play({
            song,
            queue,
        });

        const songId = song.id;

        if (context.type === 'default') {
            if (Number(params.song_id) !== songId) {
                navigate(`/music/id/${songId}`);
            }
        }

        if (context.type === 'playlist') {
            navigate(`/music/playlist/${context.id}/${songId}`);
        }

        if (context.type === 'artist') {
            navigate(`/music/artists/${context.slug}/${songId}`);
        }
    };
};
