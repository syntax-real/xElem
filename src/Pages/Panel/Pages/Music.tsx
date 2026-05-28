import { useEffect, useState } from "react";
import { useWebSocket } from "@/System/Context/WebSocket";
import {
  I_BACK,
  I_DELETE,
  I_SEND,
  I_SETTINGS,
} from "../../../System/UI/IconPack";
import {
  Block,
  Button,
  ContextMenu,
  LiquidBlock,
  MusicCover,
  Switch,
  TextInput,
} from "@/UIKit";
import { useTranslation } from "react-i18next";
import { Loader } from "@/UIKit/Components/Base/Loader";
import { useModalsStore } from "@/Store/modalsStore";
import clsx from "clsx";

const HandleSong = ({ song, isSelected, onSelect }) => {
  const [inTrash, setInTrash] = useState(song.in_trash);
  const { openModal } = useModalsStore() as any;
  const { t } = useTranslation();
  const { wsClient } = useWebSocket();

  const openUserSettings = () => {
    openModal({
      type: "routed",
      props: {
        title: `Детали`,
        children: <></>,
      },
    });
  };

  const restoreSong = () => {
    wsClient.send({
      type: "social",
      action: "dashboard/music/restore",
      payload: {
        songs_ids: [song.id],
      },
    });
    setInTrash(false);
  };

  const items = [
    {
      icon: <I_SETTINGS />,
      title: t("manage"),
      onClick: openUserSettings,
    },
    ...(inTrash
      ? [
          {
            icon: <I_DELETE />,
            title: t("restore"),
            onClick: restoreSong,
          },
        ]
      : []),
  ];

  const select = (songId) => {
    if (!inTrash) {
      onSelect(songId);
    }
  };

  return (
    <ContextMenu items={items}>
      <Block
        className={clsx("Dashboard-Item", {
          "UI-Selected": isSelected,
          "UI-Deleted": inTrash,
        })}
        onClick={() => select(song.id)}
      >
        <MusicCover cover={song.cover} width={40} />
        <div className="BaseInfo">
          <div className="Title">{song.title}</div>
          <div className="Username">{song.artist}</div>
        </div>
        <div className="LiteInfo">
          <div className="Text">ID: {song.id}</div>
        </div>
        <div className="GovernButtons">
          <button onClick={openUserSettings}>
            <I_SETTINGS />
          </button>
        </div>
      </Block>
    </ContextMenu>
  );
};

const Music = () => {
  const { t } = useTranslation();
  const { wsClient } = useWebSocket();
  const [limit, setLimit] = useState<number>(50);
  const [limitInput, setLimitInput] = useState<string>(String(limit));
  const [searchValue, setSearchValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [songs, setSongs] = useState<any>([]);
  const [songsCount, setSongsCount] = useState<number>(0);
  const [startIndex, setStartIndex] = useState<number>(0);
  const [selectedSongs, setSelectedSongs] = useState<Set<number>>(new Set());
  const [showDeleted, setShowDeleted] = useState<boolean>(false);

  const loadUsers = ({
    startIndex,
    searchValue,
    _showDeleted,
    newLimit = null,
  }: any) => {
    wsClient
      .send({
        type: "social",
        action: "dashboard/music/load",
        payload: {
          limit: newLimit ?? limit,
          start_index: startIndex,
          search_value: searchValue,
          show_deleted: _showDeleted ?? showDeleted,
        },
      })
      .then((res) => {
        if (res.status === "success") {
          setSongs(res.songs);
          setSongsCount(res.songs_count);
          setIsLoading(false);
        }
      });
  };

  const deleteSelected = () => {
    wsClient
      .send({
        type: "social",
        action: "dashboard/music/delete",
        payload: {
          songs_ids: Array.from(selectedSongs),
        },
      })
      .then((res) => {
        if (res.status === "success") {
          setSelectedSongs(new Set());
          loadUsers({ startIndex, searchValue });
        }
      });
  };

  const search = () => {
    loadUsers({ startIndex: 0, searchValue: searchValue });
    setStartIndex(0);
  };

  const next = () => {
    if (startIndex + limit >= songsCount) return;

    const newIndex = startIndex + limit;
    setStartIndex(newIndex);
    loadUsers({ startIndex: newIndex, searchValue });
  };

  const back = () => {
    if (startIndex === 0) return;

    const newIndex = Math.max(0, startIndex - limit);
    setStartIndex(newIndex);
    loadUsers({ startIndex: newIndex, searchValue });
  };

  useEffect(() => {
    loadUsers({ startIndex: 0, searchValue: "" });
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedSongs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSongs.size === songs.length) {
      setSelectedSongs(new Set());
    } else {
      const newSet: any = new Set();
      for (const song of songs) {
        newSet.add(song.id);
      }
      setSelectedSongs(newSet);
    }
  };

  const toggleShowDeleted = () => {
    setShowDeleted(!showDeleted);
    loadUsers({ startIndex, searchValue, _showDeleted: !showDeleted });
  };

  return (
    <>
      <Block
        style={{ display: "flex", flexDirection: "column" }}
        className="UI-B_FIRST"
      >
        <div className="UI-Title">Музыка</div>
        <div className="Dashboard-Search">
          <TextInput
            placeholder="Поиск"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                search();
              }
            }}
          />
          <Button onClick={search} buttonStyle="action">
            <I_SEND />
          </Button>
        </div>
        <div style={{ display: "flex", flexDirection: "row", gap: 10 }}>
          <Button style={{ width: "fit-content" }} onClick={toggleSelectAll}>
            Выбрать все
          </Button>
          <Button
            style={{ width: "fit-content" }}
            onClick={deleteSelected}
            isActive={selectedSongs.size > 0}
          >
            Удалить ({selectedSongs.size})
          </Button>
          <div className="CheckerWithBg">
            Удалённые
            <Switch checked={showDeleted} onChange={toggleShowDeleted} />
          </div>
          <div style={{ display: "flex", flexDirection: "row" }}>
            <TextInput
              placeholder="Лимит"
              value={limitInput}
              onChange={(e: any) => {
                setLimitInput(e.target.value);
              }}
            />
            <Button
              onClick={() => {
                setLimit(Number(limitInput));
                loadUsers({
                  startIndex,
                  searchValue,
                  newLimit: Number(limitInput),
                });
              }}
              buttonStyle="action"
            >
              {t("save")}
            </Button>
          </div>
        </div>
      </Block>
      <div className="Dashboard-Items">
        {isLoading ? (
          <Loader />
        ) : (
          songs.length > 0 &&
          songs.map((song) => (
            <HandleSong
              key={song.id}
              song={song}
              isSelected={selectedSongs.has(song.id)}
              onSelect={toggleSelect}
            />
          ))
        )}
      </div>
      <LiquidBlock className="Dashboard-BottomBar">
        <button
          onClick={back}
          className={clsx("Back", {
            NonActiveButton: startIndex === 0,
          })}
        >
          <I_BACK />
          {t("back")}
        </button>
        <div className="Pages">
          <div style={{ marginRight: 3 }}>{startIndex + limit}</div>
          из
          <div style={{ marginLeft: 3 }}>{songsCount}</div>
        </div>
        <button
          onClick={next}
          className={clsx("Next", {
            NonActiveButton: startIndex + limit >= songsCount,
          })}
        >
          <I_BACK />
          Вперёд
        </button>
      </LiquidBlock>
    </>
  );
};

export default Music;
