import { useWebSocket } from "@/System/Context/WebSocket";
import { Avatar, NavigatedHeader } from "@/UIKit";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Song from "../components/Song";
import { useDispatch, useSelector } from "react-redux";
import { setArtist, setLoading } from "@/Store/slices/music/artistsSlice";
import { Ring } from "ldrs/react";
import { usePlaySong } from "@/System/Hooks/usePlaySong";

const Artist = () => {
  const navigate = useNavigate();
  const playSong = usePlaySong();
  const { t } = useTranslation();
  const { wsClient } = useWebSocket();
  const params = useParams<any>();
  const dispatch = useDispatch();

  const artist = useSelector((state: any) => state.artists.currentArtist);

  const isLoading = useSelector((state: any) => state.artists.loading);

  useEffect(() => {
    dispatch(setLoading(true));

    wsClient
      .send({
        type: "social",
        action: "music/artists/get",
        payload: {
          slug: params.slug,
        },
      })
      .then((res: any) => {
        if (res.status === "success") {
          dispatch(setArtist(res.artist));
        } else {
          dispatch(setLoading(false));
        }
      });
  }, [params.slug]);

  return (
    <div className="UI-B_FIRST">
      <NavigatedHeader
        title={t("artist")}
        isOverlay={false}
        onBack={() => navigate("/music")}
        paddingLeft={0}
      />

      <div className="Header">
        {isLoading ? (
          <div className="Avatar" style={{ width: 200, height: 200 }}>
            <div className="UI-PRELOAD" style={{ transform: "scale(1.2)" }} />
          </div>
        ) : (
          <Avatar avatar={artist?.avatar} name={artist?.name} size={100} />
        )}

        <div className="Title">
          {isLoading ? (
            <div className="UI-PRELOAD" style={{ width: 200, height: 20 }} />
          ) : (
            artist?.name
          )}
        </div>
      </div>

      <div className="Songs">
        {isLoading ? (
          <div style={{ margin: "50px auto" }}>
            <Ring
              size="30"
              stroke="3"
              bgOpacity="0"
              speed="2"
              color="var(--TEXT_COLOR)"
            />
          </div>
        ) : artist?.songs?.length > 0 ? (
          artist?.songs?.map((song: any, i: number) => (
            <Song
              key={song.id ?? i}
              song={song}
              trackNumber={i + 1}
              onClick={() => playSong(song, artist?.songs, {})}
            />
          ))
        ) : (
          <div className="UI-ErrorMessage">{t("ups")}</div>
        )}
      </div>
    </div>
  );
};

export default Artist;
