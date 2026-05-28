import { usePlayerStore } from '../Store/playerStore';
import { addToQueue, setCurrentSongIndex, setSongQueue } from '../Store/slices/music/musicPlayer';
import store from '../Store/store';

class PlayerEngine {
    getNextIndex() {
        const state = store.getState();

        const { songsQueue, currentSongIndex } = state.musicPlayer;
        const { random } = usePlayerStore.getState();

        if (songsQueue.length === 0) return 0;

        if (random) {
            return Math.floor(Math.random() * songsQueue.length);
        }

        return (currentSongIndex + 1) % songsQueue.length;
    };

    getPrevIndex() {
        const state = store.getState();

        const { songsQueue, currentSongIndex } = state.musicPlayer;
        const { random } = usePlayerStore.getState();

        if (songsQueue.length === 0) return 0;

        if (random) {
            return Math.floor(Math.random() * songsQueue.length);
        }

        return currentSongIndex === 0
            ? songsQueue.length - 1
            : currentSongIndex - 1;
    }

    play({ song, queue }) {
        if (queue) {
            store.dispatch(
                addToQueue(
                    queue.map((song) => ({
                        id: song.id,
                        title: song.title,
                        artists: song.artists,
                        cover: song.cover,
                        original_file: song.original_file,
                        liked: song.liked,
                        duration: song.duration,
                    }))
                )
            );
        }

        store.dispatch(setSongQueue({ id: song.id }));
        usePlayerStore.getState().setSong(song);
    }

    playNext = () => {
        const state = store.getState();

        const nextIndex = this.getNextIndex();

        const song = state.musicPlayer.songsQueue[nextIndex];

        store.dispatch(setCurrentSongIndex(nextIndex));

        if (song) {
            usePlayerStore.getState().setSong(song);
        }
    };

    playPrev = () => {
        const { currentTime, setDesiredTime, setTimeTrigger } = usePlayerStore.getState();

        if (currentTime > 5) {
            setDesiredTime(0);
            setTimeTrigger();
            return;
        }

        const state = store.getState();
        const prevIndex = this.getPrevIndex();
        const songPrev = state.musicPlayer.songsQueue[prevIndex];

        store.dispatch(setCurrentSongIndex(prevIndex));

        if (songPrev) {
            usePlayerStore.getState().setSong(songPrev);
            setDesiredTime(0);
        }
    }
}

export const playerEngine = new PlayerEngine();