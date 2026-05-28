import { useAuth } from "@/System/Hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import { HandleTime, PlayButton } from "../../../System/Elements/MusicPlayer";
import { MusicCover, Slider } from "@/UIKit";
import { useDispatch } from "react-redux";
import { addToQueue } from "../../../Store/slices/music/musicPlayer";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { usePlayerStore } from "../../../Store/playerStore";

const UserContentAudio = ({ className, song, canPay = true, count = 0 }) => {
  const {
    song: songData,
    songSelected,
    playing,
    currentTime,
    duration,
    setSong,
    setPlaying,
    setDesiredTime,
  } = usePlayerStore();
  const { accountData } = useAuth();
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const animations = {
    show: {
      opacity: 1,
      marginTop: 5,
      height: "auto",
      transition: {
        duration: 0.1,
      },
    },
    hide: {
      opacity: 0,
      height: 0,
      marginTop: 0,
      transition: {
        duration: 0.1,
      },
    },
  };

  const togglePlay = () => {
    if (songData?.id !== song.id) {
      dispatch(addToQueue([song]));
      setSong(song);
    }
    if (songSelected) {
      setPlaying(!playing);
    }
  };

  const changeTime = (newTime) => {
    setDesiredTime(newTime);
  };

  const plural = (n: number, one: string, few: string, many: string) => {
    const mod100 = n % 100;
    const mod10 = n % 10;
    if (mod100 > 10 && mod100 < 20) return many;
    if (mod10 > 1 && mod10 < 5) return few;
    if (mod10 === 1) return one;
    return many;
  };

  return (
    <div className={clsx("UserContent-Audio", className)}>
      <MusicCover
        cover={song.cover}
        width={50}
        borderRadius={7}
        shadows={false}
      />
      {accountData && accountData.id ? (
        song && song.id ? (
          <>
            <div className="Player">
              <div className="Metadata">
                <div className="Title">{song.title}</div>
                <div className="Artist">{song.artist}</div>
              </div>
              <AnimatePresence>
                {songData.id === song.id && playing && (
                  <motion.div
                    className="SliderContainer"
                    initial="hide"
                    animate="show"
                    exit="hide"
                    variants={animations}
                  >
                    <div className="Time">
                      <HandleTime time={currentTime} />
                    </div>
                    <Slider
                      onChange={changeTime}
                      value={currentTime}
                      max={duration}
                    />
                    <div className="Time">
                      <HandleTime time={duration} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {canPay ? (
              <PlayButton
                isPlaying={songData.id === song.id && playing}
                togglePlay={togglePlay}
              />
            ) : (
              count > 0 && (
                <div className="SongsCount">
                  {count}{" "}
                  {plural(
                    count,
                    t("songs_single"),
                    t("songs_plural_1"),
                    t("songs_plural_2"),
                  )}
                </div>
              )
            )}
          </>
        ) : (
          <div className="Error">Тут что-то было?</div>
        )
      ) : (
        <div className="Error">Создайте аккаунт, чтобы слушать</div>
      )}
    </div>
  );
};

export default UserContentAudio;
