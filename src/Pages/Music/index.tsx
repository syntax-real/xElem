import { memo, useState } from "react";
import { Route, Routes } from "react-router-dom";
import {
  PlayButton,
  NextButton,
  BackButton,
  HandleTime,
} from "../../System/Elements/MusicPlayer";
import { useDispatch } from "react-redux";
import { hideTopPanel, showTopPanel } from "../../Store/slices/ui.ts";
import FullPlayer from "./components/FullPlayer.tsx";
import { useTranslation } from "react-i18next";
import { LiquidBlock, MusicCover, Slider } from "../../UIKit";
import Main from "./pages/Main.tsx";
import Playlist from "./pages/Playlist.tsx";
import { VolumeControl } from "./components/VolumeControl.tsx";
import "./Music.scss";
import { I_LOOP, I_RANDOM } from "../../System/UI/IconPack.tsx";
import { usePlayerStore } from "../../Store/playerStore.ts";
import { playerEngine } from "../../Services/PlayerEngine.ts";
import clsx from "clsx";
import Artist from "./pages/Artist.tsx";
import SongArtists from "./components/SongArtists.tsx";

const Music: React.FC = memo(() => {
  const {
    song,
    songSelected,
    playing,
    currentTime,
    duration,
    loop,
    random,
    setPlaying,
    setDesiredTime,
    setLoop,
    setRandom,
  } = usePlayerStore();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [playerOpen, setPlayerOpen] = useState<boolean>(false);
  const [transitionSource, setTransitionSource] = useState(null);

  const openPlayer = () => {
    if (songSelected) {
      setPlayerOpen(true);
      dispatch(hideTopPanel());
    }
  };

  const closePlayer = () => {
    setPlayerOpen(false);
    dispatch(showTopPanel());
  };

  const togglePlay = () => {
    if (songSelected) {
      setPlaying(!playing);
    }
  };

  const changeTime = (newTime) => {
    setDesiredTime(newTime);
  };

  return (
    <>
      <div className="UI-ScrollView">
        <Routes>
          <Route
            path="/"
            element={<Main setTransitionSource={setTransitionSource} />}
          />
          <Route
            path="id/:song_id"
            element={<Main setTransitionSource={setTransitionSource} />}
          />
          <Route
            path="playlist/:playlist_id"
            element={<Playlist transitionSource={transitionSource} />}
          />
          <Route
            path="playlist/:playlist_id/:song_id"
            element={<Playlist transitionSource={transitionSource} />}
          />
          <Route path="artists/:slug" element={<Artist />} />
        </Routes>
        <div className="UI-EmailInfo" style={{ marginBottom: "150px" }}>
          {t("music_copyright")} - elemsupport@proton.me
        </div>
      </div>

      {/* Мини-плеер */}
      {songSelected && (
        <>
          <LiquidBlock className="Music-MiniPlayer">
            <div className="UI-MusicPlayer">
              <MusicCover
                cover={song.cover}
                width={50}
                borderRadius={5}
                shadows={false}
                onClick={openPlayer}
              />
              <div className="Metadata">
                <div onClick={openPlayer} className="Name">
                  {song.title}
                </div>
                <SongArtists artists={song.artists} />
                <div className="SliderContainer">
                  <div className="Duration">
                    <HandleTime time={currentTime} />
                  </div>
                  <Slider
                    onChange={changeTime}
                    value={currentTime}
                    max={duration}
                  />
                  <div className="Duration">
                    <HandleTime time={duration} />
                  </div>
                </div>
              </div>
              <div className="Music-ControlButtons">
                <button
                  onClick={() => {
                    setRandom(!random);
                  }}
                  className={clsx("Random", { Active: random })}
                >
                  <I_RANDOM />
                </button>
                <div
                  style={{
                    margin: "0 10px",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <BackButton onClick={playerEngine.playPrev} />
                  <PlayButton isPlaying={playing} togglePlay={togglePlay} />
                  <NextButton onClick={playerEngine.playNext} />
                </div>

                <button
                  onClick={() => {
                    setLoop(!loop);
                  }}
                  className={clsx("Loop", { Active: loop })}
                >
                  <I_LOOP />
                </button>

                <VolumeControl />
              </div>
            </div>
          </LiquidBlock>
        </>
      )}

      {/* Полноценный плеер */}
      <FullPlayer
        isOpen={playerOpen}
        close={closePlayer}
        changeTime={changeTime}
      />
    </>
  );
});

export default Music;
