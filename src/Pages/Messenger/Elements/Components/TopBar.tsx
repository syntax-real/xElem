import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../System/Hooks/useAuth';
import { I_PHONE, I_SEARCH, I_VIDEO } from '../../../../System/UI/IconPack';
import { useNavigate } from 'react-router-dom';
import { Avatar, BackButton, Bubble, SavesAvatar } from '../../../../UIKit';
import { AnimatePresence, motion } from 'framer-motion';

const HandleUserStatus = ({ status }) => {
    const { t } = useTranslation();
    const [active, setActive] = useState(false);
    const [text, setText] = useState('');

    useEffect(() => {
        switch (status) {
            case 'online':
                setActive(true);
                setText(t('online'));
                break;
            case 'offline':
                setActive(false);
                setText(t('offline'));
                break;
            default:
                setActive(false);
                setText(t('chat_status_hz'));
        }
    }, [status]);

    return (
        <div
            className="Chat-Status"
            style={active ? { color: 'var(--ACCENT_COLOR)' } : {}}
        >
            {text}
        </div>
    );
};

const buildGroupStatusParts = (
    typingUsers: Map<number, string>,
    voiceUsers: Map<number, string>,
    videoUsers: Map<number, string>,
    t: (key: string) => string,
): { text: string; key: string } | null => {
    const actions: { uid: number; name: string; action: string }[] = [];
    const seen = new Set<number>();

    if (videoUsers) {
        videoUsers.forEach((name, uid) => {
            if (!seen.has(uid)) {
                seen.add(uid);
                actions.push({ uid, name, action: t('recording_video_circle') });
            }
        });
    }
    if (voiceUsers) {
        voiceUsers.forEach((name, uid) => {
            if (!seen.has(uid)) {
                seen.add(uid);
                actions.push({ uid, name, action: t('recording_voice') });
            }
        });
    }
    if (typingUsers) {
        typingUsers.forEach((name, uid) => {
            if (!seen.has(uid)) {
                seen.add(uid);
                actions.push({ uid, name, action: t('typing') });
            }
        });
    }

    if (actions.length === 0) return null;

    const grouped = new Map<string, string[]>();
    for (const a of actions) {
        const list = grouped.get(a.action) || [];
        list.push(a.name);
        grouped.set(a.action, list);
    }

    const parts: string[] = [];
    for (const [action, names] of grouped) {
        if (names.length === 1) {
            parts.push(`${names[0]} ${action}`);
        } else if (names.length === 2) {
            parts.push(`${names[0]} и ${names[1]} ${action}`);
        } else {
            parts.push(`${names[0]} и ещё ${names.length - 1} ${action}`);
        }
    }

    return {
        text: parts.join(', '),
        key: `group_${actions.map((a) => a.uid).join('_')}`,
    };
};

const plural = (n: number, one: string, few: string, many: string) => {
    const mod100 = n % 100;
    const mod10 = n % 10;
    if (mod100 > 10 && mod100 < 20) return many;
    if (mod10 > 1 && mod10 < 5) return few;
    if (mod10 === 1) return one;
    return many;
};

const TopBar = ({
    chatDataLoaded,
    chatData,
    openChatMenu,
    isTyping,
    isRecordingVoice,
    isRecordingVideoCircle,
    groupTypingUsers,
    groupRecordingVoiceUsers,
    groupRecordingVideoCircleUsers,
    onStartCall,
    onStartGroupCall,
    onToggleSearch,
    isSearchOpen,
}: any) => {
    const { t } = useTranslation();
    const { accountData } = useAuth();
    const navigate = useNavigate();

    const close = () => {
        navigate('/chat');
    };

    const open = () => {
        openChatMenu('chat_meta');
    };

    return (
        <div className="Chat-TopBar">
            <BackButton onClick={close} />
            <Bubble>
                <div className="Chat-TB_Data">
                    <div className="Chat-Name" onClick={open}>
                        {chatDataLoaded ? (
                            <div className="Text">
                                {accountData.id === chatData?.user_data?.id
                                    ? t('chat_fav')
                                    : chatData?.user_data?.name}
                            </div>
                        ) : (
                            <div
                                className="UI-PRELOAD"
                                style={{ width: '100px', height: '15px' }}
                            ></div>
                        )}
                    </div>
                    {chatDataLoaded ? (
                        accountData.id !== chatData?.user_data?.id && (
                            <AnimatePresence mode="wait">
                                {(() => {
                                    const isGroup = chatData.type === 1;

                                    const activeStatus = isGroup
                                        ? buildGroupStatusParts(
                                            groupTypingUsers,
                                            groupRecordingVoiceUsers,
                                            groupRecordingVideoCircleUsers,
                                            t,
                                        )
                                        : isRecordingVideoCircle
                                            ? {
                                                key: 'recording_video',
                                                text: t('recording_video_circle'),
                                            }
                                            : isRecordingVoice
                                                ? {
                                                    key: 'recording',
                                                    text: t('recording_voice'),
                                                }
                                                : isTyping
                                                    ? { key: 'typing', text: t('typing') }
                                                    : null;

                                    if (activeStatus) {
                                        return (
                                            <motion.div
                                                key={activeStatus.key}
                                                className="Chat-Typing"
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                transition={{ duration: 0.15 }}
                                            >
                                                <span className="Chat-Typing-Text">
                                                    {activeStatus.text}
                                                    <span className="Chat-Typing-Dot">
                                                        .
                                                    </span>
                                                    <span className="Chat-Typing-Dot">
                                                        .
                                                    </span>
                                                    <span className="Chat-Typing-Dot">
                                                        .
                                                    </span>
                                                </span>
                                            </motion.div>
                                        );
                                    }

                                    return (
                                        <motion.div
                                            key="status"
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 4 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            {isGroup ? (
                                                <div className="Chat-Status">
                                                    {chatData?.members_count
                                                        ? `${chatData.members_count} ${plural(chatData.members_count, t('member_one'), t('member_few'), t('member_many'))}`
                                                        : t('members')}
                                                </div>
                                            ) : (
                                                <HandleUserStatus
                                                    status={chatData?.user_data?.status}
                                                />
                                            )}
                                        </motion.div>
                                    );
                                })()}
                            </AnimatePresence>
                        )
                    ) : (
                        <div className="Chat-Status">
                            <div
                                className="UI-PRELOAD"
                                style={{ width: '80px', height: '10px' }}
                            ></div>
                        </div>
                    )}
                </div>
            </Bubble>
            <Bubble>
                <div className="TopBar-Actions">
                    {chatDataLoaded && (
                        <button
                            className={`TopBar-CallBtn ${isSearchOpen ? 'is-active' : ''}`}
                            onClick={() => onToggleSearch?.()}
                            title={t('search')}
                        >
                            <I_SEARCH />
                        </button>
                    )}
                    {chatDataLoaded &&
                        accountData.id !== chatData?.user_data?.id &&
                        chatData?.type === 0 && (
                            <>
                                <button
                                    className="TopBar-CallBtn"
                                    onClick={() => onStartCall?.('audio')}
                                    title="Аудиозвонок"
                                >
                                    <I_PHONE />
                                </button>
                                <button
                                    className="TopBar-CallBtn"
                                    onClick={() => onStartCall?.('video')}
                                    title="Видеозвонок"
                                >
                                    <I_VIDEO />
                                </button>
                            </>
                        )}
                    {chatDataLoaded && chatData?.type === 1 && (
                        <>
                            <button
                                className="TopBar-CallBtn"
                                onClick={() => onStartGroupCall?.('audio')}
                                title="Аудиозвонок"
                            >
                                <I_PHONE />
                            </button>
                            <button
                                className="TopBar-CallBtn"
                                onClick={() => onStartGroupCall?.('video')}
                                title="Видеозвонок"
                            >
                                <I_VIDEO />
                            </button>
                        </>
                    )}
                    {chatDataLoaded ? (
                        accountData.id === chatData?.user_data?.id ? (
                            <SavesAvatar size={40} />
                        ) : (
                            <Avatar
                                avatar={chatData.user_data.avatar}
                                name={chatData.user_data.name}
                                size={40}
                                onClick={open}
                            />
                        )
                    ) : (
                        <div className="Avatar">
                            <div className="UI-PRELOAD"></div>
                        </div>
                    )}
                </div>
            </Bubble>
        </div>
    );
};

export default TopBar;
