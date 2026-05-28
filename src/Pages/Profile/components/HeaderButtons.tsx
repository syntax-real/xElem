import { useAuth } from "@/System/Hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useWebSocket } from "@/System/Context/WebSocket";
import { Button } from "@/UIKit";
import { LuMessageCircle, LuBell, LuBellOff } from "react-icons/lu";
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

const HeaderButtons = ({ profileData, profileLoaded }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { accountData } = useAuth();
  const { wsClient } = useWebSocket();
  const navigate = useNavigate();
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (profileLoaded) {
      setIsBlocked(profileData.blocked);
    }
  }, [profileLoaded]);

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
                      <LuMessageCircle size={25} />
                    </div>
                    {t("profile.buttons.chat")}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HeaderButtons;
