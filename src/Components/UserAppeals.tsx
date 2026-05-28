import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../System/Context/WebSocket';
import { useModalsStore } from '../Store/modalsStore';
import { I_CHECKMARK, I_CLOSE, I_CLOCK, I_WARNING } from '../System/UI/IconPack';
import { Block, Button, Textarea } from '../UIKit';
import '../System/UI/UserAppeals.scss';

const UserAppeals = () => {
    const { wsClient } = useWebSocket();
    const { openModal } = useModalsStore();

    const [punishments, setPunishments] = useState<any[]>([]);
    const [appeals, setAppeals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('punishments'); // punishments | appeals

    const loadData = useCallback(async () => {
        try {
            setLoading(true);

            // Загружаем наказания
            const punishResponse = await wsClient.send({
                type: 'social',
                action: 'moderation/load_my_punishments'
            });

            if (punishResponse?.status === 'success') {
                setPunishments(punishResponse.punishments || []);
            }

            // Загружаем апелляции
            const appealsResponse = await wsClient.send({
                type: 'social',
                action: 'moderation/appeals/load_user'
            });

            if (appealsResponse?.status === 'success') {
                setAppeals(appealsResponse.appeals || []);
            }
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        } finally {
            setLoading(false);
        }
    }, [wsClient]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAppealClick = (punishment: any) => {
        if (punishment.active_appeal_count > 0) {
            openModal({
                type: 'alert',
                props: {
                    title: 'Апелляция уже подана',
                    message: 'На это наказание уже подана апелляция. Дождитесь решения модератора.'
                }
            });
            return;
        }

        openModal({
            type: 'routed',
            props: {
                title: 'Подать апелляцию на наказание',
                children: (
                    <AppealForm
                        punishment={punishment}
                        onSuccess={() => {
                            openModal({ type: 'close' });
                            loadData();
                        }}
                    />
                )
            }
        });
    };

    const getPunishmentText = (type: string) => {
        const types: Record<string, string> = {
            'restrict_posts': 'Ограничение на публикацию постов',
            'restrict_comments': 'Ограничение на комментарии',
            'restrict_chat': 'Ограничение на создание чатов',
            'restrict_music': 'Ограничение на загрузку музыки',
            'ban': 'Блокировка аккаунта',
            'warn': 'Предупреждение'
        };
        return types[type] || type;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <I_CLOCK />;
            case 'under_review': return <I_WARNING />;
            case 'approved': return <I_CHECKMARK />;
            case 'rejected': return <I_CLOSE />;
            default: return null;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#f59e0b';
            case 'under_review': return '#3b82f6';
            case 'approved': return '#10b981';
            case 'rejected': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getStatusText = (status: string) => {
        const texts: Record<string, string> = {
            pending: 'Ожидает рассмотрения',
            under_review: 'На рассмотрении',
            approved: 'Одобрена',
            rejected: 'Отклонена'
        };
        return texts[status] || status;
    };

    if (loading) {
        return (
            <Block className="user-appeals-loading">
                <div className="spinner">⌛</div>
                <span>Загрузка данных...</span>
            </Block>
        );
    }

    return (
        <div className="UserAppeals">
            <div className="appeals-tabs">
                <button
                    className={`tab-btn ${activeTab === 'punishments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('punishments')}
                >
                    Мои наказания ({punishments.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'appeals' ? 'active' : ''}`}
                    onClick={() => setActiveTab('appeals')}
                >
                    Мои апелляции ({appeals.length})
                </button>
            </div>

            {activeTab === 'punishments' && (
                <div className="appeals-content">
                    {punishments.length === 0 ? (
                        <Block className="empty-state">
                            <div className="empty-icon">✨</div>
                            <div className="empty-text">У вас нет активных наказаний</div>
                        </Block>
                    ) : (
                        <div className="punishments-list">
                            {punishments.map((punishment) => (
                                <Block key={punishment.id} className="punishment-card">
                                    <div className="punishment-header">
                                        <div className="punishment-type">
                                            {getPunishmentText(punishment.type)}
                                        </div>
                                        <div className="punishment-status">
                                            {punishment.is_active ? (
                                                <span className="badge active">Активно</span>
                                            ) : (
                                                <span className="badge inactive">Завершено</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="punishment-reason">
                                        <strong>Причина:</strong>
                                        <p>{punishment.reason}</p>
                                    </div>

                                    <div className="punishment-details">
                                        <div className="detail">
                                            <span className="label">Начало:</span>
                                            <span className="value">{new Date(punishment.start_date).toLocaleString('ru-RU')}</span>
                                        </div>
                                        {punishment.end_date && (
                                            <div className="detail">
                                                <span className="label">Окончание:</span>
                                                <span className="value">{new Date(punishment.end_date).toLocaleString('ru-RU')}</span>
                                            </div>
                                        )}
                                        {punishment.duration_hours && (
                                            <div className="detail">
                                                <span className="label">Длительность:</span>
                                                <span className="value">{punishment.duration_hours} часов</span>
                                            </div>
                                        )}
                                    </div>

                                    {punishment.moderator && (
                                        <div className="punishment-moderator">
                                            Выдано модератором: <strong>@{punishment.moderator.username}</strong>
                                        </div>
                                    )}

                                    <div className="punishment-actions">
                                        <Button
                                            title={punishment.active_appeal_count > 0 ? 'Апелляция уже подана' : 'Подать апелляцию'}
                                            onClick={() => handleAppealClick(punishment)}
                                            isActive={punishment.active_appeal_count === 0}
                                        />
                                    </div>
                                </Block>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'appeals' && (
                <div className="appeals-content">
                    {appeals.length === 0 ? (
                        <Block className="empty-state">
                            <div className="empty-icon">📝</div>
                            <div className="empty-text">У вас нет апелляций</div>
                        </Block>
                    ) : (
                        <div className="appeals-list">
                            {appeals.map((appeal) => (
                                <Block key={appeal.id} className="appeal-card">
                                    <div className="appeal-header">
                                        <div className="appeal-type">
                                            Апелляция на {appeal.restriction_type}
                                        </div>
                                        <div
                                            className="appeal-status"
                                            style={{ color: getStatusColor(appeal.status) }}
                                        >
                                            {getStatusIcon(appeal.status)}
                                            <span>{getStatusText(appeal.status)}</span>
                                        </div>
                                    </div>

                                    <div className="appeal-reason">
                                        <strong>Моя причина:</strong>
                                        <p>{appeal.reason}</p>
                                    </div>

                                    {appeal.response && (
                                        <div className="appeal-response">
                                            <strong>Ответ модератора:</strong>
                                            <p>{appeal.response}</p>
                                            {appeal.reviewer && (
                                                <div className="reviewer">
                                                    Рассмотрел: @{appeal.reviewer.username}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="appeal-dates">
                                        <div className="date">
                                            <span className="label">Подана:</span>
                                            <span className="value">{new Date(appeal.created_at).toLocaleString('ru-RU')}</span>
                                        </div>
                                        {appeal.reviewed_at && (
                                            <div className="date">
                                                <span className="label">Рассмотрена:</span>
                                                <span className="value">{new Date(appeal.reviewed_at).toLocaleString('ru-RU')}</span>
                                            </div>
                                        )}
                                    </div>
                                </Block>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const AppealForm = ({ punishment, onSuccess }) => {
    const { wsClient } = useWebSocket();
    const { openModal } = useModalsStore();
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!reason.trim() || reason.trim().length < 10) {
            openModal({
                type: 'alert',
                props: {
                    title: 'Ошибка',
                    message: 'Описание апелляции должно быть минимум 10 символов'
                }
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await wsClient.send({
                type: 'social',
                action: 'moderation/appeals/send',
                payload: {
                    punishment_id: punishment.id,
                    reason: reason.trim()
                }
            });

            if (response?.status === 'success') {
                openModal({
                    type: 'alert',
                    props: {
                        title: '✅ Апелляция подана',
                        message: 'Ваша апелляция успешно отправлена. Модераторы рассмотрят её в течение обычного времени.'
                    }
                });
                onSuccess();
            } else {
                openModal({
                    type: 'alert',
                    props: {
                        title: 'Ошибка',
                        message: response?.message || 'Не удалось подать апелляцию'
                    }
                });
            }
        } catch (error) {
            console.error('Ошибка:', error);
            openModal({
                type: 'alert',
                props: {
                    title: 'Ошибка',
                    message: 'Не удалось подать апелляцию'
                }
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="AppealForm">
            <Block className="appeal-info">
                <div className="info-item">
                    <strong>Тип наказания:</strong>
                    <span>{punishment.type}</span>
                </div>
                <div className="info-item">
                    <strong>Причина наказания:</strong>
                    <span>{punishment.reason}</span>
                </div>
            </Block>

            <div className="appeal-input">
                <label>Описание апелляции (минимум 10 символов):</label>
                <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Объясните, почему вы считаете наказание несправедливым или почему оно должно быть отменено..."
                    maxLength={2000}
                />
                <div className="char-count">
                    {reason.length}/2000
                </div>
            </div>

            <div className="appeal-actions">
                <Button
                    title={isSubmitting ? 'Отправка...' : 'Подать апелляцию'}
                    onClick={handleSubmit}
                    isActive={!isSubmitting && reason.trim().length >= 10}
                />
                <Button
                    title="Отмена"
                    onClick={() => openModal({ type: 'close' })}
                    isActive={!isSubmitting}
                />
            </div>
        </div>
    );
};

export default UserAppeals;
