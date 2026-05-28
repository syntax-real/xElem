import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  HandleLinkIcon,
  HandleUserBlock,
  HandleText,
  HandleUserIcons,
  HandleTimeAge,
  ProfileIcons,
} from "../../../System/Elements/Handlers";
import { I_MEGAPHONE } from "../../../System/UI/IconPack";
import { useTranslation } from "react-i18next";
import { useImageView } from "../../../System/Hooks/useImageView";
import { useWebSocket } from "@/System/Context/WebSocket";
import { useAuth } from "@/System/Hooks/useAuth";
import { Avatar, Block, Cover } from "@/UIKit";
import { useModalsStore } from "@/Store/modalsStore";
import { useClickAway } from "@uidotdev/usehooks";
import HeaderButtons from "./HeaderButtons";
import PlayingNow from "./PlayingNow";

const SubWrapper = ({ users }) => {
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {users.map((user, i) => (
        <HandleUserBlock key={i} user={user} className="UI-Block" />
      ))}
    </div>
  );
};

const Header = ({ profileData, profileLoaded, profileHidden }) => {
  const { t } = useTranslation();
  const { isAuthorized } = useAuth();
  const { openImage } = useImageView();
  const { wsClient } = useWebSocket();
  const { openModal } = useModalsStore();
  const [iconIsFocused, setIconIsFocused] = useState(false);
  const [icon, setIcon] = useState(null);
  const iconDetailsRef = useClickAway(() => {
    setIconIsFocused(false);
  });

  const variants = {
    initial: {
      opacity: 0,
      marginLeft: "-40%",
    },
    animate: {
      opacity: 1,
      marginLeft: 0,
    },
    exit: {
      opacity: 0,
      marginLeft: "-40%",
    },
  };

  const viewSubscribed = () => {
    if (profileData.subscriptions > 0) {
      wsClient
        .send({
          type: "social",
          action: "profile/load_subscriptions",
          payload: {
            username: profileData.username,
          },
        })
        .then((res) => {
          if (res.status === "success") {
            openModal({
              type: "routed",
              props: {
                title: t("subscriptions"),
                children: <SubWrapper users={res.users} />,
              },
            });
          }
        });
    }
  };

  const viewSubscribes = () => {
    if (profileData.subscribers > 0) {
      wsClient
        .send({
          type: "social",
          action: "profile/load_subscribers",
          payload: {
            username: profileData.username,
          },
        })
        .then((res) => {
          if (res.status === "success") {
            openModal({
              type: "routed",
              props: {
                title: t("subscribers"),
                children: <SubWrapper users={res.users} />,
              },
            });
          }
        });
    }
  };

  const viewCover = () => {
    openImage({
      neo_file: profileData.cover,
      metadata: {
        file_name: profileData.cover.file,
      },
    });
  };

  const viewAvatar = () => {
    openImage({
      neo_file: profileData.avatar,
      metadata: {
        file_name: profileData.avatar.file,
      },
    });
  };

  const viewIcon = (iconId) => {
    setIcon(iconId);
    setIconIsFocused(true);
    console.log(iconId);
  };

  return (
    <AnimatePresence>
      {!profileHidden && (
        <motion.div
          className="UI-C_L"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={variants}
        >
          <div className="UI-ScrollView">
            <div className="UI-Block Profile-InfoBlock UI-B_FIRST">
              <Cover
                cover={profileData?.cover}
                style={{
                  opacity: !profileData?.cover ? "0" : "",
                  height: !profileData?.cover ? "80px" : "",
                }}
                onClick={viewCover}
                isLoaded={profileLoaded}
                loading={true}
              />
              <div
                style={{
                  top: !profileData?.cover ? "28px" : "",
                }}
                className="AvatarContainer"
              >
                <Avatar
                  avatar={profileData?.avatar}
                  name={profileData?.name}
                  size={100}
                  onClick={viewAvatar}
                  loading={true}
                  isLoaded={profileLoaded}
                />
                {profileLoaded && profileData?.online && (
                  <div className="UI-Online"></div>
                )}
              </div>

              <div className="UI-NameBody">
                <div className="Name">
                  {profileLoaded ? (
                    profileData.name || t("deleted_account")
                  ) : (
                    <div
                      className="UI-PRELOAD"
                      style={{
                        width: "100px",
                        height: "15px",
                      }}
                    ></div>
                  )}
                </div>
                {profileLoaded &&
                  (profileData.type === "channel" ? (
                    <div className="UI-UserIcons">
                      <I_MEGAPHONE />
                    </div>
                  ) : (
                    <HandleUserIcons
                      icons={profileData.icons}
                      onIconClick={(icon) => {
                        viewIcon(icon);
                      }}
                    />
                  ))}
              </div>
              <div style={{ position: "relative", width: "100%" }}>
                <AnimatePresence>
                  {iconIsFocused && (
                    <motion.div
                      className="UI-Bubble UI-IconDetails"
                      layout
                      initial={{
                        opacity: 0,
                        y: 10,
                        scale: 0.95,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        y: 10,
                        scale: 0.95,
                      }}
                      transition={{
                        duration: 0.2,
                        ease: "easeOut",
                      }}
                      ref={iconDetailsRef}
                    >
                      <div className="Name">{t(ProfileIcons[icon].title)}</div>
                      <div className="Description">
                        {t(ProfileIcons[icon].description)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="Username">
                {profileLoaded ? (
                  "@" + profileData.username
                ) : (
                  <div
                    className="UI-PRELOAD"
                    style={{
                      width: "120px",
                      height: "15px",
                    }}
                  ></div>
                )}
              </div>
              {profileLoaded &&
                !profileData?.online &&
                profileData?.type !== "channel" && (
                  <div className="Status">
                    {profileData?.last_online
                      ? t("last_online") +
                        " " +
                        HandleTimeAge({
                          inputDate: profileData?.last_online,
                        })
                      : t("offline")}
                  </div>
                )}
              {profileLoaded && isAuthorized && (
                <HeaderButtons
                  profileData={profileData}
                  profileLoaded={profileLoaded}
                />
              )}
              <div className="Info">
                {profileLoaded && profileData.type !== "channel" && (
                  <div
                    onClick={viewSubscribed}
                    className="Container"
                    style={{
                      cursor:
                        profileData?.subscriptions > 0 ? "pointer" : "auto",
                    }}
                  >
                    <div className="Value">
                      {profileLoaded ? (
                        profileData.subscriptions
                      ) : (
                        <div
                          className="UI-PRELOAD"
                          style={{
                            width: "40px",
                            height: "15px",
                          }}
                        ></div>
                      )}
                    </div>
                    <div className="Title">
                      {t("profile_subscriptions_count")}
                    </div>
                  </div>
                )}
                <div
                  onClick={viewSubscribes}
                  className="Container"
                  style={{
                    cursor: profileData?.subscribers > 0 ? "pointer" : "auto",
                  }}
                >
                  <div className="Value">
                    {profileLoaded ? (
                      profileData.subscribers
                    ) : (
                      <div
                        className="UI-PRELOAD"
                        style={{
                          width: "40px",
                          height: "15px",
                        }}
                      ></div>
                    )}
                  </div>
                  <div className="Title">{t("profile_subscribers_count")}</div>
                </div>
                <div className="Container">
                  <div className="Value">
                    {profileLoaded ? (
                      profileData.posts
                    ) : (
                      <div
                        className="UI-PRELOAD"
                        style={{
                          width: "40px",
                          height: "15px",
                        }}
                      ></div>
                    )}
                  </div>
                  <div className="Title">{t("profile_posts_count")}</div>
                </div>
              </div>
            </div>
            {profileLoaded && profileData.description && (
              <Block className="UI-Description">
                <div className="Title">{t("description")}</div>
                <div className="Text">
                  <HandleText text={profileData.description} />
                </div>
              </Block>
            )}
            {profileLoaded &&
              profileData?.type !== "channel" &&
              profileData?.listening_song && (
                <PlayingNow song={profileData?.listening_song} />
              )}
            {(profileLoaded && profileData.links && profileData.links.length) >
              0 && (
              <div className="UI-Links">
                {profileData.links.map((link, i) => (
                  <button
                    key={i}
                    onClick={() => window.open(link.link, "_blank")}
                    className="UI-Block Link"
                    style={{ marginBottom: 0 }}
                  >
                    <HandleLinkIcon link={link.link} /> {link.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Header;
