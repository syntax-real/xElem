import { useNavigate } from 'react-router-dom';

const SongArtists = ({ artists }) => {
    const navigate = useNavigate();

    if (!artists) return null;

    const handleClick = (artist) => {
        navigate(`/music/artists/${artist.slug}`);
    };

    return (
        <div className="Music-Artists">
            {artists.map((artist, index) => (
                <span key={artist.id || index}>
                    {artist?.slug ? (
                        <span
                            className="Artist Artist-Link"
                            onClick={() => handleClick(artist)}
                        >
                            {artist.name}
                        </span>
                    ) : (
                        <span className="Artist">
                            {artist.name}
                        </span>
                    )}

                    {index < artists.length - 1 && ', '}
                </span>
            ))}
        </div>
    );
};

export default SongArtists;
