import { useEffect, useState } from 'react';
import {
    I_CLOSE,
} from '@/System/UI/IconPack';
import { useTranslation } from 'react-i18next';
import { useModalsStore } from '@/Store/modalsStore';
import { useWebSocket } from '@/System/Context/WebSocket';
import { Button, MenuItems } from '@/UIKit';
import { DeviceTypes } from '@/Configs/DeviceTypes';

interface Session {
    id: string;
    device_type: number;
    device: string;
}

const Sessions = () => {
    const { openModal } = useModalsStore() as any;
    const { t } = useTranslation();
    const { wsClient } = useWebSocket();
    const [currentSession, setCurrentSession] = useState<Session | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);

    useEffect(() => {
        wsClient
            .send({
                type: 'social',
                action: 'auth/sessions/load',
            })
            .then((res) => {
                if (res.status === 'success') {
                    if (res.sessions && res.sessions.length > 0) {
                        setCurrentSession(res.current_session);
                        setSessions(
                            res.sessions.filter((session) => {
                                return (
                                    session &&
                                    res.current_session &&
                                    session.id !== res.current_session.id
                                );
                            }),
                        );
                    }
                } else if (res.status === 'error') {
                    openModal({
                        type: 'alert',
                        props: {
                            title: t('error'),
                            message: res.message,
                        },
                    });
                }
            });
    }, []);

    const deleteSession = (id) => {
        const deleteRequest = () => {
            wsClient
                .send({
                    type: 'social',
                    action: 'auth/sessions/delete',
                    session_id: id,
                })
                .then((res) => {
                    if (res.status === 'success') {
                        setSessions(
                            sessions.filter((session) => session && session.id !== id),
                        );
                    } else if (res.status === 'error') {
                        openModal({
                            type: 'alert',
                            props: {
                                title: t('error'),
                                message: res.message,
                            },
                        });
                    }
                });
        };

        openModal({
            type: 'query',
            props: {
                title: t('sessions_delete_title'),
                message: t('sessions_delete_text'),
                onConfirm: () => {
                    deleteRequest();
                },
            },
        });
    };

    const terminateAllSessions = () => {
        openModal({
            type: 'query',
            props: {
                title: t('sessions_delete_title'),
                message: t('clear_all_data_confirmation'),
                onConfirm: async () => {
                    try {
                        const sessionsToDelete = [...sessions];
                        let deletedCount = 0;

                        for (const session of sessionsToDelete) {
                            if (session && session.id) {
                                try {
                                    const res = await wsClient.send({
                                        type: 'social',
                                        action: 'auth/sessions/delete',
                                        session_id: session.id,
                                    });

                                    if (res.status === 'success') {
                                        deletedCount++;
                                    }
                                } catch (err) {
                                    console.error('Ошибка при удалении сессии:', err);
                                }
                            }
                        }

                        setSessions([]);

                        if (deletedCount > 0) {
                            const getSessionsText = (count) => {
                                const pluralRules = new Intl.PluralRules('ru-RU');
                                const forms = {
                                    one: 'сессия завершена',
                                    few: 'сессии завершено',
                                    many: 'сессий завершено',
                                };
                                return `${count} ${forms[pluralRules.select(count)]}`;
                            };

                            openModal({
                                type: 'alert',
                                props: {
                                    title: t('success'),
                                    message: getSessionsText(deletedCount),
                                },
                            });
                        } else {
                            openModal({
                                type: 'alert',
                                props: {
                                    title: t('error'),
                                    message: t('error_occurred'),
                                },
                            });
                        }
                    } catch (error) {
                        openModal({
                            type: 'alert',
                            props: {
                                title: t('error'),
                                message: t('error_occurred'),
                            },
                        });
                    }
                },
            },
        });
    };

    const HandleSession = ({ session, current }) => {
        if (!session) return null;

        return (
            <div className="UI-PB_C_Element Settings-Session">
                <div className="Icon">{DeviceTypes[session.device_type].icon}</div>
                <div className="Info">
                    <div className="DeviceType">{session.name ? session.name : DeviceTypes[session.device_type].name}</div>
                    <div className="Device">{session.client_name}</div>
                </div>
                {!current && (
                    <button
                        onClick={() => {
                            deleteSession(session.id);
                        }}
                    >
                        <I_CLOSE />
                    </button>
                )}
            </div>
        );
    };

    return (
        <>
            <img
                src="/static_sys/Images/All/Sessions.svg"
                className="UI-PB_Image"
                alt="фыр"
                draggable={false}
            />
            {currentSession && (
                <>
                    <div className="UI-PartitionName">{t('sessions_current')}</div>
                    <MenuItems>
                        <HandleSession session={currentSession} current={true} />
                    </MenuItems>
                </>
            )}
            {sessions && sessions.length > 0 && (
                <>
                    <div className="UI-PartitionName">{t('sessions_all')}</div>
                    <MenuItems>
                        {sessions
                            .filter((session) => session && session.id)
                            .sort((a, b) => String(a.id).localeCompare(String(b.id)))
                            .map((session) => (
                                <HandleSession
                                    key={session.id}
                                    session={session}
                                    current={false}
                                />
                            ))}
                    </MenuItems>
                </>
            )}

            {sessions && sessions.length > 0 && (
                <div className="Footer">
                    <Button
                        className="Sessions-TerminateAll"
                        onClick={terminateAllSessions}
                        style={{
                            width: '100%',
                            background: 'rgb(255 93 93)',
                            color: '#fff',
                        }}
                    >
                        {t('sessions_terminate_all')}
                    </Button>
                </div>
            )}
        </>
    );
};

export default Sessions;
