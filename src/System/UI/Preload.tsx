import clsx from "clsx";

const User = () => {
  return (
    <div className="User">
      <div className="Avatar" style={{ width: 40, height: 40 }}>
        <div className="UI-PRELOAD"></div>
      </div>
      <div className="Name">
        <div className="UI-PRELOAD"></div>
      </div>
    </div>
  );
};

// Авторизация
export const PreloadLastUsers = () => {
  return (
    <>
      <User />
      <User />
      <User />
      <User />
      <User />
    </>
  );
};

// Посты
export const PreloadPost = ({ className }: { className?: string | null }) => (
  <div className={clsx("UI-Block Post", className)}>
    <div className="TopBar">
      <div className="Info">
        <div className="Avatar" style={{ width: 40, height: 40 }}>
          <div className="UI-PRELOAD"></div>
        </div>
        <div className="InfoBody">
          <div className="UI-NameBody">
            <div className="Name">
              <div className="UI-PRELOAD"></div>
            </div>
          </div>
          <div className="Date">
            {" "}
            <div className="UI-PRELOAD"></div>
          </div>
        </div>
      </div>
    </div>
    <div style={{ margin: "10px 0px" }}>
      <div className="Text" style={{ width: "100%" }}>
        <div className="UI-PRELOAD" />
      </div>
    </div>
    <div className="InteractionContainer">
      <div className="InteractionScroll">
        <div className="InteractionButtons">
          <button
            className="InteractionButton Like"
            style={{ width: "60px", padding: "0px" }}
          >
            <div className="UI-PRELOAD" />
          </button>
          <button
            className="InteractionButton Dislike"
            style={{ width: "60px", padding: "0px" }}
          >
            <div className="UI-PRELOAD" />
          </button>
          <button
            className="InteractionButton"
            style={{ width: "60px", padding: "0px" }}
          >
            <div className="UI-PRELOAD" />
          </button>
        </div>
      </div>
    </div>
  </div>
);
export const PreloadPosts = () => {
  return (
    <>
      <PreloadPost />
      <PreloadPost />
      <PreloadPost />
      <PreloadPost />
    </>
  );
};

// Треки
const PreloadSong = () => {
  return (
    <div className="Music-SongPrev">
      <div className="UI-MusicCover">
        <div className="UI-PRELOAD"></div>
      </div>
      <div className="Metadata">
        <div className="Name">
          <div className="UI-PRELOAD"></div>
        </div>
        <div className="Author">
          <div className="UI-PRELOAD"></div>
        </div>
      </div>
    </div>
  );
};

const PreloadArtist = () => {
  return (
    <div className="Music-ArtistPrev">
      <div className="Avatar" style={{ width: 90, height: 90 }}>
        <div className="UI-PRELOAD"></div>
      </div>
      <div className="Name">
        <div
          style={{
            width: "85%",
            height: 10,
            marginLeft: "auto",
            marginRight: "auto",
          }}
          className="UI-PRELOAD"
        ></div>
      </div>
    </div>
  );
};

export const PreloadArtists = () => {
  return (
    <>
      <PreloadArtist />
      <PreloadArtist />
      <PreloadArtist />
      <PreloadArtist />
      <PreloadArtist />
      <PreloadArtist />
    </>
  );
};

export const PreloadSongs = () => {
  return (
    <>
      <PreloadSong />
      <PreloadSong />
      <PreloadSong />
      <PreloadSong />
      <PreloadSong />
      <PreloadSong />
    </>
  );
};

// Чаты

const PreloadChat = () => {
  return (
    <button className="Chats-User">
      <div className="Avatar">
        <div className="UI-PRELOAD"></div>
      </div>
      <div className="Chats-Data">
        <div className="Chats-Name">
          <div className="UI-PRELOAD"></div>
        </div>
        <div className="Chats-LastMessage">
          <div className="UI-PRELOAD"></div>
        </div>
      </div>
    </button>
  );
};
export const PreloadChats = () => {
  return (
    <>
      <PreloadChat />
      <PreloadChat />
      <PreloadChat />
      <PreloadChat />
      <PreloadChat />
      <PreloadChat />
      <PreloadChat />
      <PreloadChat />
      <PreloadChat />
      <PreloadChat />
      <PreloadChat />
      <PreloadChat />
      <PreloadChat />
      <PreloadChat />
      <PreloadChat />
      <PreloadChat />
    </>
  );
};

export const PreloadMessages = () => {
  return (
    <>
      <div className="Chat-M_URS" style={{ overflow: "hidden" }}>
        <div className="Text">Здравствуйте</div>
        <div className="UI-PRELOAD"></div>
      </div>
      <div className="Chat-M_Me" style={{ overflow: "hidden" }}>
        <div className="Text">Привет!</div>
        <div className="UI-PRELOAD"></div>
      </div>
      <div className="Chat-M_URS" style={{ overflow: "hidden" }}>
        <div className="Text">
          Сегодня такой хороший день, чтобы подарить цветов!
        </div>
        <div className="UI-PRELOAD"></div>
      </div>
      <div className="Chat-M_Me" style={{ overflow: "hidden" }}>
        <div className="Text">Правда.</div>
        <div className="UI-PRELOAD"></div>
      </div>
      <div className="Chat-M_URS" style={{ overflow: "hidden" }}>
        <div className="Text">Да ну..</div>
        <div className="UI-PRELOAD"></div>
      </div>
      <div className="Chat-M_Me" style={{ overflow: "hidden" }}>
        <div className="Text">Ходят слухи что Телеграм уже не безопасен</div>
        <div className="UI-PRELOAD"></div>
      </div>
      <div className="Chat-M_URS" style={{ overflow: "hidden" }}>
        <div className="Text">Да ну, бред!</div>
        <div className="UI-PRELOAD"></div>
      </div>
      <div className="Chat-M_Me" style={{ overflow: "hidden" }}>
        <div className="Text">Может, всё возможно</div>
        <div className="UI-PRELOAD"></div>
      </div>
      <div className="Chat-M_URS" style={{ overflow: "hidden" }}>
        <div className="Text">А ты случаем не знаешь, в Токио уже утр?</div>
        <div className="UI-PRELOAD"></div>
      </div>
      <div className="Chat-M_Me" style={{ overflow: "hidden" }}>
        <div className="Text">Бля, откуда мне знать такое</div>
        <div className="UI-PRELOAD"></div>
      </div>
      <div className="Chat-M_URS" style={{ overflow: "hidden" }}>
        <div className="Text">
          Я кстати устроился работать дизайнером, теперь живу в Москве
        </div>
        <div className="UI-PRELOAD"></div>
      </div>
      <div className="Chat-M_Me" style={{ overflow: "hidden" }}>
        <div className="Text">Вау! это просто отлично</div>
        <div className="UI-PRELOAD"></div>
      </div>
    </>
  );
};
