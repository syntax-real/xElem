import { useAuth } from "@/System/Hooks/useAuth";
import { I_BLOCK, I_EDIT, I_GIFT, I_WARNING } from "@/System/UI/IconPack";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useModalsStore } from "@/Store/modalsStore";
import { useWebSocket } from "@/System/Context/WebSocket";
import ReportModal from "@/Components/Modals/ReportModal";
import ChannelManager from "@/Components/Modals/ChannelManager";
import SendGift from "../modals/SendGift";
import { Button, GovernButtons } from "@/UIKit";
import {
  LuCirclePlus,
  LuCircleMinus,
  LuEllipsisVertical,
  LuMessageCircle,
  LuBell,
  LuBellOff,
} from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  updateProfileMuted,
  updateProfileSubscribed,
} from "@/Store/slices/profiles";

const MuteButton = ({ profileData }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { wsClient } = useWebSocket();
  const handleMute = () => {
    if (profileData.muted) {
      wsClient.send({
        type: "social",
        action: "profile/unmute",
        payload: {
          username: profileData.username,
        },
      });
      dispatch(
        updateProfileMuted({
          type: profileData.type === "user" ? 0 : 1,
          id: profileData.id,
          muted: false,
        }),
      );
      return;
    }

    wsClient.send({
      type: "social",
      action: "profile/mute",
      payload: {
        username: profileData.username,
      },
    });
    dispatch(
      updateProfileMuted({
        type: profileData.type === "user" ? 0 : 1,
        id: profileData.id,
        muted: true,
      }),
    );
  };

  return (
    <>
      {profileData.muted ? (
        <Button onClick={handleMute} className="ProfileButton">
          <div className="Icon">
            <LuBellOff size={20} />
          </div>
          {t("profile.buttons.unmute")}
        </Button>
      ) : (
        <Button onClick={handleMute} className="ProfileButton">
          <div className="Icon">
            <LuBell size={20} />
          </div>
          {t("profile.buttons.mute")}
        </Button>
      )}
    </>
  );
};

const HeaderButtons = ({ profileData, profileLoaded, updateProfile }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { accountData } = useAuth();
  const { wsClient } = useWebSocket();
  const { openModal } = useModalsStore();
  const navigate = useNavigate();
  const [isBlocked, setIsBlocked] = useState(false);
  const [governIsOpen, setGovernorIsOpen] = useState(false);

  useEffect(() => {
    if (profileLoaded) {
      setIsBlocked(profileData.blocked);
    }
  }, [profileLoaded]);

  const blockProfile = () => {
    wsClient.send({
      type: "social",
      action: "block_profile",
      username: profileData.username,
    });
    setIsBlocked(true);
  };

  const unblockProfile = () => {
    wsClient.send({
      type: "social",
      action: "unblock_profile",
      username: profileData.username,
    });
    setIsBlocked(false);
  };

  const handleSubscribe = () => {
    if (profileData.subscribed) {
      wsClient.send({
        type: "social",
        action: "profile/unsubscribe",
        payload: {
          username: profileData.username,
        },
      });
      dispatch(
        updateProfileSubscribed({
          type: profileData.type === "user" ? 0 : 1,
          id: profileData.id,
          subscribed: false,
        }),
      );
      dispatch(
        updateProfileMuted({
          type: profileData.type === "user" ? 0 : 1,
          id: profileData.id,
          muted: false,
        }),
      );
      return;
    }

    wsClient.send({
      type: "social",
      action: "profile/subscribe",
      payload: {
        username: profileData.username,
      },
    });
    dispatch(
      updateProfileSubscribed({
        type: profileData.type === "user" ? 0 : 1,
        id: profileData.id,
        subscribed: true,
      }),
    );
  };

  const sendGift = () => {
    openModal({
      type: "routed",
      props: {
        children: <SendGift profileData={profileData} />,
      },
    });
  };

  const changeChannel = () => {
    openModal({
      type: "window",
      props: {
        title: t("edit_channel"),
        childrenClassName: "MultiForm",
        children: (
          <ChannelManager
            channel={profileData}
            isEdit
            updateData={updateProfile}
          />
        ),
      },
    });
  };

  const profileGovern = [
    {
      title: t("send_gift"),
      icon: <I_GIFT />,
      onClick: sendGift,
    },
    ...(!profileData?.my_profile
      ? [
          {
            title: t("block"),
            icon: <I_BLOCK />,
            color: "red",
            onClick: () => {
              blockProfile();
              setGovernorIsOpen(false);
            },
          },
          {
            title: t("report"),
            icon: <I_WARNING />,
            onClick: () => {
              openModal({
                type: "routed",
                props: {
                  title: "Жалоба на профиль",
                  children: (
                    <ReportModal
                      targetType={profileData.type}
                      targetId={profileData.id}
                      target={profileData}
                      onClose={() => openModal({ type: "close" })}
                    />
                  ),
                },
              });
              setGovernorIsOpen(false);
            },
          },
        ]
      : []),
    ...(profileData?.type === "channel" && profileData?.my_profile
      ? [
          {
            title: t("change"),
            icon: <I_EDIT />,
            onClick: changeChannel,
          },
        ]
      : []),
  ];

  return (
    <div style={{ position: "relative" }}>
      <div className="Buttons">
        {isBlocked ? (
          <button onClick={unblockProfile} className="Button">
            {t("unblock")}
          </button>
        ) : (
          <>
            {(profileData?.type === "user"
              ? accountData?.id !== profileData?.id
              : true) && (
              <>
                {profileData?.subscribed ? (
                  <>
                    <Button onClick={handleSubscribe} className="ProfileButton">
                      {t("profile.buttons.unsubscribe")}
                    </Button>
                    <MuteButton profileData={profileData} />
                  </>
                ) : (
                  <Button
                    onClick={handleSubscribe}
                    className="SubButton ProfileButton"
                    buttonStyle="action"
                  >
                    {t("profile.buttons.subscribe")}
                  </Button>
                )}
                {profileData?.type === "user" && (
                  <div
                    onClick={() => {
                      navigate(`/chat/t0i${profileData.id}`);
                    }}
                    className="ProfileButton clickable-ghost"
                  >
                    <div className="Icon">
                      <LuMessageCircle size={20} />
                    </div>
                    {t("profile.buttons.chat")}
                  </div>
                )}
              </>
            )}
            <div
              onClick={() => setGovernorIsOpen(!governIsOpen)}
              className="ProfileButton clickable-ghost"
            >
              <LuEllipsisVertical size={20} />
              {t("profile.buttons.more")}
            </div>
          </>
        )}
      </div>
      <GovernButtons
        isOpen={governIsOpen}
        setIsOpen={setGovernorIsOpen}
        buttons={profileGovern}
      />
    </div>
  );
};

export default HeaderButtons;
