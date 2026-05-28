import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDispatch } from "react-redux";
import {
  I_CLOSE,
  I_DISLIKE,
  I_LIKE,
  I_LOOP,
  I_PLAYER_CLOSE,
  I_RANDOM,
  I_SONG_INFO,
  I_VOLUME_MINUS,
  I_VOLUME_PLUS,
} from "../../../System/UI/IconPack.js";
import { toggleLike } from "../../../Store/slices/music/musicPlayer.ts";
import {
  BackButton,
  HandleTime,
  NextButton,
  PlayButton,
} from "../../../System/Elements/MusicPlayer.js";
import clsx from "clsx";
import { useWebSocket } from "../../../System/Context/WebSocket.jsx";
import { useTranslation } from "react-i18next";
import { MusicCover, Slider } from "../../../UIKit/index.tsx";
import { usePlayerStore } from "../../../Store/playerStore.ts";
import SongArtists from "./SongArtists.tsx";
import { useLocation } from "react-router-dom";
import { playerEngine } from "@/Services/PlayerEngine.ts";

const SongMetadata = ({ songData }) => {
  const { t } = useTranslation();

  const HandleSongInfoTitle = (title) => {
    switch (title) {
      case "title":
        return t("music_info_title");
      case "artist":
        return t("music_info_artist");
      case "album":
        return t("music_info_album");
      case "genre":
        return t("music_info_genre");
      case "track_number":
        return t("music_info_track_number");
      case "release_year":
        return t("music_info_release_year");
      case "composer":
        return t("music_info_composer");
      case "duration":
        return t("music_info_duration");
      case "bitrate":
        return t("music_info_bitrate");
      case "audio_format":
        return t("music_info_audio_format");
      case "date_added":
        return t("music_info_date_added");
      default:
        return title;
    }
  };

  const HandleSongBitrate = (bitrate) => {
    return Math.round(bitrate / 1000) + " кбит/сек";
  };

  const HandleSongDuration = (duration) => {
    return <HandleTime time={duration} />;
  };

  const items: any = [];

  for (let key in songData) {
    if (
      songData[key] !== null &&
      !["liked", "id", "file", "cover"].includes(key)
    ) {
      let value;

      switch (key) {
        case "duration":
          value = HandleSongDuration(songData[key]);
          break;
        case "bitrate":
          value = HandleSongBitrate(songData[key]);
          break;
        default:
          value = songData[key];
          break;
      }

      items.push(
        <div key={key} className="Item">
          <div className="InfoTitle">{HandleSongInfoTitle(key)}:</div>
          <div className="Value">{value}</div>
        </div>,
      );
    }
  }

  return items;
};

const FullPlayer = ({ isOpen, close, changeTime }) => {
  const {
    song,
    playing,
    currentTime,
    duration,
    volume,
    random,
    loop,
    setPlaying,
    setLoop,
    setRandom,
    setVolume,
    setLiked,
  } = usePlayerStore();
  const location = useLocation();
  const { wsClient } = useWebSocket();
  const dispatch = useDispatch();
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [metadata, setMetadata] = useState();

  const selectVolume = (newVolume) => {
    setVolume(newVolume);
  };

  const openSongInfo = () => {
    setMetadataOpen(true);
    wsClient
      .send({
        type: "social",
        action: "load_song",
        song_id: song.id,
      })
      .then((res) => {
        if (res.status === "success") {
          setMetadata(res.song);
        }
      });
  };

  const songLike = () => {
    if (song) {
      if (song.liked) {
        wsClient.send({
          type: "social",
          action: "music/fav/remove",
          payload: {
            song_id: song.id,
          },
        });
      } else {
        wsClient.send({
          type: "social",
          action: "music/fav/add",
          payload: {
            song_id: song.id,
          },
        });
      }

      dispatch(toggleLike(song.id));
      setLiked(!song.liked);
    }
  };

  useEffect(() => {
    close();
    setMetadataOpen(false);
    setMetadata(undefined);
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      close();
      setMetadataOpen(false);
      setMetadata(undefined);
    };
  }, []);

  const changeCover = {
    hideTop: { translateY: "-150%", filter: "blur(15px)", opacity: 0 },
    hideBottom: { translateY: "150%", filter: "blur(15px)", opacity: 0 },
    show: {
      translateY: ["-150%", "0%"],
      filter: ["blur(15px)", "blur(0px)"],
      opacity: [0, 1],
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="Music-FullPlayer_BG"
          >
            <MusicCover cover={song.cover} borderRadius={0} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="Music-FullPlayer_BG_Blur"
          ></motion.div>
          <motion.div
            initial={{
              y: 200,
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: 200,
              opacity: 0,
            }}
            className="Music-FullPlayer"
          >
            <button onClick={close} className="CloseButton">
              <I_PLAYER_CLOSE />
            </button>

            <div className="Music-FullPlayer_C">
              {metadataOpen ? (
                <div className="FullInfo">
                  <button
                    className="Close"
                    onClick={() => {
                      setMetadataOpen(false);
                    }}
                  >
                    <I_CLOSE />
                  </button>
                  <div className="List">
                    <SongMetadata songData={metadata} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="Cover-Containers">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={song.id}
                        className="Container"
                        initial="hideTop"
                        animate="show"
                        exit="hideBottom"
                        variants={changeCover}
                        transition={{ duration: 0.2 }}
                      >
                        <MusicCover cover={song.cover} borderRadius={0} />
                      </motion.div>
                    </AnimatePresence>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={song.id}
                        className="Container"
                        initial="show"
                        animate="hideBottom"
                        exit="hideBottom"
                        variants={changeCover}
                        transition={{ duration: 0.2 }}
                      >
                        <MusicCover cover={song?.old_cover} borderRadius={0} />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div className="Controls">
                    <div className="Info">
                      <div className="Metadata">
                        <div className="Name">{song.title}</div>
                        <SongArtists artists={song.artists} />
                      </div>
                      <button onClick={openSongInfo}>
                        <I_SONG_INFO />
                      </button>
                      <button
                        className={clsx(song.liked && "Active")}
                        onClick={songLike}
                      >
                        {song.liked ? <I_DISLIKE /> : <I_LIKE />}
                      </button>
                    </div>
                    <Slider
                      onChange={changeTime}
                      value={currentTime}
                      max={duration}
                      className="DurationSlider"
                    />
                    <div className="Music-Duration">
                      <div>
                        <HandleTime time={currentTime} />
                      </div>
                      <div>
                        <HandleTime time={duration} />
                      </div>
                    </div>
                    <div className="Music-ControlButtons">
                      <button
                        onClick={() => {
                          setRandom(!random);
                        }}
                        className={`Random ${random ? "Active" : ""}`}
                      >
                        <I_RANDOM />
                      </button>
                      <div className="Base">
                        <BackButton onClick={playerEngine.playPrev} />
                        <PlayButton
                          isPlaying={playing}
                          togglePlay={() => {
                            setPlaying(!playing);
                          }}
                        />
                        <NextButton onClick={playerEngine.playNext} />
                      </div>
                      <button
                        onClick={() => {
                          setLoop(!loop);
                        }}
                        className={`Loop ${loop ? "Active" : ""}`}
                      >
                        <I_LOOP />
                      </button>
                    </div>
                    <div className="Volume">
                      <button
                        onClick={() => selectVolume(Math.max(volume - 0.1, 0))}
                        className="UI-VolumeControl__button"
                      >
                        <I_VOLUME_MINUS />
                      </button>
                      <Slider
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={selectVolume}
                      />
                      <button
                        onClick={() => selectVolume(Math.min(volume + 0.1, 1))}
                        className="UI-VolumeControl__button"
                      >
                        <I_VOLUME_PLUS />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FullPlayer;
