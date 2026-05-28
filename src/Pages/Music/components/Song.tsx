import BaseConfig from "@/Configs/Base";
import { useModalsStore } from "@/Store/modalsStore";
import { usePlayerStore } from "@/Store/playerStore";
import { useWebSocket } from "@/System/Context/WebSocket";
import { HandleTimeAge } from "@/System/Elements/Handlers";
import {
  I_CLOSE,
  I_DISLIKE,
  I_DOTS,
  I_DOWNLOAD,
  I_LIKE,
  I_PLUS,
  I_SHARE,
} from "@/System/UI/IconPack";
import { ContextMenu, GovernButtons, MusicCover } from "@/UIKit";
import { downloadSong } from "@/Utils/MusicDownloader";
import { useTranslation } from "react-i18next";
import { memo, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import clsx from "clsx";

interface SongProps {
  song: any;
  playlistId?: any;
  isMyPlaylist?: boolean;
  trackNumber: number;
  onClick?: () => void;
}

const Song = memo(
  ({
    song,
    playlistId = null,
    isMyPlaylist = false,
    trackNumber,
    onClick,
  }: SongProps) => {
    const selectedSongId = usePlayerStore((s) => s.song?.id);
    const { wsClient } = useWebSocket();
    const { t } = useTranslation();
    const { openModal } = useModalsStore() as any;
    const [contextIsOpen, setContextIsOpen] = useState<boolean>(false);
    const [liked, setLiked] = useState<boolean>(song.liked);
    const myLibrary = useSelector((s: any) => s.musicPlayer.my_library);

    const download = () => {
      downloadSong(song);
    };

    const share = () => {
      navigator.clipboard.writeText(
        `${BaseConfig.domains.base}/music/${song.id}`,
      );
      openModal({
        type: "alert",
        props: {
          title: "Успешно",
          message: "Ссылка на песню скопирована в буфер обмена",
        },
      });
    };

    const add = (id) => {
      wsClient.send({
        type: "social",
        action: "music/playlists/add_song",
        payload: {
          playlist_id: id,
          song_id: song.id,
        },
      });
    };

    const remove = () => {
      if (playlistId === "fav") {
        wsClient.send({
          type: "social",
          action: "music/like",
          song_id: song.id,
        });
      } else {
        wsClient.send({
          type: "social",
          action: "music/playlists/remove_song",
          payload: {
            playlist_id: playlistId,
            song_id: song.id,
          },
        });
      }
    };

    const contextButtons = useMemo(() => {
      const buttons: any = [];

      if (isMyPlaylist || playlistId === "fav") {
        buttons.push({
          icon: <I_CLOSE />,
          title: t("remove_from_playlist"),
          color: "red",
          onClick: remove,
        });
      }

      buttons.push(
        {
          icon: <I_PLUS />,
          title: t("add_to_playlist"),
          children: myLibrary.map((pl) => ({
            icon: <I_PLUS />,
            title: pl.title,
            onClick: () => add(pl.id),
          })),
        },
        {
          icon: <I_DOWNLOAD />,
          title: t("download"),
          onClick: download,
        },
        {
          icon: <I_SHARE />,
          title: t("share"),
          onClick: share,
        },
      );

      return buttons;
    }, [myLibrary, t, playlistId]);

    const formatTime = (timeString) => {
      const totalSeconds = Math.floor(timeString);

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const pad = (n) => n.toString().padStart(2, "0");

      if (hours > 0) {
        return `${hours}:${pad(minutes)}:${pad(seconds)}`;
      } else {
        return `${minutes}:${pad(seconds)}`;
      }
    };

    const handleLike = () => {
      setLiked(!liked);
      if (liked) {
        wsClient.send({
          type: "social",
          action: "music/fav/remove",
          payload: {
            song_id: song.id,
          },
        });
        return;
      }
      wsClient.send({
        type: "social",
        action: "music/fav/add",
        payload: {
          song_id: song.id,
        },
      });
    };

    return (
      <ContextMenu items={contextButtons}>
        <div
          className={clsx("Song", {
            "UI-Selected": selectedSongId === song.id,
          })}
        >
          <button className="UI-ButtonSpace" onClick={onClick} />
          <div className="Number">{trackNumber}</div>
          <MusicCover
            cover={song.cover}
            width={45}
            shadows={false}
            songFileId={song.original_file}
          />
          <div className="Info">
            <div className="Base">
              <div className="Title">{song.title}</div>
              <div className="Author">
                {song.artists.map((artist) => artist.name).join(", ")}
              </div>
            </div>
            <div className="DateAndDuration">
              <HandleTimeAge inputDate={song.date_added} /> •{" "}
              {formatTime(song.duration)}
            </div>
          </div>
          <button onClick={handleLike} className="Like">
            {liked ? <I_DISLIKE /> : <I_LIKE />}
          </button>
          <GovernButtons isOpen={contextIsOpen} buttons={contextButtons} />
          <button
            onClick={() => {
              setContextIsOpen(!contextIsOpen);
            }}
            className="UI-GovernButton"
          >
            <I_DOTS />
          </button>
        </div>
      </ContextMenu>
    );
  },
);

export default Song;
