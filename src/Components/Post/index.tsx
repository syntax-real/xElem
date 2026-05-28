import { useTranslation } from "react-i18next";
import { useWebSocket } from "../../System/Context/WebSocket";
import { useAuth } from "../../System/Hooks/useAuth";
import { useRef, useState, useEffect, useCallback, memo } from "react";
import { useDatabase } from "../../System/Context/Database";
import BaseConfig from "../../Configs/Base";
import {
  I_ARCHIVE,
  I_BACK,
  I_BLOCK,
  I_COMMENT,
  I_COPY,
  I_DELETE,
  I_DOTS,
  I_DOWNLOAD,
  I_EDIT,
  I_SHARE,
  I_WARNING,
} from "../../System/UI/IconPack";
import { Avatar, ContextMenu, GovernButtons, Text } from "../../UIKit";
import { useNavigate } from "react-router-dom";
import { HandleTimeAge, HandleUserIcons } from "../../System/Elements/Handlers";
import { AnimatePresence, motion } from "framer-motion";
import Interaction from "./Components/Interaction";
import Poll from "./Components/Poll";
import UserContentImage from "../Handlers/UserContent/UserContentImage";
import UserContentImages from "../Handlers/UserContent/UserContentImages";
import UserContentFiles from "../Handlers/UserContent/UserContentFiles";
import UserContentVideo from "../Handlers/UserContent/UserContentVideo";
import UserContentSongs from "../Handlers/UserContent/UserContentSongs";
import { useDispatch } from "react-redux";
import { removePost } from "../../Store/slices/posts";
import { useModalsStore } from "../../Store/modalsStore";
import PostModal from "../Modals/PostModal";
import useSettingsStore from "../../Store/settingsStore";
import { downloadBlob } from "../../System/Elements/Function";
import clsx from "clsx";
import { useClickAway } from "@uidotdev/usehooks";
import ReportModal from "../Modals/ReportModal";
import EditPostModal from "../Modals/EditPostModal";

interface LikeHeart {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  opacity: number;
}

interface PostInfoProps {
  avatar: string | null;
  name: string;
  username: string;
  icons?: string;
  createDate: string;
  isInModal?: boolean;
}

const MemoizedPostInfo = memo(
  ({ avatar, name, username, icons, createDate, isInModal }: PostInfoProps) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const navigateToProfile = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isInModal) {
        setTimeout(() => {
          navigate(`/e/${username}`);
        }, 100);
      } else {
        navigate(`/e/${username}`);
      }
    };

    return (
      <div className="Info">
        <div onClick={navigateToProfile}>
          <Avatar avatar={avatar} name={name} size={40} />
        </div>
        <div className="InfoBody">
          <div className="UI-NameBody">
            <div onClick={navigateToProfile} className="Name">
              {name || t("deleted_account")}
            </div>
            {icons && <HandleUserIcons icons={icons} />}
          </div>
          <div className="Date">
            <HandleTimeAge inputDate={createDate} />
          </div>
        </div>
      </div>
    );
  },
);

const Comments = ({ comments, pid }) => {
  const { openModal } = useModalsStore() as any;

  const handleClick = () => {
    window.history.pushState(null, "", `/post/${pid}`);

    openModal({
      type: "routed",
      props: {
        children: <PostModal postID={pid} />,
        onClose: ({ isRoute = false } = {}) => {
          if (isRoute) return;
          window.history.back();
        },
      },
    });
  };

  return (
    <button className="InteractionButton" onClick={handleClick}>
      <I_COMMENT />
      {comments > 0 && <div style={{ marginLeft: 5 }}>{comments}</div>}
    </button>
  );
};

const HeartIcon = () => {
  const { theme } = useSettingsStore();

  const getGradientId = () => {
    if (theme.includes("GOLD")) return "goldGradient";
    if (theme.includes("DARK") || theme.includes("AMOLED"))
      return "darkGradient";
    return "defaultGradient";
  };

  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%">
      <defs>
        {/* Золотой градиент */}
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fab31e" />
          <stop offset="100%" stopColor="#fd9347" />
        </linearGradient>

        {/* Темный градиент */}
        <linearGradient id="darkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9c5fff" />
          <stop offset="100%" stopColor="#6b40ff" />
        </linearGradient>

        {/* Градиент по умолчанию */}
        <linearGradient
          id="defaultGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#ff5a7e" />
          <stop offset="100%" stopColor="#ff3e66" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${getGradientId()})`}
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
    </svg>
  );
};

const Post = ({
  post,
  className,
  isInModal = false,
  governButtons = true,
}: {
  post: any;
  className?: string;
  onDelete?: (res: any, id: number) => void;
  isInModal?: boolean;
  governButtons?: boolean;
}) => {
  const { wsClient } = useWebSocket();
  const { t } = useTranslation();
  const { accountData } = useAuth();
  const { openModal } = useModalsStore() as any;
  const { doubleClickLike } = useSettingsStore();
  const db = useDatabase();
  const avatar = post?.author?.avatar || null;
  const name = post?.author?.name || null;
  const myPost = post.my_post || false;
  const content = post.content;
  const postRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();
  const shareRef = useClickAway(() => {
    setShareOpen(false);
  }) as React.RefObject<HTMLDivElement> | any;

  const [likeHearts, setLikeHearts] = useState<LikeHeart[]>([]);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isLiked, setIsLiked] = useState(post.liked);
  const [dislikesCount, setDislikesCount] = useState(post.dislikes);
  const [isDisliked, setIsDisliked] = useState(post.disliked);
  const processingLikeRef = useRef(false);

  const lastTapTimeRef = useRef(0);
  const touchStartRef = useRef(0);
  const lastTouchPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setLikesCount(post.likes);
    setIsLiked(post.liked);
    setDislikesCount(post.dislikes);
    setIsDisliked(post.disliked);
  }, [post.likes, post.liked, post.dislikes, post.disliked]);

  const shareAnimation = {
    show: {
      x: "0%",
      opacity: 1,
      transition: {
        duration: 0.2,
      },
    },
    hide: {
      x: "-100%",
      opacity: 0,
      transition: {
        duration: 0.2,
      },
    },
  };

  const shareInputRef = useRef<HTMLInputElement>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [governIsOpen, setGovernIsOpen] = useState(false);

  const openShare = () => {
    setShareOpen(true);
  };

  const closeShare = () => {
    setShareOpen(false);
  };

  const copyURL = () => {
    if (shareInputRef.current) {
      navigator.clipboard.writeText(shareInputRef.current.value);
    }
  };

  const deletePost = () => {
    wsClient
      .send({
        type: "social",
        action: post.deleted ? "posts/restore" : "posts/delete",
        payload: {
          post_id: post.id,
        },
      })
      .then((res: any) => {
        if (res.status === "success") {
          if (!post.deleted) {
            dispatch(removePost(post.id));
          }
        } else {
          openModal({
            type: "alert",
            props: {
              title: t("error"),
              message: res.message,
            },
          });
        }
      });
  };

  const blockUser = () => {
    if (!post?.author?.blocked) {
      wsClient
        .send({
          type: "social",
          action: "block_profile",
          username: post.author.username,
        })
        .then((res: any) => {
          if (res.status === "success") {
            openModal({
              type: "alert",
              props: {
                title: "Пользователь заблокирован",
                message: "Вы больше не увидите посты этого пользователя",
              },
            });
          } else if (res.status === "error") {
            openModal({
              type: "alert",
              props: {
                title: t("error"),
                message: res.message,
              },
            });
          }
        });
    } else {
      wsClient
        .send({
          type: "social",
          action: "unblock_profile",
          username: post.author.username,
        })
        .then((res: any) => {
          if (res.status === "success") {
            openModal({
              type: "alert",
              props: {
                title: "Пользователь разблокирован",
                message: "Вы снова увидите посты этого пользователя",
              },
            });
          } else if (res.status === "error") {
            openModal({
              type: "alert",
              props: {
                title: t("error"),
                message: res.message,
              },
            });
          }
        });
    }
  };

  const downloadVideoToDevice = async () => {
    try {
      if (!content.videos || content.videos.length === 0) return;

      const video = content.videos[0];
      const cached = await db.files_cache.get(["posts/videos", video.file]);

      if (cached?.file_blob && cached.file_blob.size > 0) {
        const fileName = video.name || "video.mp4";
        downloadBlob(cached.file_blob, fileName);
      } else {
        openModal({
          type: "alert",
          props: {
            title: t("error"),
            message:
              "Видео ещё не загружено. Сначала нажмите на превью для загрузки.",
          },
        });
      }
    } catch (error) {
      openModal({
        type: "alert",
        props: {
          title: t("error"),
          message: "Ошибка при сохранении видео",
        },
      });
    }
  };

  const editPost = () => {
    openModal({
      type: "routed",
      props: {
        title: "Редактировать пост",
        children: (
          <EditPostModal
            post={post}
            onClose={() => openModal({ type: "close" })}
          />
        ),
      },
    });
  };

  const reportPost = () => {
    openModal({
      type: "routed",
      props: {
        title: t("report_on_post"),
        children: (
          <ReportModal
            targetType="post"
            targetId={post.id}
            target={post}
            onClose={() => openModal({ type: "close" })}
          />
        ),
      },
    });
  };

  const archivePost = () => {
    if (!post.archived) {
      wsClient.send({
        type: "social",
        action: "posts/add_to_archive",
        payload: {
          post_id: post.id,
        },
      });
    } else {
      wsClient.send({
        type: "social",
        action: "posts/remove_from_archive",
        payload: {
          post_id: post.id,
        },
      });
    }

    dispatch(removePost(post.id));
  };

  const deleteForever = () => {
    wsClient.send({
      type: "social",
      action: "posts/delete_forever",
      payload: {
        post_id: post.id,
      },
    });

    dispatch(removePost(post.id));
  };

  const deletePostForever = () => {
    openModal({
      type: "query",
      props: {
        title: t("are_you_sure"),
        message: t("delete_forever_info"),
        onConfirm: () => {
          deleteForever();
        },
      },
    });
  };

  const govern = [
    ...(content &&
    typeof content === "object" &&
    content.videos &&
    content.videos.length > 0
      ? [
          {
            title: "Скачать видео",
            icon: <I_DOWNLOAD />,
            onClick: downloadVideoToDevice,
          },
        ]
      : []),
    {
      title: t("report"),
      icon: <I_WARNING />,
      onClick: reportPost,
    },
    ...(myPost === true && !post.deleted
      ? [
          {
            title: t("edit"),
            icon: <I_EDIT />,
            onClick: editPost,
          },
        ]
      : []),
    ...(myPost === true || ["admin", "moderator"].includes(accountData?.role)
      ? [
          {
            title: !post.deleted ? t("delete") : t("restore"),
            icon: <I_DELETE />,
            color: "red",
            onClick: deletePost,
          },
        ]
      : []),
    ...((myPost === true || ["admin"].includes(accountData?.role)) &&
    post.deleted
      ? [
          {
            title: t("delete_forever"),
            icon: <I_DELETE />,
            color: "red",
            onClick: deletePostForever,
          },
        ]
      : []),
    ...(myPost === true
      ? [
          {
            title: !post.archived ? t("to_archive") : t("archive_remove"),
            icon: <I_ARCHIVE />,
            onClick: archivePost,
          },
        ]
      : []),
    ...(myPost === false
      ? [
          {
            title: !post?.author?.blocked ? t("block") : t("unblock"),
            icon: <I_BLOCK />,
            color: "red",
            onClick: blockUser,
          },
        ]
      : []),
  ];

  const removeHeart = useCallback((heartId: number) => {
    setLikeHearts((prev) => prev.filter((heart) => heart.id !== heartId));
  }, []);

  const createLikeHeart = useCallback((x: number, y: number): LikeHeart => {
    const rotation = Math.random() * 60 - 30;
    const scale = 0.8 + Math.random() * 0.4;
    const id = Date.now() + Math.random();

    return {
      id,
      x,
      y,
      rotation,
      scale,
      opacity: 1,
    };
  }, []);

  const addNewHeart = useCallback(
    (x: number, y: number) => {
      const newHeart = createLikeHeart(x, y);
      setLikeHearts((prev) => [...prev, newHeart]);

      setTimeout(() => {
        removeHeart(newHeart.id);
      }, 1000);
    },
    [createLikeHeart, removeHeart],
  );

  const handleLike = useCallback(() => {
    if (processingLikeRef.current) return;
    processingLikeRef.current = true;

    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
    setIsLiked((prev) => !prev);

    if (post.disliked || isDisliked) {
      setDislikesCount((prev) => Math.max(prev - 1, 0));
      setIsDisliked(false);
    }

    wsClient.send({
      type: "social",
      action: "posts/like",
      payload: {
        post_id: post.id,
      },
    });

    setTimeout(() => {
      processingLikeRef.current = false;
    }, 300);
  }, [post.id, isLiked, post.disliked, isDisliked]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!doubleClickLike) return;

      const target = e.target as HTMLElement;
      if (target.closest("[data-no-double-tap]")) {
        return;
      }
      if (!postRef.current) return;
      const rect = postRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      addNewHeart(x, y);
      if (!isLiked) {
        handleLike();
      }
    },
    [addNewHeart, handleLike, isLiked],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!doubleClickLike) return;

      const touch = e.touches[0];
      const target = e.target as HTMLElement;
      if (target.closest("[data-no-double-tap]")) {
        touchStartRef.current = 0;
        return;
      }
      touchStartRef.current = Date.now();
      if (touch && postRef.current) {
        const rect = postRef.current.getBoundingClientRect();
        lastTouchPosRef.current = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      }
    },
    [],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!doubleClickLike) return;

      if (!touchStartRef.current) {
        return;
      }
      const touchDuration = Date.now() - touchStartRef.current;
      if (touchDuration > 300 || !postRef.current) return;

      const target = e.target as HTMLElement;
      if (target.closest("[data-no-double-tap]")) {
        touchStartRef.current = 0;
        return;
      }

      const currentTime = Date.now();
      const tapLength = currentTime - lastTapTimeRef.current;
      if (tapLength < 300 && tapLength > 0) {
        if (e.cancelable) {
          e.preventDefault();
        }
        addNewHeart(lastTouchPosRef.current.x, lastTouchPosRef.current.y);
        if (!isLiked) {
          handleLike();
        }
      }
      lastTapTimeRef.current = currentTime;
    },
    [addNewHeart, handleLike, isLiked],
  );

  const onLikeFromPanel = useCallback(() => {
    if (processingLikeRef.current) return;
    processingLikeRef.current = true;

    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
    setIsLiked((prev) => !prev);

    if (!isLiked && isDisliked) {
      setDislikesCount((prev) => Math.max(prev - 1, 0));
      setIsDisliked(false);
    }

    wsClient.send({
      type: "social",
      action: "posts/like",
      payload: {
        post_id: post.id,
      },
    });

    setTimeout(() => {
      processingLikeRef.current = false;
    }, 300);
  }, [isLiked, isDisliked, post.id]);

  const onDislikeFromPanel = useCallback(() => {
    if (processingLikeRef.current) return;
    processingLikeRef.current = true;

    setDislikesCount((prev) => (isDisliked ? prev - 1 : prev + 1));
    setIsDisliked((prev) => !prev);

    if (!isDisliked && isLiked) {
      setLikesCount((prev) => Math.max(prev - 1, 0));
      setIsLiked(false);
    }

    wsClient.send({
      type: "social",
      action: "posts/dislike",
      payload: {
        post_id: post.id,
      },
    });

    setTimeout(() => {
      processingLikeRef.current = false;
    }, 300);
  }, [isDisliked, isLiked, post.id]);

  return (
    <ContextMenu
      items={govern}
      className={clsx("UI-Block", "Post", className, {
        "UI-Deleted": post.deleted,
      })}
    >
      <div
        ref={postRef}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="TopBar">
          <MemoizedPostInfo
            avatar={avatar}
            name={name}
            username={post.author.username}
            icons={post.author?.icons}
            createDate={post.create_date}
            isInModal={isInModal}
          />
          {governButtons && (
            <div style={{ display: "flex", flexDirection: "row" }}>
              {(post.archived || post.deleted) && (
                <div className="PostStatusIcons">
                  {post.archived && <I_ARCHIVE />}
                  {post.deleted && <I_DELETE />}
                </div>
              )}
              <button
                onClick={() => {
                  setGovernIsOpen((prev) => !prev);
                }}
                className="GovernButton"
                data-no-double-tap
              >
                <I_DOTS />
              </button>
              <GovernButtons isOpen={governIsOpen} buttons={govern} />
            </div>
          )}
        </div>

        <div
          style={{
            margin: "7px 0px",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          <Text text={post.text} />

          {post.poll && <Poll poll={post.poll} postId={post.id} />}

          {content && (
            <>
              {content.images &&
                content.images.length > 0 &&
                (content.images.length === 1 ? (
                  <UserContentImage
                    image={content.images[0]}
                    censoring={content.censoring}
                  />
                ) : (
                  <UserContentImages
                    images={content.images}
                    censoring={content.censoring}
                  />
                ))}
              {content.videos &&
                content.videos.map((video, i) => (
                  <UserContentVideo
                    key={i}
                    video={video}
                    downloadVideoToDevice={downloadVideoToDevice}
                  />
                ))}
              {content.files && (
                <UserContentFiles files={content.files} path="posts/files" />
              )}
              {content.songs && (
                <UserContentSongs songs={content.songs} path="posts/songs" />
              )}
            </>
          )}
        </div>

        <div className="InteractionContainer" data-no-double-tap>
          <motion.div
            className="InteractionScroll"
            animate={{
              scale: shareOpen ? 0.5 : 1,
            }}
          >
            <div className="InteractionButtons" style={{ width: "100%" }}>
              <Interaction
                likes={likesCount}
                liked={isLiked}
                dislikes={dislikesCount}
                disliked={isDisliked}
                pid={post.id}
                onLike={onLikeFromPanel}
                onDislike={onDislikeFromPanel}
              />
              {!isInModal && (
                <Comments comments={post.comments} pid={post.id} />
              )}
              <button onClick={openShare} className="InteractionButton Share">
                <I_SHARE />
                <div style={{ marginLeft: 5 }}>{t("share_button")}</div>
              </button>
              {post.edited_at && (
                <span
                  style={{
                    marginLeft: "auto",
                    alignSelf: "center",
                    fontSize: "12px",
                    opacity: 0.4,
                    fontStyle: "italic",
                    userSelect: "none",
                    flexShrink: 0,
                    paddingRight: "2px",
                    zIndex: 1,
                  }}
                >
                  изменено
                </span>
              )}
            </div>
          </motion.div>
          <AnimatePresence>
            {shareOpen && (
              <motion.div
                className="ShareImposition"
                initial="hide"
                animate="show"
                exit="hide"
                variants={shareAnimation}
              >
                <div ref={shareRef} className="Interaction">
                  <button
                    onClick={closeShare}
                    className="InteractionButton Back"
                  >
                    <I_BACK />
                    {t("back")}
                  </button>
                  <div className="URL">
                    <input
                      ref={shareInputRef}
                      type="Text"
                      value={`${BaseConfig.domains.base}/post/${post.id}`}
                      readOnly
                    />
                  </div>
                  <button onClick={copyURL} className="CopyURL">
                    <I_COPY />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {likeHearts.length > 0 && (
          <div className="LikeAnimation">
            {likeHearts.map((heart) => (
              <div
                key={heart.id}
                className="LikeHeart"
                style={{
                  left: `${heart.x}px`,
                  top: `${heart.y}px`,
                  transform: `rotate(${heart.rotation}deg)`,
                  transformOrigin: "center center",
                }}
              >
                <HeartIcon />
              </div>
            ))}
          </div>
        )}
      </div>
    </ContextMenu>
  );
};

Post.defaultProps = {
  isInModal: false,
};

export default memo(Post);
