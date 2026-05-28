import { useState, useEffect, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import {
  aesDecryptFile,
  aesDecryptUnit8,
} from "../../../System/Modules/Crypto";
import {
  useMessengerEvent,
  useWebSocket,
} from "../../../System/Context/WebSocket";
import ChatView from "./Components/ChatView";
import BottomBar from "./Components/BottomBar";
import { useDispatch, useSelector } from "react-redux";
import {
  addMessage,
  setMessages,
  setMessagesLoaded,
  updateChat,
  updateDownloadProgress,
  updateMessage,
  removeMessage,
} from "../../../Store/slices/messenger";
import TopBar from "./Components/TopBar";
import { useDatabase } from "../../../System/Context/Database";
import ChatMenu from "./Components/ChatMenu";
import { isMobile } from "react-device-detect";
import { EmojiPicker } from "@/UIKit";
import { I_ADD_FILE, I_ARROW_UP, I_CLOSE } from "../../../System/UI/IconPack";
import { useTranslation } from "react-i18next";
import { AnimatePresence } from "framer-motion";
import { motion } from "framer-motion";
import clsx from "clsx";
import useSettingsStore from "../../../Store/settingsStore";
import { useAuth } from "@/System/Hooks/useAuth";
import { useCallContext } from "../../../System/Context/CallContext";
import { useLocation } from "react-router-dom";
import { useModalsStore } from "@/Store/modalsStore";

const Chat = ({ chatDataLoaded, keyword }: any) => {
  const { t, i18n } = useTranslation();
  const { wsClient } = useWebSocket();
  const { openModal } = useModalsStore() as any;
  const { accountData } = useAuth();
  const db = useDatabase();
  const theme = useSettingsStore((s) => s.theme);
  const location = useLocation();
  const selectedChat = useSelector(
    (state: any) => state.messenger.selectedChat,
  );
  const emojiSidebarOpen = useSelector(
    (state: any) => state.messenger.emojiSidebarOpen,
  );
  const dispatch = useDispatch();
  const messages = useSelector((state: any) =>
    selectedChat
      ? state.messenger.chats[selectedChat.type]?.[selectedChat.id]?.messages ||
        []
      : [],
  );
  const messagesLoaded = useSelector((state: any) =>
    selectedChat
      ? state.messenger.chats[selectedChat.type]?.[selectedChat.id]
          ?.messagesLoaded || false
      : false,
  );
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const selectedChatRef = useRef(selectedChat);
  selectedChatRef.current = selectedChat;

  const [messagesSI, setMessagesSI] = useState(25);
  const [showLoadMore, setShowLoadMore] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isRecordingVideoCircle, setIsRecordingVideoCircle] = useState(false);
  const [groupTypingUsers, setGroupTypingUsers] = useState<Map<number, string>>(
    new Map(),
  );
  const [groupRecordingVoiceUsers, setGroupRecordingVoiceUsers] = useState<
    Map<number, string>
  >(new Map());
  const [groupRecordingVideoCircleUsers, setGroupRecordingVideoCircleUsers] =
    useState<Map<number, string>>(new Map());
  const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const recordingVoiceClearTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const recordingVideoCircleClearTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const groupTypingTimersRef = useRef<
    Map<number, ReturnType<typeof setTimeout>>
  >(new Map());
  const groupRecordingVoiceTimersRef = useRef<
    Map<number, ReturnType<typeof setTimeout>>
  >(new Map());
  const groupRecordingVideoCircleTimersRef = useRef<
    Map<number, ReturnType<typeof setTimeout>>
  >(new Map());
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [chatMenuType, setChatMenuType] = useState<string | null>(null);
  const [actionPanelOpen, setActionPanelOpen] = useState(false);
  const [messageValue, setMessageValue] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchValue, setChatSearchValue] = useState("");
  const [chatSearchResults, setChatSearchResults] = useState<any[]>([]);
  const [chatSearchIndex, setChatSearchIndex] = useState(0);
  const [chatSearchLoading, setChatSearchLoading] = useState(false);
  const chatSearchReqRef = useRef(0);
  const chatSearchInputRef = useRef<HTMLInputElement>(null);
  const CHAT_SEARCH_LIMIT = 80;

  const { startCall, startGroupCall } = useCallContext();

  const handleStartCall = (type: "audio" | "video") => {
    if (!selectedChat?.user_data) return;
    startCall(
      {
        id: selectedChat.user_data.id,
        name: selectedChat.user_data.name,
        avatar: selectedChat.user_data.avatar,
      },
      type,
    );
  };

  const handleStartGroupCall = async (type: "audio" | "video") => {
    if (!selectedChat) return;
    const res = await wsClient.send({
      type: "messenger",
      action: "load_group_members",
      gid: selectedChat.id,
    });
    const members = (res?.members ?? [])
      .filter(
        (m: any) =>
          Number(m?.id) > 0 && Number(m.id) !== Number(accountData?.id),
      )
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        avatar: m.avatar,
      }));
    startGroupCall(
      selectedChat.id,
      selectedChat.name ?? "Группа",
      type,
      members,
    );
  };

  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  const chatWallpaper = () => {
    const wallpapers: Record<string, string> = {
      GOLD: "/static_sys/Images/Chat/BG_GOLD.svg",
      DARK: "/static_sys/Images/Chat/BG_DARK.svg",
      AMOLED: "/static_sys/Images/Chat/BG_DARK.svg",
      "GOLD-DARK": "/static_sys/Images/Chat/BG_DARK_GOLD.svg",
      "AMOLED-GOLD": "/static_sys/Images/Chat/BG_DARK_GOLD.svg",
    };

    return wallpapers[theme] || "/static_sys/Images/Chat/BG.svg";
  };

  const { ref: loadMoreRef, inView: inView } = useInView({
    threshold: 0,
  });

  useEffect(() => {
    if (selectedChat) {
      dispatch(
        setMessagesLoaded({
          chat_id: selectedChat.id,
          chat_type: selectedChat.type,
          value: false,
        }),
      );
    }
  }, [selectedChat]);

  useEffect(() => {
    if (inView) {
      loadMoreMessages();
    }
  }, [inView]);

  useEffect(() => {
    if (!messagesLoaded && selectedChat) {
      wsClient
        .send({
          type: "messenger",
          action: "load_messages",
          target: {
            id: selectedChat.id,
            type: selectedChat.type,
          },
        })
        .then((res) => {
          handleMessages(res);
        });
    }
  }, [messagesLoaded, selectedChat]);

  useEffect(() => {
    if (messagesLoaded) {
      const timer = setTimeout(() => {
        setShowLoadMore(true);
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      setShowLoadMore(false);
    }
  }, [messagesLoaded]);

  // Создание временного ID
  const createTempMesID = (length) => {
    while (true) {
      let id = "";
      for (let i = 0; i < length; i++) {
        id += Math.floor(Math.random() * 10);
      }
      const answer = messages.find((m) => m?.temp_mid === id);
      if (!answer) {
        return Number(id);
      }
    }
  };

  const handleTyping = useCallback(
    (data) => {
      if (!data?.target || !selectedChat) return;
      if (data.uid === accountData.id) return;
      if (selectedChat.id === data.target.id) {
        if (selectedChat.type === 1) {
          const uid = data.uid;
          const name = data.author?.name || "...";
          setGroupTypingUsers((prev) => new Map(prev).set(uid, name));
          const existingTimer = groupTypingTimersRef.current.get(uid);
          if (existingTimer) clearTimeout(existingTimer);
          groupTypingTimersRef.current.set(
            uid,
            setTimeout(() => {
              setGroupTypingUsers((prev) => {
                const next = new Map(prev);
                next.delete(uid);
                return next;
              });
              groupTypingTimersRef.current.delete(uid);
            }, 3000),
          );
        } else {
          setIsTyping(true);
          if (typingClearTimerRef.current) {
            clearTimeout(typingClearTimerRef.current);
          }
          typingClearTimerRef.current = setTimeout(() => {
            setIsTyping(false);
            typingClearTimerRef.current = null;
          }, 3000);
        }
      }
    },
    [selectedChat, accountData.id],
  );

  const handleRecordingVoice = useCallback(
    (data) => {
      if (!data?.target || !selectedChat) return;
      if (data.uid === accountData.id) return;
      if (selectedChat.id === data.target.id) {
        if (selectedChat.type === 1) {
          const uid = data.uid;
          const name = data.author?.name || "...";
          if (data.status === "stop") {
            setGroupRecordingVoiceUsers((prev) => {
              const next = new Map(prev);
              next.delete(uid);
              return next;
            });
            const timer = groupRecordingVoiceTimersRef.current.get(uid);
            if (timer) {
              clearTimeout(timer);
              groupRecordingVoiceTimersRef.current.delete(uid);
            }
          } else {
            setGroupRecordingVoiceUsers((prev) => new Map(prev).set(uid, name));
            const existingTimer = groupRecordingVoiceTimersRef.current.get(uid);
            if (existingTimer) clearTimeout(existingTimer);
            groupRecordingVoiceTimersRef.current.set(
              uid,
              setTimeout(() => {
                setGroupRecordingVoiceUsers((prev) => {
                  const next = new Map(prev);
                  next.delete(uid);
                  return next;
                });
                groupRecordingVoiceTimersRef.current.delete(uid);
              }, 60000),
            );
          }
        } else {
          if (data.status === "stop") {
            setIsRecordingVoice(false);
            if (recordingVoiceClearTimerRef.current) {
              clearTimeout(recordingVoiceClearTimerRef.current);
              recordingVoiceClearTimerRef.current = null;
            }
          } else {
            setIsRecordingVoice(true);
            if (recordingVoiceClearTimerRef.current) {
              clearTimeout(recordingVoiceClearTimerRef.current);
            }
            recordingVoiceClearTimerRef.current = setTimeout(() => {
              setIsRecordingVoice(false);
              recordingVoiceClearTimerRef.current = null;
            }, 60000);
          }
        }
      }
    },
    [selectedChat, accountData.id],
  );

  const handleRecordingVideoCircle = useCallback(
    (data) => {
      if (!data?.target || !selectedChat) return;
      if (data.uid === accountData.id) return;
      if (selectedChat.id === data.target.id) {
        if (selectedChat.type === 1) {
          const uid = data.uid;
          const name = data.author?.name || "...";
          if (data.status === "stop") {
            setGroupRecordingVideoCircleUsers((prev) => {
              const next = new Map(prev);
              next.delete(uid);
              return next;
            });
            const timer = groupRecordingVideoCircleTimersRef.current.get(uid);
            if (timer) {
              clearTimeout(timer);
              groupRecordingVideoCircleTimersRef.current.delete(uid);
            }
          } else {
            setGroupRecordingVideoCircleUsers((prev) =>
              new Map(prev).set(uid, name),
            );
            const existingTimer =
              groupRecordingVideoCircleTimersRef.current.get(uid);
            if (existingTimer) clearTimeout(existingTimer);
            groupRecordingVideoCircleTimersRef.current.set(
              uid,
              setTimeout(() => {
                setGroupRecordingVideoCircleUsers((prev) => {
                  const next = new Map(prev);
                  next.delete(uid);
                  return next;
                });
                groupRecordingVideoCircleTimersRef.current.delete(uid);
              }, 60000),
            );
          }
        } else {
          if (data.status === "stop") {
            setIsRecordingVideoCircle(false);
            if (recordingVideoCircleClearTimerRef.current) {
              clearTimeout(recordingVideoCircleClearTimerRef.current);
              recordingVideoCircleClearTimerRef.current = null;
            }
          } else {
            setIsRecordingVideoCircle(true);
            if (recordingVideoCircleClearTimerRef.current) {
              clearTimeout(recordingVideoCircleClearTimerRef.current);
            }
            recordingVideoCircleClearTimerRef.current = setTimeout(() => {
              setIsRecordingVideoCircle(false);
              recordingVideoCircleClearTimerRef.current = null;
            }, 60000);
          }
        }
      }
    },
    [selectedChat, accountData.id],
  );

  useEffect(() => {
    return () => {
      if (typingClearTimerRef.current) {
        clearTimeout(typingClearTimerRef.current);
      }
      if (recordingVoiceClearTimerRef.current) {
        clearTimeout(recordingVoiceClearTimerRef.current);
      }
      if (recordingVideoCircleClearTimerRef.current) {
        clearTimeout(recordingVideoCircleClearTimerRef.current);
      }
      groupTypingTimersRef.current.forEach((t) => clearTimeout(t));
      groupRecordingVoiceTimersRef.current.forEach((t) => clearTimeout(t));
      groupRecordingVideoCircleTimersRef.current.forEach((t) =>
        clearTimeout(t),
      );
    };
  }, []);

  const handleMessagesRead = useCallback(
    (data) => {
      if (!data?.target || !selectedChat) return;
      if (selectedChat.id === data.target.id) {
        messages.forEach((msg) => {
          if (msg.uid === accountData.id && msg.mid && !msg.is_read) {
            dispatch(
              updateMessage({
                mid: msg.mid,
                chat_id: selectedChat.id,
                chat_type: selectedChat.type,
                newData: { is_read: true },
              }),
            );
          }
        });
      }
    },
    [selectedChat, messages, accountData],
  );

  useMessengerEvent("typing", handleTyping);
  useMessengerEvent("recording_voice", handleRecordingVoice);
  useMessengerEvent("recording_video_circle", handleRecordingVideoCircle);
  useMessengerEvent("messages_read", handleMessagesRead);

  const stopSendingFile = (tempMid) => {
    const message = messages.find((m) => m.temp_mid === tempMid);
    message.stop();

    wsClient.send({
      type: "messenger",
      action: "stop_upload",
      temp_mid: tempMid,
    });
  };

  const handleNewMessage = (data) => {
    if (selectedChat && selectedChat.id === data.target.id) {
      if (data.uid === accountData.id) return;

      const newMessage = {
        mid: data.mid,
        uid: data.uid,
        author: data.author,
        decrypted: JSON.parse(data.message),
        is_decrypted: true,
        date: data.date,
      };
      dispatch(
        addMessage({
          chat_id: selectedChat.id,
          chat_type: selectedChat.type,
          message: newMessage,
        }),
      );
      dispatch(
        updateChat({
          chat_id: selectedChat.id,
          chat_type: selectedChat.type,
          newData: {
            last_message: newMessage.decrypted?.text,
            last_message_date: new Date().toISOString(),
          },
        }),
      );

      if (!isNearBottom()) {
        setNewMessagesCount((prev) => prev + 1);
      }
    }
  };

  const handleMessages = async (data) => {
    if (!Array.isArray(data.messages) || !data.messages.length) {
      dispatch(
        setMessagesLoaded({
          chat_id: selectedChat.id,
          chat_type: selectedChat.type,
          value: true,
        }),
      );
      return;
    }

    const isJsonString = (str: string): boolean => {
      try {
        const parsed = JSON.parse(str);
        return typeof parsed === "object" && parsed !== null;
      } catch (e) {
        return false;
      }
    };

    const decryptedMessages = await Promise.all(
      data.messages.map(async (message) => {
        try {
          const decrypted = message.encrypted
            ? await aesDecryptUnit8(
                new Uint8Array(Object.values(message.encrypted)),
                keyword,
              )
            : message.decrypted;

          const { encrypted, ...rest } = message;

          return {
            ...rest,
            decrypted: isJsonString(decrypted)
              ? JSON.parse(decrypted)
              : decrypted,
          };
        } catch (error) {
          console.error("Ошибка при дешифровке сообщения:", error);
          const { encrypted, ...rest } = message;
          return {
            ...rest,
            decrypted: message.decrypted || null,
          };
        }
      }),
    );

    console.log("Декодированные сообщения:", decryptedMessages);

    dispatch(
      setMessages({
        chat_id: selectedChat.id,
        chat_type: selectedChat.type,
        messages: decryptedMessages,
      }),
    );
    dispatch(
      setMessagesLoaded({
        chat_id: selectedChat.id,
        chat_type: selectedChat.type,
        value: true,
      }),
    );
  };

  const loadMoreMessages = () => {
    if (selectedChat) {
      wsClient
        .send({
          type: "messenger",
          action: "load_messages",
          target: {
            id: selectedChat.id,
            type: selectedChat.type,
          },
          startIndex: messagesSI,
        })
        .then((res) => {
          handleMessages(res);
        });
      setMessagesSI((prev) => prev + 25);
    }
  };

  const handleDownloadFile = async (data) => {
    console.log("Пришёл кусок файла", data);

    db.transaction("rw", db.downloads, db.files, async () => {
      let downloading = await db.downloads
        .where("mid")
        .equals(data.mid)
        .first();
      if (downloading) {
        if (
          !downloading.file.downloaded.find(
            (chunk) => chunk.id === data.file_id,
          )
        ) {
          downloading.file.downloaded.push({
            id: data.file_id,
            binary: data.binary.buffer,
          });
        }
        await db.downloads.put(downloading);
        const progress = Math.round(
          (downloading.file.downloaded.length /
            downloading.file.file_map.length) *
            99,
        );

        dispatch(
          updateDownloadProgress({
            mid: data.mid,
            chat_id: selectedChatRef.current?.id,
            chat_type: selectedChatRef.current?.type,
            progress,
          }),
        );
      } else {
        const message = messagesRef.current.find(
          (item) => item.mid === data.mid,
        );
        if (
          !message?.decrypted?.file?.encrypted_key ||
          !message?.decrypted?.file?.encrypted_iv
        )
          return;
        const decrypted = message.decrypted;
        downloading = {
          mid: data.mid,
          file: {
            name: decrypted.file.name,
            file_map: decrypted.file.file_map,
            downloaded: [{ id: data.file_id, binary: data.binary.buffer }],
            encrypted_key: decrypted.file.encrypted_key,
            encrypted_iv: decrypted.file.encrypted_iv,
          },
        };
        await db.downloads.put(downloading);
      }

      downloading = await db.downloads.where("mid").equals(data.mid).first();

      if (downloading !== undefined) {
        if (
          downloading.file.downloaded.length ===
          downloading.file.file_map.length
        ) {
          const fileExists = await db.files
            .where("mid")
            .equals(data.mid)
            .first();

          if (!fileExists) {
            console.log("Готовлю файл...");

            const completeFile = downloading.file.file_map
              .map((id) => {
                const chunk = downloading.file.downloaded.find(
                  (chunk) => chunk.id === id,
                );
                if (!chunk) {
                  return new Uint8Array();
                }
                return new Uint8Array(chunk.binary);
              })
              .reduce(
                (acc, chunk) => new Uint8Array([...acc, ...chunk]),
                new Uint8Array(),
              );

            const decryptedFile = await aesDecryptFile(
              completeFile,
              downloading.file.encrypted_key,
              downloading.file.encrypted_iv,
            );
            const file = new Blob([decryptedFile], {
              type: "application/octet-stream",
            });

            await db.files.put({
              mid: data.mid,
              name: downloading.file.name,
              blob: file,
            });

            if (selectedChatRef.current) {
              dispatch(
                updateDownloadProgress({
                  mid: data.mid,
                  chat_id: selectedChatRef.current.id,
                  chat_type: selectedChatRef.current.type,
                  progress: 100,
                }),
              );
            }
          }
        }
      }
    });
  };

  const handleDownloadFiles = async (data) => {
    try {
      const currentMessages = messagesRef.current;
      const currentChat = selectedChatRef.current;
      const message = currentMessages.find((item) => item.mid === data.mid);
      if (!message) return;
      const decrypted = message.decrypted;

      if (!decrypted?.file?.encrypted_key || !decrypted?.file?.encrypted_iv) {
        console.error("Отсутствуют ключи шифрования для mid:", data.mid);
        return;
      }

      const fileExists = await db.files.where("mid").equals(data.mid).first();
      if (fileExists) return;

      const binary =
        data.binary instanceof Uint8Array
          ? data.binary
          : new Uint8Array(data.binary);
      const decryptedFile = await aesDecryptFile(
        binary,
        decrypted.file.encrypted_key,
        decrypted.file.encrypted_iv,
      );
      const file = new Blob([new Uint8Array(decryptedFile)], {
        type: "application/octet-stream",
      });

      await db.files.put({
        mid: data.mid,
        name: decrypted.file.name,
        blob: file,
      });

      if (currentChat) {
        dispatch(
          updateDownloadProgress({
            mid: data.mid,
            chat_id: currentChat.id,
            chat_type: currentChat.type,
            progress: 100,
          }),
        );
      }
    } catch (e) {
      console.error("Ошибка загрузки файла:", e);
      dispatch(
        updateDownloadProgress({
          mid: data.mid,
          chat_id: selectedChatRef.current?.id,
          chat_type: selectedChatRef.current?.type,
          progress: -1,
        }),
      );
    }
  };

  useMessengerEvent("new_message", handleNewMessage);
  useMessengerEvent("download_file", handleDownloadFile);
  useMessengerEvent("download_files", handleDownloadFiles);

  const openChatMenu = (type) => {
    if (chatMenuOpen && chatMenuType === type) {
      setChatMenuOpen(false);
    } else {
      setChatMenuOpen(true);
      setChatMenuType(type);
    }
  };

  const closeChatMenu = () => {
    setChatMenuOpen(false);
  };

  const handleReply = useCallback(
    (message) => {
      setEditingMessage(null);
      const decrypted = message.decrypted || {};
      const replyType = decrypted.type || "text";
      let replyText = decrypted.text || "";
      if (!replyText) {
        if (replyType === "voice") replyText = t("voice_message");
        else if (replyType === "video") replyText = t("video_message");
        else if (replyType === "image") replyText = t("image_message");
        else if (replyType === "file")
          replyText = decrypted.file?.name || t("file_message");
      }
      setReplyTo({
        mid: message.mid,
        author: message.author?.name || accountData.name,
        text: replyText,
        type: replyType,
      });
      messageInputRef.current?.focus();
    },
    [accountData, t],
  );

  const handleEdit = useCallback((message) => {
    setReplyTo(null);
    setEditingMessage(message);
    setMessageValue(message.decrypted?.text || "");
    messageInputRef.current?.focus();
  }, []);

  const handleDelete = useCallback(
    async (message) => {
      if (!message.mid || !selectedChat) return;

      try {
        const res = await wsClient.send({
          type: "messenger",
          action: "delete_message",
          mid: message.mid,
          target: {
            id: selectedChat.id,
            type: selectedChat.type,
          },
        });

        if (res?.status !== "ok") {
          openModal({
            type: "alert",
            props: {
              title: t("error"),
              message:
                res?.text || res?.message || "Не удалось удалить сообщение",
            },
          });
          return;
        }

        const chatId = res?.target?.id ?? selectedChat.id;
        const chatType = res?.target?.type ?? selectedChat.type;

        dispatch(
          removeMessage({
            mid: res?.mid ?? message.mid,
            chat_id: chatId,
            chat_type: chatType,
          }),
        );

        if (typeof res?.last_message === "string") {
          dispatch(
            updateChat({
              chat_id: chatId,
              chat_type: chatType,
              newData: {
                last_message: res.last_message,
                last_message_date: res?.last_message_date ?? null,
              },
            }),
          );
        }
      } catch {
        openModal({
          type: "alert",
          props: {
            title: t("error"),
            message: "Не удалось удалить сообщение",
          },
        });
      }
    },
    [selectedChat, wsClient, dispatch, openModal, t],
  );

  const handleReaction = useCallback(
    (message, emoji) => {
      if (!message.mid) return;
      wsClient.send({
        type: "messenger",
        action: "react_message",
        mid: message.mid,
        emoji: emoji,
        target: {
          id: selectedChat.id,
          type: selectedChat.type,
        },
      });
    },
    [selectedChat, wsClient],
  );

  const cancelReplyOrEdit = useCallback(() => {
    setReplyTo(null);
    setEditingMessage(null);
    setMessageValue("");
  }, []);

  const handleMessageEdited = useCallback(
    (data) => {
      if (!data?.mid || !selectedChat) return;
      const chatId = data.target?.id || selectedChat.id;
      const chatType = data.target?.type ?? selectedChat.type;

      dispatch(
        updateMessage({
          mid: data.mid,
          chat_id: chatId,
          chat_type: chatType,
          newData: {
            decrypted: { ...data.decrypted, is_edited: true },
            is_decrypted: true,
          },
        }),
      );

      if (typeof data?.last_message === "string") {
        dispatch(
          updateChat({
            chat_id: chatId,
            chat_type: chatType,
            newData: {
              last_message: data.last_message,
              last_message_date: data?.last_message_date ?? null,
            },
          }),
        );
      }
    },
    [selectedChat, dispatch],
  );

  const handleMessageDeleted = useCallback(
    (data) => {
      if (!data?.mid) return;
      const chatId = data.target?.id || selectedChat?.id;
      const chatType = data.target?.type ?? selectedChat?.type;
      if (chatId === undefined) return;
      dispatch(
        removeMessage({
          mid: data.mid,
          chat_id: chatId,
          chat_type: chatType,
        }),
      );

      if (typeof data?.last_message === "string") {
        dispatch(
          updateChat({
            chat_id: chatId,
            chat_type: chatType,
            newData: {
              last_message: data.last_message,
              last_message_date: data?.last_message_date ?? null,
            },
          }),
        );
      }
    },
    [selectedChat, dispatch],
  );

  const handleMessageReaction = useCallback(
    (data) => {
      if (!data?.mid || !selectedChat) return;
      const chatId = data.target?.id || selectedChat.id;
      const chatType = data.target?.type ?? selectedChat.type;
      const msg = messagesRef.current.find((m) => m.mid === data.mid);
      if (!msg) return;
      const reactions = { ...(msg.reactions || {}) };
      const users: Array<{
        uid: number;
        name: string;
        avatar: string | null;
        date: string;
      }> = reactions[data.emoji] ? [...reactions[data.emoji]] : [];
      const uid = data.uid;

      if (data.is_remove) {
        const idx = users.findIndex((u) => u.uid === uid);
        if (idx !== -1) {
          users.splice(idx, 1);
          if (users.length === 0) {
            delete reactions[data.emoji];
          } else {
            reactions[data.emoji] = users;
          }
        }
      } else {
        if (!users.find((u) => u.uid === uid)) {
          users.push({
            uid: uid,
            name: data.name || "...",
            avatar: data.avatar || null,
            date: new Date().toISOString(),
          });
          reactions[data.emoji] = users;
        }
      }
      dispatch(
        updateMessage({
          mid: data.mid,
          chat_id: chatId,
          chat_type: chatType,
          newData: { reactions },
        }),
      );
    },
    [selectedChat, dispatch],
  );

  useMessengerEvent("message_edited", handleMessageEdited);
  useMessengerEvent("message_deleted", handleMessageDeleted);
  useMessengerEvent("message_reaction", handleMessageReaction);

  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const handledSearchJumpRef = useRef<string>("");

  const getNewMessagesLabel = (count: number) => {
    if (count === 1) return t("new_message_one");

    const lang = (i18n.resolvedLanguage || i18n.language || "").toLowerCase();
    if (lang.startsWith("ru")) {
      const mod10 = count % 10;
      const mod100 = count % 100;
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
        return t("new_messages_few", { defaultValue: "новых сообщения" });
      }
    }

    return t("new_messages");
  };

  const isNearBottom = () => {
    if (!messagesScrollRef.current) return true;
    return Math.abs(messagesScrollRef.current.scrollTop) < 100;
  };

  const scrollToBottom = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.style.scrollBehavior = "auto";
    el.scrollTop = 0;
    requestAnimationFrame(() => {
      el.style.scrollBehavior = "";
    });
    setNewMessagesCount(0);
  };

  const centerAndHighlightMessage = (mid: number) => {
    const container = messagesScrollRef.current;
    const el = document.querySelector(`[data-mid="${mid}"]`) as HTMLElement;
    if (!container || !el) return false;

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
    setTimeout(() => el.classList.remove("message-highlight"), 1200);
    return true;
  };

  const jumpToMessageByMid = async (mid: number, startIndex?: number) => {
    if (!selectedChat) return false;
    if (centerAndHighlightMessage(mid)) return true;

    if (Number.isInteger(startIndex) && (startIndex as number) >= 0) {
      const res = await wsClient.send({
        type: "messenger",
        action: "load_messages",
        target: {
          id: selectedChat.id,
          type: selectedChat.type,
        },
        startIndex,
      });
      await handleMessages(res);
      return centerAndHighlightMessage(mid);
    }

    const res = await wsClient.send({
      type: "messenger",
      action: "load_messages",
      target: {
        id: selectedChat.id,
        type: selectedChat.type,
      },
      startIndex: Math.max(messages.length, 0),
    });
    await handleMessages(res);
    return centerAndHighlightMessage(mid);
  };

  useEffect(() => {
    if (messagesScrollRef.current && messages.length > 0) {
      if (isNearBottom()) {
        requestAnimationFrame(() => scrollToBottom());
      }
    }
  }, [messages.length]);

  useEffect(() => {
    const container = messagesScrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (isNearBottom()) setNewMessagesCount(0);
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!selectedChat || !chatDataLoaded || !messagesLoaded) return;

    const params = new URLSearchParams(location.search);
    const midRaw = params.get("mid");
    if (!midRaw) return;

    const mid = Number(midRaw);
    if (!Number.isFinite(mid)) return;

    const startIndexRaw = params.get("si");
    const startIndex = startIndexRaw ? Number.parseInt(startIndexRaw, 10) : NaN;
    const jumpKey = `${selectedChat.type}:${selectedChat.id}:${mid}:${Number.isInteger(startIndex) ? startIndex : "na"}`;

    if (handledSearchJumpRef.current === jumpKey) return;

    const jumpToMessage = async () => {
      const success = await jumpToMessageByMid(
        mid,
        Number.isInteger(startIndex) ? startIndex : undefined,
      );
      if (success) {
        handledSearchJumpRef.current = jumpKey;
      }
    };

    jumpToMessage();
  }, [location.search, selectedChat, chatDataLoaded, messagesLoaded]);

  useEffect(() => {
    chatSearchReqRef.current += 1;
    setChatSearchOpen(false);
    setChatSearchValue("");
    setChatSearchResults([]);
    setChatSearchIndex(0);
    setChatSearchLoading(false);
  }, [selectedChat?.id, selectedChat?.type]);

  useEffect(() => {
    if (!chatSearchOpen) return;
    requestAnimationFrame(() => {
      chatSearchInputRef.current?.focus();
    });
  }, [chatSearchOpen]);

  useEffect(() => {
    if (!chatSearchOpen || !selectedChat) return;

    const query = chatSearchValue.trim();
    if (query.length < 2) {
      chatSearchReqRef.current += 1;
      setChatSearchResults([]);
      setChatSearchIndex(0);
      setChatSearchLoading(false);
      return;
    }

    const reqId = ++chatSearchReqRef.current;
    const timer = setTimeout(async () => {
      setChatSearchLoading(true);
      try {
        const res = await wsClient.send({
          type: "messenger",
          action: "search_messages",
          target: {
            id: selectedChat.id,
            type: selectedChat.type,
          },
          value: query,
          offset: 0,
          limit: CHAT_SEARCH_LIMIT,
        });

        if (reqId !== chatSearchReqRef.current) return;

        if (res?.status === "success") {
          const results = Array.isArray(res.results) ? res.results : [];
          setChatSearchResults(results);
          setChatSearchIndex(0);

          if (results.length > 0) {
            await jumpToMessageByMid(results[0].mid, results[0].startIndex);
          }
        } else {
          setChatSearchResults([]);
          setChatSearchIndex(0);
        }
      } finally {
        if (reqId === chatSearchReqRef.current) {
          setChatSearchLoading(false);
        }
      }
    }, 260);

    return () => clearTimeout(timer);
  }, [chatSearchOpen, chatSearchValue, selectedChat?.id, selectedChat?.type]);

  const closeChatSearch = () => {
    chatSearchReqRef.current += 1;
    setChatSearchOpen(false);
    setChatSearchValue("");
    setChatSearchResults([]);
    setChatSearchIndex(0);
    setChatSearchLoading(false);
  };

  const moveChatSearch = async (direction: "next" | "prev") => {
    if (chatSearchResults.length < 1) return;

    const delta = direction === "next" ? 1 : -1;
    const nextIndex =
      (chatSearchIndex + delta + chatSearchResults.length) %
      chatSearchResults.length;
    const item = chatSearchResults[nextIndex];
    setChatSearchIndex(nextIndex);
    await jumpToMessageByMid(item.mid, item.startIndex);
  };

  const activeSearchMid =
    chatSearchResults.length > 0
      ? Number(chatSearchResults[chatSearchIndex]?.mid)
      : null;
  const activeSearchQuery = chatSearchOpen ? chatSearchValue.trim() : "";

  return (
    <div className="Chat-Container">
      <div className="Chat-Content">
        <div
          className={clsx("Chat", {
            "with-sidebar": emojiSidebarOpen,
          })}
        >
          <div className="Chat-Wallpaper">
            <img src={chatWallpaper()} alt="фыр" draggable={false} />
          </div>
          <TopBar
            chatDataLoaded={chatDataLoaded}
            chatData={selectedChat}
            openChatMenu={openChatMenu}
            isTyping={isTyping}
            isRecordingVoice={isRecordingVoice}
            isRecordingVideoCircle={isRecordingVideoCircle}
            groupTypingUsers={groupTypingUsers}
            groupRecordingVoiceUsers={groupRecordingVoiceUsers}
            groupRecordingVideoCircleUsers={groupRecordingVideoCircleUsers}
            onStartCall={handleStartCall}
            onStartGroupCall={handleStartGroupCall}
            onToggleSearch={() => {
              if (chatSearchOpen) {
                closeChatSearch();
              } else {
                setChatSearchOpen(true);
              }
            }}
            isSearchOpen={chatSearchOpen}
          />
          <AnimatePresence>
            {chatSearchOpen && (
              <motion.div
                className="UI-LG_Block Chat-SearchBar"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.14 }}
              >
                <input
                  ref={chatSearchInputRef}
                  type="search"
                  className="Chat-SearchInput"
                  placeholder={t("search")}
                  value={chatSearchValue}
                  onChange={(e) => setChatSearchValue(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={t("search")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (e.shiftKey) {
                        moveChatSearch("prev");
                      } else {
                        moveChatSearch("next");
                      }
                    }
                    if (e.key === "Escape") {
                      closeChatSearch();
                    }
                  }}
                />
                <div className="Chat-SearchCount">
                  {chatSearchValue.trim().length < 2
                    ? ""
                    : chatSearchLoading
                      ? t("load")
                      : chatSearchResults.length > 0
                        ? `${chatSearchIndex + 1}/${chatSearchResults.length}`
                        : "0"}
                </div>
                <button
                  className="Chat-SearchNav"
                  onClick={() => moveChatSearch("prev")}
                  disabled={chatSearchResults.length < 1}
                >
                  <I_ARROW_UP />
                </button>
                <button
                  className="Chat-SearchNav Down"
                  onClick={() => moveChatSearch("next")}
                  disabled={chatSearchResults.length < 1}
                >
                  <I_ARROW_UP />
                </button>
                <button className="Chat-SearchClose" onClick={closeChatSearch}>
                  <I_CLOSE />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <ChatView
            loadMoreRef={loadMoreRef}
            stopSendingFile={stopSendingFile}
            showLoadMore={showLoadMore}
            messages={messages}
            messagesLoaded={messagesLoaded}
            messagesScrollRef={messagesScrollRef}
            onReply={handleReply}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReaction={handleReaction}
            searchQuery={activeSearchQuery}
            highlightMid={activeSearchMid}
          />
          <AnimatePresence>
            {newMessagesCount > 0 && (
              <motion.button
                className="Chat-NewMessages"
                onClick={scrollToBottom}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.15 }}
              >
                ↓ {newMessagesCount} {getNewMessagesLabel(newMessagesCount)}
              </motion.button>
            )}
          </AnimatePresence>
          <BottomBar
            createTempMesID={createTempMesID}
            selectedChat={selectedChat}
            messageInputRef={messageInputRef}
            actionPanelOpen={actionPanelOpen}
            setActionPanelOpen={setActionPanelOpen}
            openChatMenu={openChatMenu}
            messageValue={messageValue}
            setMessageValue={setMessageValue}
            replyTo={replyTo}
            editingMessage={editingMessage}
            cancelReplyOrEdit={cancelReplyOrEdit}
            onMessageSent={scrollToBottom}
          />

          <AnimatePresence>
            {actionPanelOpen && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 200,
                  x: -200,
                  backdropFilter: "blur(0px)",
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  x: 0,
                  backdropFilter: "blur(6px)",
                }}
                exit={{
                  opacity: 0,
                  y: 200,
                  x: -200,
                  backdropFilter: "blur(0px)",
                }}
                transition={{ duration: 0.4 }}
                className="ActionPanel"
              >
                <div
                  onClick={() => {
                    setActionPanelOpen(false);
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    position: "absolute",
                  }}
                ></div>
                <div className="Buttons">
                  <label htmlFor="M-FileInput">
                    <I_ADD_FILE />
                    {t("select_file")}
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {!isMobile && chatMenuOpen && (
        <div
          className="Chat-RightMenu"
          style={{
            width: localStorage.getItem("emojiSidebarWidth") || "320px",
          }}
        >
          {chatMenuType === "emoji" && (
            <>
              <div className="Header">
                <div className="Title">{t("emoji_gallery")}</div>
              </div>
              <EmojiPicker
                isOpen={true}
                setIsOpen={() => {}}
                buttonRef={emojiButtonRef}
                inputRef={messageInputRef}
                onEmojiSelect={(emoji, selStart, selEnd) => {
                  setMessageValue(
                    (prev) =>
                      prev.slice(0, selStart) + emoji + prev.slice(selEnd),
                  );
                }}
                className="sidebar-emoji-picker"
              />
            </>
          )}
          {chatMenuType === "chat_meta" && chatDataLoaded && (
            <ChatMenu closeChatMenu={closeChatMenu} />
          )}
          <div
            className="Resize-Handle"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startWidth = parseInt(
                localStorage.getItem("emojiSidebarWidth") || "320",
              );

              const handleMouseMove = (moveEvent: MouseEvent) => {
                const newWidth = startWidth - (moveEvent.clientX - startX);
                const emojiPanel = document.querySelector(
                  ".Chat-RightMenu",
                ) as HTMLElement;

                if (emojiPanel && newWidth >= 250 && newWidth <= 500) {
                  emojiPanel.style.width = `${newWidth}px`;
                  localStorage.setItem("emojiSidebarWidth", `${newWidth}px`);
                }
              };

              const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
              };

              document.addEventListener("mousemove", handleMouseMove);
              document.addEventListener("mouseup", handleMouseUp);
            }}
          ></div>
        </div>
      )}
      {isMobile && chatMenuOpen && <ChatMenu closeChatMenu={closeChatMenu} />}
    </div>
  );
};

export default Chat;
