import { useTranslation } from "react-i18next";
import { Avatar } from "@/UIKit";
import { useNavigate } from "react-router-dom";
import handleNotificationContent from "../../../UIKit/Utils/handleNotificationContent";
import clsx from "clsx";
import { HandleTimeAge } from "../../../System/Elements/Handlers";

interface NotificationProps {
  notification: any;
  className?: string;
}

const Notification = ({ notification, className }: NotificationProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleClick = ({ action, content }) => {
    switch (action) {
      case "PostLike":
      case "PostDislike":
      case "PostComment":
      case "ReplyComment":
      case "NewPost":
      case "NewWallPost":
        navigate(`/post/${content?.post?.id}`);
        break;
      case "ProfileSubscribe":
        navigate(`/e/${content?.profile?.username}`);
        break;
      case "ProfileUnsubscribe":
        navigate(`/e/${content?.profile?.username}`);
        break;
      case "ReferralRewardInviter":
      case "ReferralRewardInvited":
        navigate("/wallet");
        break;
      case "Message":
        navigate(`/chat`);
        break;
    }
  };

  const notificationContent = handleNotificationContent(notification, t);

  return (
    <button
      onClick={() =>
        handleClick({
          action: notification.action,
          content: notification.content,
        })
      }
      className={clsx("UI-Notification", "UI-Block", className)}
    >
      <div className="NotificationLeft">
        <div className="AvatarContainer">
          {notification.author?.avatar ? (
            <Avatar
              avatar={notification.author.avatar}
              name={notification.author.name}
              size={40}
            />
          ) : (
            <Avatar
              avatar={notification.content?.author?.avatar || null}
              name={t("system")}
              size={40}
            />
          )}

          {notificationContent.icon}
        </div>
        <div className="NotificationContent">
          <div className="Title">
            {notification.author?.name
              ? notification.author.name
              : notificationContent.title || t("system")}
          </div>
          <div className="Text">{notificationContent.text}</div>
        </div>
      </div>
      <div className="Date">
        <HandleTimeAge inputDate={notification.date} />
      </div>
    </button>
  );
};

export default Notification;
