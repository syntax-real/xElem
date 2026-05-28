import {
  BackButton,
  HandleTime,
  NextButton,
  PlayButton,
} from "../../System/Elements/MusicPlayer";
import { I_CLOSE } from "../../System/UI/IconPack";
import { motion } from "framer-motion";
import { LiquidBlock, MusicCover, Slider } from "../../UIKit";
import { usePlayerStore } from "../../Store/playerStore";
import SongArtists from "@/Pages/Music/components/SongArtists";
import { playerEngine } from "@/Services/PlayerEngine";

interface MiniPlayerProps {
  setIsMusicPlayerOpen: Function;
  variants: any;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({
  setIsMusicPlayerOpen,
  variants,
}) => {
  const { song, playing, duration, currentTime, setPlaying, setDesiredTime } =
    usePlayerStore();

  const changeTime = (newTime) => {
    setDesiredTime(newTime);
  };

  const togglePlay = () => {
    setPlaying(!playing);
  };

  return (
    <motion.div
      className="HeaderMiniPlayer"
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: [1, 1, 0],
        y: [0, 25, -500],
        transition: {
          duration: 0.8,
          times: [0, 0.3, 1],
        },
      }}
      variants={variants}
    >
      <LiquidBlock className="UI-MusicPlayer UI-Bubble">
        <MusicCover
          cover={song.cover}
          width={50}
          borderRadius={8}
          shadows={false}
        />
        <div className="Metadata">
          <div className="Name">{song.title}</div>
          <SongArtists artists={song.artists} />
          <div className="SliderContainer">
            <div className="Duration">
              <HandleTime time={currentTime} />
            </div>
            <Slider onChange={changeTime} value={currentTime} max={duration} />
            <div className="Duration">
              <HandleTime time={duration} />
            </div>
          </div>
        </div>
        <div className="Music-ControlButtons">
          <BackButton onClick={playerEngine.playPrev} />
          <PlayButton isPlaying={playing} togglePlay={togglePlay} />
          <NextButton onClick={playerEngine.playNext} />
          <button
            className="SwitchButton"
            onClick={() => {
              setIsMusicPlayerOpen(false);
            }}
          >
            <I_CLOSE />
          </button>
        </div>
      </LiquidBlock>
    </motion.div>
  );
};

export default MiniPlayer;
