import { NavButton } from '@/Components/Navigate';
import { MusicCover } from '@/UIKit';

const PlayingNow = ({ song }) => {
    return (
        <NavButton to={`/music/id/${song.id}`} className="UI-Block UI-ListElement" style={{ width: '100%' }}>
            <MusicCover
                cover={song.cover}
                width={40}
                borderRadius={8}
                shadows={false}
            />
            <div className="Body">
                <div className="Title">{song.title}</div>
                <div className="Desc">{song.artist}</div>
            </div>
            <div className="PlayingNow">
                Сейчас слушает
            </div>
        </NavButton>
    );
};

export default PlayingNow;
