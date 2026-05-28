import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "../../../../System/Context/WebSocket";
import { AnimatePresence, motion } from "framer-motion";
import {
  HandleFileIcon,
  HandleFileSize,
  HandleText,
} from "../../../../System/Elements/Handlers";
import {
  I_CLOCK,
  I_CLOSE,
  I_DOWNLOAD,
  CheckIcon,
  I_DOUBLE_CHECK,
  I_REPLY,
  I_EDIT,
  I_DELETE,
  I_MICROPHONE,
  I_VIDEO,
  I_CALL,
  I_CALL_END,
} from "../../../../System/UI/IconPack";
import clsx from "clsx";
import { useAuth } from "../../../../System/Hooks/useAuth";
import { useDatabase } from "../../../../System/Context/Database";
import { useImageView } from "../../../../System/Hooks/useImageView";
import { useSelector } from "react-redux";
import { createExplosionEffect } from "../../../../System/Elements/ExplosionEffect";
import { Avatar, ContextMenu, ProgressRing } from "../../../../UIKit";
import HandleVoiceMessage from "./HandleVoiceMessage";
import HandleVideoMessage from "./HandleVideoMessage";
import { HandleTime } from "../../../../System/Elements/MusicPlayer";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
// Фиксированный набор реакций с Apple-иконками
const QUICK_REACTIONS = [
  { emoji: "❤️", unified: "2764-FE0F" },
  { emoji: "👍", unified: "1F44D" },
  { emoji: "👎", unified: "1F44E" },
  { emoji: "🔥", unified: "1F525" },
  { emoji: "😂", unified: "1F602" },
  { emoji: "😮", unified: "1F62E" },
  { emoji: "😢", unified: "1F622" },
  { emoji: "🎉", unified: "1F389" },
];

const EmojiImg = ({
  unified,
  size = 22,
}: {
  unified: string;
  size?: number;
}) => (
  <img
    src={`/static_sys/Images/Emoji/Apple/${unified.toLowerCase()}.png`}
    alt=""
    draggable={false}
    style={{ width: size, height: size, objectFit: "contain" }}
  />
);

interface ReactionUser {
  uid: number;
  name: string;
  avatar: string | null;
  date?: string;
}

// Normalize reactions: support both old format [uid, ...] and new format [{uid, name, avatar, date}, ...]
const normalizeUsers = (users: any[]): ReactionUser[] => {
  if (!Array.isArray(users) || users.length === 0) return [];
  if (typeof users[0] === "number") {
    return users.map((uid) => ({ uid, name: "...", avatar: null, date: "" }));
  }
  return users as ReactionUser[];
};

const ReactionBar = ({
  reactions,
  myId,
  onReaction,
}: {
  reactions: Record<string, any[]>;
  myId: number;
  onReaction: (emoji: string) => void;
}) => {
  const [popup, setPopup] = useState<{
    emoji: string;
    users: ReactionUser[];
    x: number;
    y: number;
  } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popup) return;
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopup(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [popup]);

  const showPopup = (
    emoji: string,
    users: ReactionUser[],
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let x = rect.left;
    let y = rect.top;
    setPopup({ emoji, users, x, y });
  };

  useEffect(() => {
    if (popup && popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      let { x, y } = popup;
      y = y - rect.height - 4;
      if (y < 8) y = 8;
      if (x + rect.width > window.innerWidth)
        x = window.innerWidth - rect.width - 8;
      if (x < 8) x = 8;
      popupRef.current.style.left = `${x}px`;
      popupRef.current.style.top = `${y}px`;
    }
  }, [popup]);

  return (
    <div className="Chat-M_Reactions">
      {Object.entries(reactions).map(([emoji, rawUsers]: [string, any[]]) => {
        const users = normalizeUsers(rawUsers);
        if (users.length === 0) return null;
        const found = QUICK_REACTIONS.find((r) => r.emoji === emoji);
        const isActive = users.some((u) => u.uid === myId);
        const count = users.length;

        return (
          <button
            key={emoji}
            className={clsx("Chat-M_Reaction", {
              "Chat-M_Reaction--active": isActive,
            })}
            onClick={(e) => {
              e.stopPropagation();
              onReaction(emoji);
            }}
            onContextMenu={(e) => showPopup(emoji, users, e)}
          >
            {found ? (
              <EmojiImg unified={found.unified} size={18} />
            ) : (
              <span className="Chat-M_Reaction-Emoji">{emoji}</span>
            )}
            <div className="Chat-M_Reaction-Avatars">
              {count === 1 && (
                <Avatar
                  avatar={users[0].avatar}
                  name={users[0].name}
                  size={16}
                />
              )}
              {count === 2 && (
                <>
                  <div className="Chat-M_Reaction-AvatarStack">
                    <Avatar
                      avatar={users[0].avatar}
                      name={users[0].name}
                      size={16}
                    />
                  </div>
                  <div className="Chat-M_Reaction-AvatarStack Chat-M_Reaction-AvatarStack--second">
                    <Avatar
                      avatar={users[1].avatar}
                      name={users[1].name}
                      size={16}
                    />
                  </div>
                </>
              )}
              {count >= 3 && (
                <span className="Chat-M_Reaction-Count">{count}</span>
              )}
            </div>
          </button>
        );
      })}

      {popup &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={popupRef}
              className="Chat-M_ReactionPopup UI-LG_Block"
              style={{
                position: "fixed",
                left: popup.x,
                top: popup.y,
                zIndex: 99999,
              }}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { duration: 0.12 },
              }}
              exit={{
                opacity: 0,
                y: 8,
                scale: 0.95,
                transition: { duration: 0.1 },
              }}
            >
              <div className="Chat-M_ReactionPopup-Header">
                {(() => {
                  const found = QUICK_REACTIONS.find(
                    (r) => r.emoji === popup.emoji,
                  );
                  return found ? (
                    <EmojiImg unified={found.unified} size={22} />
                  ) : (
                    <span>{popup.emoji}</span>
                  );
                })()}
              </div>
              <div className="Chat-M_ReactionPopup-List">
                {popup.users.map((user) => (
                  <div key={user.uid} className="Chat-M_ReactionPopup-User">
                    <Avatar avatar={user.avatar} name={user.name} size={28} />
                    <div className="Chat-M_ReactionPopup-UserInfo">
                      <div className="Chat-M_ReactionPopup-UserName">
                        {user.name}
                      </div>
                      {user.date && (
                        <div className="Chat-M_ReactionPopup-UserDate">
                          {new Date(user.date).toLocaleString([], {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
};

const HandleMessageImage = ({ message, decrypted }) => {
  const { wsClient } = useWebSocket();
  const { openImage } = useImageView();
  const db = useDatabase();
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [fileSrc, setFileSrc] = useState<any>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const loadFile = async () => {
    if (message.mid) {
      const file = await db.files.where("mid").equals(message.mid).first();

      if (file) {
        setFileSrc(URL.createObjectURL(file.blob));
        setIsDownloaded(true);
        return true;
      } else {
        return false;
      }
    }
  };

  useEffect(() => {
    if (decrypted?.file?.download_progress === 100) {
      loadFile();
    }
  }, [decrypted.file?.download_progress]);

  useEffect(() => {
    loadFile();
    if (message?.is_uploaded) {
      setIsDownloaded(true);
      setFileSrc(decrypted.file.base64);
    }
  }, [message?.is_uploaded]);

  const download = async () => {
    const file = await loadFile();

    if (!file) {
      wsClient.send({
        type: "messenger",
        action: "download_files",
        mid: message.mid,
        file_ids: decrypted.file.file_map,
      });
    }
  };

  const handleOpenImage = () => {
    if (fileSrc) {
      openImage({
        file_path: fileSrc,
        metadata: {
          file_name: decrypted.file.name,
        },
      });
    }
  };

  const cancelDownload = () => {
    if (imageRef.current) {
      createExplosionEffect(imageRef.current, 40);
    }

    setIsDownloaded(false);
    setFileSrc(null);
  };

  return (
    <div className="Image">
      {message.status === "not_sent" ? (
        <button
          className="Loader"
          onClick={() => {
            if (message.stopUpload) {
              message.stopUpload();
              if (imageRef.current) {
                createExplosionEffect(imageRef.current, 40);
              }
            }
          }}
        >
          <ProgressRing progress={message.upload_progress} />
          <I_CLOSE />
        </button>
      ) : (
        <>
          <div className={clsx("Bum", { BumBum: isDownloaded })}></div>
          <AnimatePresence>
            {!isDownloaded && (
              <motion.button
                className="Loader"
                onClick={download}
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {decrypted.file?.download_progress ? (
                  <>
                    <ProgressRing progress={decrypted.file.download_progress} />
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelDownload();
                      }}
                      className="CancelButton"
                    >
                      <I_CLOSE />
                    </div>
                  </>
                ) : (
                  <I_DOWNLOAD />
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </>
      )}
      <motion.img
        ref={imageRef}
        className={!isDownloaded ? "NotLoaded" : ""}
        style={{ width: decrypted?.preview?.width }}
        src={fileSrc ? fileSrc : decrypted.preview.base64}
        onClick={handleOpenImage}
      />
    </div>
  );
};

const formatCallDuration = (totalSec: number) => {
  const sec = Math.max(0, Math.floor(totalSec || 0));
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const CallEventCard = ({ decrypted }: { decrypted: any }) => {
  const { t } = useTranslation();
  const call = decrypted?.call || {};
  const isGroup = Boolean(call.is_group);
  const isMissed = Boolean(call.missed);
  const isVideo = call.call_type === "video";
  const duration = Number(call.duration) || 0;

  const title = isMissed
    ? isGroup
      ? t("call_event_missed_group")
      : t("call_event_missed")
    : isVideo
      ? isGroup
        ? t("call_event_group_video")
        : t("call_event_video")
      : isGroup
        ? t("call_event_group_audio")
        : t("call_event_audio");

  const subtitle = isMissed
    ? t("call_event_unanswered")
    : duration > 0
      ? formatCallDuration(duration)
      : t("call_event_no_duration");

  return (
    <div
      className={clsx("Chat-M_CallEvent", {
        "Chat-M_CallEvent--missed": isMissed,
        "Chat-M_CallEvent--video": isVideo,
        "Chat-M_CallEvent--group": isGroup,
      })}
    >
      <div className="Chat-M_CallEvent-Icon">
        {isMissed ? <I_CALL_END /> : <I_CALL />}
      </div>
      <div className="Chat-M_CallEvent-Body">
        <div className="Chat-M_CallEvent-Top">
          <div className="Chat-M_CallEvent-Title">{title}</div>
          <div className="Chat-M_CallEvent-Badges">
            {isGroup && (
              <span className="Chat-M_CallEvent-Badge">
                {t("call_event_group_badge")}
              </span>
            )}
            {isVideo && (
              <span className="Chat-M_CallEvent-Badge">
                {t("call_event_video_badge")}
              </span>
            )}
          </div>
        </div>
        <div className="Chat-M_CallEvent-Subtitle">{subtitle}</div>
      </div>
    </div>
  );
};

const HandleMessage = ({
  message,
  stopSendingFile,
  hasTail,
  showAvatar,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  searchQuery,
  highlightMid,
}) => {
  const handleMessageContent = (message) => {
    try {
      switch (message.version) {
        case 0:
          return { text: message.decrypted };
        case 1:
          return message.decrypted
            ? message.decrypted
            : { text: "Сообщение повреждено", error: true };
      }
    } catch (error) {
      return { text: "Сообщение повреждено", error: true };
    }
  };

  const { t } = useTranslation();
  const { accountData } = useAuth();
  const selectedChat = useSelector(
    (state: any) => state.messenger.selectedChat,
  );
  const messageTime = new Date(message.date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const decrypted = message?.is_decrypted
    ? message.decrypted
    : handleMessageContent(message);
  const [isNew, setIsNew] = useState(true);
  const fileRef = useRef<HTMLDivElement>(null);
  const isMine = message.uid === accountData.id;
  const isSent = message.status !== "not_sent";
  const isStatusOnlyMessage =
    decrypted?.type === "video" ||
    decrypted?.type === "call" ||
    decrypted?.type === "voice";

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsNew(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const contextMenuItems = [
    ...(isSent
      ? [
          {
            icon: <I_REPLY />,
            title: t("reply"),
            onClick: () => onReply?.(message),
          },
        ]
      : []),
    ...(isMine && isSent && decrypted?.type === "text"
      ? [
          {
            icon: <I_EDIT />,
            title: t("edit"),
            onClick: () => onEdit?.(message),
          },
        ]
      : []),
    ...(isMine && isSent
      ? [
          {
            icon: <I_DELETE />,
            title: t("delete"),
            onClick: () => onDelete?.(message),
          },
        ]
      : []),
  ];

  const reactionsHeader = isSent ? (
    <div className="Chat-M_QuickReactions">
      {QUICK_REACTIONS.map(({ emoji, unified }) => (
        <button
          key={unified}
          className="Chat-M_QR"
          onClick={() => onReaction?.(message, emoji)}
        >
          <EmojiImg unified={unified} size={26} />
        </button>
      ))}
    </div>
  ) : undefined;

  const isGroup = selectedChat?.type === 1;
  // В группах все слева, в ДМ — свои справа, чужие слева
  const isRightAligned = !isGroup && isMine;
  // Аватарки только в группах, у последнего сообщения в пачке
  const needsAvatarSlot = isGroup;
  const showAvatarIcon = isGroup && showAvatar;
  const replyTo = message.decrypted?.reply_to;
  const shouldHighlightText =
    Boolean(searchQuery && searchQuery.trim().length >= 2) &&
    Number(message.mid) === Number(highlightMid);

  const renderReplyText = () => {
    if (!replyTo) return null;
    if (replyTo.type === "voice") {
      return (
        <span className="Chat-M_Reply-Type">
          <span className="Chat-M_Reply-TypeIcon">
            <I_MICROPHONE />
          </span>
          <span>{replyTo.text || t("voice_message")}</span>
        </span>
      );
    }
    if (replyTo.type === "video") {
      return (
        <span className="Chat-M_Reply-Type">
          <span className="Chat-M_Reply-TypeIcon">
            <I_VIDEO />
          </span>
          <span>{replyTo.text || t("video_message")}</span>
        </span>
      );
    }
    return replyTo.text || "";
  };

  return (
    <div
      className={clsx("Chat-M_Row", {
        "Chat-M_Row--right": isRightAligned,
      })}
    >
      {needsAvatarSlot && (
        <div className="Chat-M_AvatarSlot">
          {showAvatarIcon && (
            <Avatar
              avatar={message.author?.avatar ?? selectedChat?.user_data?.avatar}
              name={message.author?.name ?? selectedChat?.user_data?.name ?? ""}
              size={32}
            />
          )}
        </div>
      )}
      <ContextMenu
        items={contextMenuItems}
        isActive={isSent}
        header={reactionsHeader}
      >
        <div
          data-mid={message.mid}
          className={clsx(
            isMine ? "Chat-M_Me" : "Chat-M_URS",
            { "Chat-M_HasTail": hasTail },
            { "message-new": isNew },
            { "Chat-M_VideoCircle": decrypted?.type === "video" },
            { "Chat-M_Call": decrypted?.type === "call" },
          )}
        >
          {replyTo && (
            <div
              className="Chat-M_Reply"
              onClick={() => {
                const container = document.querySelector(
                  ".Chat-MessagesScroll",
                ) as HTMLElement;
                const el = document.querySelector(
                  `[data-mid="${replyTo.mid}"]`,
                ) as HTMLElement;
                if (!container || !el) return;

                const containerRect = container.getBoundingClientRect();
                const elRect = el.getBoundingClientRect();
                const diff =
                  elRect.top -
                  containerRect.top -
                  containerRect.height / 2 +
                  elRect.height / 2;
                container.style.scrollBehavior = "smooth";
                container.scrollTop += diff;
                requestAnimationFrame(() => {
                  container.style.scrollBehavior = "";
                });

                el.classList.add("message-highlight");
                setTimeout(
                  () => el.classList.remove("message-highlight"),
                  1200,
                );
              }}
            >
              <div className="Chat-M_Reply-Bar" />
              <div className="Chat-M_Reply-Body">
                <div className="Chat-M_Reply-Author">
                  {replyTo.author || ""}
                </div>
                <div className="Chat-M_Reply-Text">{renderReplyText()}</div>
              </div>
            </div>
          )}
          {isGroup && (
            <div className="Header">
              <div className="Name">
                {isMine ? accountData.name : message?.author?.name}
              </div>
            </div>
          )}
          <>
            {decrypted?.type === "file" && (
              <div className="File" ref={fileRef}>
                {message.status === "not_sent" ? (
                  <button
                    onClick={() => {
                      if (fileRef.current) {
                        createExplosionEffect(fileRef.current, 40);
                        setTimeout(() => {
                          stopSendingFile(message.temp_mid);
                        }, 200);
                      } else {
                        stopSendingFile(message.temp_mid);
                      }
                    }}
                    className="Loader"
                  >
                    <ProgressRing
                      progress={
                        message.upload_progress ? message.upload_progress : 1
                      }
                    />
                    <I_CLOSE />
                  </button>
                ) : (
                  <div className="Icon">
                    <HandleFileIcon fileName={decrypted.file.name} />
                  </div>
                )}
                <div className="Metadata">
                  <div className="Name">{decrypted.file.name}</div>
                  <div className="Size">
                    <HandleFileSize bytes={decrypted.file.size} />
                  </div>
                </div>
              </div>
            )}
            {decrypted?.type === "image" && (
              <HandleMessageImage message={message} decrypted={decrypted} />
            )}
            {decrypted?.type === "voice" && (
              <HandleVoiceMessage message={message} decrypted={decrypted} />
            )}
            {decrypted?.type === "video" && (
              <HandleVideoMessage
                message={message}
                decrypted={decrypted}
                messageTime={messageTime}
              />
            )}
            {decrypted?.type === "call" && (
              <CallEventCard decrypted={decrypted} />
            )}
          </>
          <div
            className={clsx(
              "TextAndStatus",
              isStatusOnlyMessage && "TextAndStatus--status-only",
            )}
          >
            {decrypted?.type === "video" && (
              <div className="VideoDuration">
                <HandleTime time={decrypted?.file?.duration || 0} />
              </div>
            )}
            <div
              className={clsx("Text", decrypted?.error && "ErrorText")}
              style={isStatusOnlyMessage ? { display: "none" } : undefined}
            >
              <HandleText
                text={decrypted?.text || ""}
                highlightQuery={shouldHighlightText ? searchQuery : ""}
              />
            </div>
            <div className="Status">
              {message.decrypted?.is_edited && (
                <span className="Chat-M_Edited">{t("edited")}</span>
              )}
              <div className="Time">{messageTime}</div>
              {isMine && (
                <>
                  {message.status === "not_sent" && <I_CLOCK />}
                  {message.status !== "not_sent" && !message.is_read && (
                    <CheckIcon />
                  )}
                  {message.status !== "not_sent" && message.is_read && (
                    <span className="read-check">
                      <I_DOUBLE_CHECK />
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <ReactionBar
              reactions={message.reactions}
              myId={accountData.id}
              onReaction={(emoji) => onReaction?.(message, emoji)}
            />
          )}
        </div>
      </ContextMenu>
    </div>
  );
};

export default HandleMessage;
