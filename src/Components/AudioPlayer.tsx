import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useDatabase } from "../System/Context/Database.tsx";
import { downloadService } from "../Services/downloadService.ts";
import { browserName, isChromium } from "react-device-detect";
import { createLogger } from "../Utils/Logger.js";
import { useDownloadStore } from "../Store/downloadStore.ts";
import { usePlayerStore } from "../Store/playerStore.ts";
import { useWebSocket } from "@/System/Context/WebSocket.jsx";
import { playerEngine } from "@/Services/PlayerEngine.ts";

const logger = createLogger("AudioPlayer");

const AudioPlayer = () => {
  const { wsClient } = useWebSocket();
  const {
    song,
    playing,
    loop,
    desiredTime,
    volume,
    timeTrigger,
    setPlaying,
    setDuration,
    setDesiredTime,
    setTime,
  } = usePlayerStore();
  const unsubRef = useRef<null | (() => void)>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);

  const songsQueue = useSelector((state: any) => state.musicPlayer.songsQueue);
  const currentSongIndex = useSelector(
    (state: any) => state.musicPlayer.currentSongIndex,
  );
  const db = useDatabase();

  const tryPlay = (fileObject) => {
    logger.info("Пытаемся воспроизвести");
    if (fileObject.is_hash_verified && audioRef.current) {
      logger.info("Файл найден в кэше, используем его");
      audioRef.current.src = URL.createObjectURL(fileObject.file_blob);

      audioRef.current.oncanplay = () => {
        setPlaying(true);
        audioRef.current?.play().catch(() => {});
      };
      return true;
    }
    return false;
  };

  const songInit = async (songData) => {
    logger.info("Инициализация трека", songData);

    if (!songData?.original_file) return;
    const answer: any = await downloadService.startDownload({
      fileId: songData.original_file,
      downloadType: "song",
      downloadContent: songData,
    });
    const isMp3 = answer?.mime === "audio/mpeg";

    logger.info("Загрузка трека завершена", answer);

    if (tryPlay(answer)) return;
    if (!audioRef.current) return;

    if (isMp3 && isChromium) {
      logger.info("Формат mp3, используется Chromium, используем MediaSource");

      const mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;
      audioRef.current.src = URL.createObjectURL(mediaSource);

      mediaSource.addEventListener("sourceopen", async () => {
        if (!mediaSourceRef.current) return;
        mediaSource.duration = songData.duration;
        const mime = answer?.mime || "audio/mpeg";
        const sourceBuffer = mediaSource.addSourceBuffer(mime);
        sourceBufferRef.current = sourceBuffer;

        let offset = 0;
        const chunkSize = 524288;
        let finished = false;

        while (!finished) {
          const chunk = await db.files_chunksV2
            .where("file_id")
            .equals(answer.file_id)
            .and((c) => c.offset === offset)
            .first();

          if (!chunk) {
            await new Promise((res) => setTimeout(res, 50));
            continue;
          }

          const audio = audioRef.current;
          if (audio && offset === 524288) {
            setPlaying(true);
            audio.play().catch(() => {});
          }
          await appendChunk(sourceBuffer, new Uint8Array(chunk.binary).buffer);

          offset += chunkSize;

          if (offset >= answer.size) {
            finished = true;

            if (!sourceBuffer.updating && mediaSource.readyState === "open") {
              mediaSource.endOfStream();
            }
          }
        }
      });
    } else {
      logger.warn("Используется другой браузер", browserName);
      logger.warn("Используется другой формат", answer?.mime);

      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }

      unsubRef.current = useDownloadStore.subscribe(async (state) => {
        const download = state.downloads[`${answer.file_id}:original`];

        if (download?.status === "completed") {
          const file = await downloadService.getFile(
            answer.file_id,
            "original",
          );
          tryPlay(file);

          if (unsubRef.current) {
            unsubRef.current();
            unsubRef.current = null;
          }
        }
      });
    }
  };

  const appendChunk = (sourceBuffer: SourceBuffer, chunk: ArrayBuffer) => {
    return new Promise<void>((resolve, _) => {
      sourceBuffer.addEventListener("updateend", function cb() {
        sourceBuffer.removeEventListener("updateend", cb);
        resolve();
      });
      sourceBuffer.appendBuffer(chunk);
    });
  };

  const resetPlayer = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
  };

  useEffect(() => {
    logger.info("Смена трека, ID:", song.id);
    if (!song?.id) return;

    wsClient.send({
      type: "social",
      action: "account/set_song",
      payload: {
        song_id: song.id,
      },
    });

    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    resetPlayer();
    songInit(song);

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [song.id]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      if (playing)
        audioRef.current.play().catch((e) => {
          console.error(e);
        });
      else audioRef.current.pause();
    }
  }, [playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const duration = audio.duration;

    if (
      desiredTime === null ||
      !isFinite(desiredTime) ||
      desiredTime < 0 ||
      !isFinite(duration) ||
      duration <= 0
    )
      return;

    const safeTime = Math.min(desiredTime, duration - 0.05);

    if (safeTime >= duration - 0.1) {
      return;
    }

    if (audio.readyState < 2) return;

    try {
      audio.currentTime = safeTime;
    } catch (e) {
      console.warn("[seek] blocked", e);
    }
  }, [desiredTime, timeTrigger]);

  useEffect(() => {
    if ("mediaSession" in navigator && song) {
      const artwork =
        song.cover || song.old_cover
          ? [
              {
                src: song.cover || song.old_cover,
                sizes: "512x512",
                type: "image/jpeg",
              },
            ]
          : [];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title || "Неизвестный трек",
        artist:
          song.artists.map((artist) => artist.name).join(", ") ||
          "Неизвестный исполнитель",
        album: song.album || "",
        artwork: artwork,
      });

      navigator.mediaSession.playbackState = playing ? "playing" : "paused";

      navigator.mediaSession.setActionHandler("play", () => setPlaying(true));
      navigator.mediaSession.setActionHandler("pause", () => setPlaying(false));
      navigator.mediaSession.setActionHandler("previoustrack", () =>
        playerEngine.playPrev(),
      );
      navigator.mediaSession.setActionHandler("nexttrack", () =>
        playerEngine.playNext(),
      );
    }
  }, [song, playing]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;

      if (isFinite(currentTime) && currentTime >= 0) {
        setTime(currentTime);
      }

      if (isFinite(duration) && duration > 0) {
        setDuration(duration);
      }
    }
  };

  const handleLoadedMeta = () => {
    if (audioRef.current) {
      const duration = audioRef.current.duration;
      if (duration && !isNaN(duration) && isFinite(duration) && duration > 0) {
        setDuration(duration);
      }
    }
  };

  const handleEnded = () => {
    if (currentSongIndex < songsQueue.length - 1) {
      playerEngine.playNext();
    } else {
      setPlaying(false);
      setTime(0);
      setDesiredTime(null);
    }
  };

  return (
    <audio
      ref={audioRef}
      loop={loop}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMeta}
      onEnded={handleEnded}
      controls={false}
    />
  );
};

export default AudioPlayer;
