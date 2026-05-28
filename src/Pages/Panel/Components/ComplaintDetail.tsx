import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { I_CHECKMARK, I_CLOSE, I_CLOCK } from '../../../System/UI/IconPack';
import { useWebSocket } from '@/System/Context/WebSocket';
import { useModalsStore } from '@/Store/modalsStore';
import { useTranslation } from 'react-i18next';
import Post from '../../../Components/Post';
import PunishmentMenu from '../Modals/PunishmentMenu';
import RejectModal from '../Modals/RejectModal';
import CommentComponent from '../../../Components/Comments/Components/Comment';
import { Avatar, Block, Button } from '@/UIKit';
import UserContentAudio from '../../../Components/Handlers/UserContent/UserContentAudio';
import ModerationHistory from './ModerationHistory';

const LoadingSpinner = () => (
    <div className="content-loading">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="60" strokeDashoffset="15">
                <animateTransform attributeName="transform" attributeType="XML" type="rotate" dur="1s" from="0 12 12" to="360 12 12" repeatCount="indefinite" />
            </circle>
        </svg>
        <span>Загрузка контента...</span>
    </div>
);

const getStatusColor = (status: string) => {
    switch (status) {
        case 'resolved': return '#22c55e';
        case 'rejected': return '#ef4444';
        case 'under_review': return '#f59e0b';
        default: return '#6b7280';
    }
};

const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateString;
    }
};

const ComplaintDetail = ({ complaint, updateComplaintStatus, setStatusTab, viewOnly = false }) => {
    const { wsClient } = useWebSocket();
    const { openModal } = useModalsStore();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [postData, setPostData] = useState(null);
    const [commentData, setCommentData] = useState<any>(null);
    const [songData, setSongData] = useState<any>(null);
    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [contentError, setContentError] = useState<string | null>(null);

    const targetType = complaint.postId ? 'post' :
        complaint.commentId ? 'comment' :
            complaint.songId ? 'music' :
                complaint.target_username ? 'profile' : 'unknown';

    const fetchContent = async () => {
        setLoading(true);
        setContentError(null);

        try {
            if (complaint.postId) {
                const res = await wsClient.send({
                    type: 'social',
                    action: 'load_post',
                    pid: complaint.postId
                });
                if (res?.status === 'success') {
                    setPostData(res.post);
                } else {
                    throw new Error('Пост не найден или удален');
                }
            }

            if (complaint.commentId) {
                try {
                    const res = await wsClient.send({
                        type: 'social',
                        action: 'load_comment',
                        comment_id: complaint.commentId
                    });
                    if (res?.status === 'success') {
                        setCommentData(res.comment);
                    } else {
                        throw new Error('Комментарий не найден');
                    }
                } catch {
                    const res = await wsClient.send({
                        type: 'social',
                        action: 'load_comments',
                        start_index: 0
                    });
                    if (res?.status === 'success' && res.comments?.length) {
                        setCommentData(res.comments[0]);
                    } else {
                        throw new Error('Комментарий не найден');
                    }
                }
            }

            if (complaint.songId) {
                try {
                    const res = await wsClient.send({
                        type: 'social',
                        action: 'load_song',
                        song_id: complaint.songId
                    });
                    if (res?.status === 'success') {
                        setSongData(res.song);
                    } else {
                        throw new Error('Трек не найден');
                    }
                } catch {
                    const res = await wsClient.send({
                        type: 'social',
                        action: 'load_songs',
                        songs_type: 'latest',
                        start_index: 0
                    });
                    if (res?.status === 'success' && res.songs?.length) {
                        setSongData(res.songs[0]);
                    } else {
                        throw new Error('Трек не найден');
                    }
                }
            }

            if (complaint.target_username) {
                const res = await wsClient.send({
                    type: 'social',
                    action: 'get_profile',
                    username: complaint.target_username
                });
                if (res?.status === 'success') {
                    setProfileData(res.data);
                } else {
                    throw new Error('Профиль не найден');
                }
            }
        } catch (error: any) {
            console.error('Ошибка загрузки контента:', error);
            setContentError(error?.message || 'Не удалось загрузить контент');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (targetType !== 'unknown') {
            fetchContent();
        }
    }, [complaint.postId, complaint.commentId, complaint.songId, complaint.target_username]);

    const getTargetTitle = () => {
        switch (targetType) {
            case 'post': return `Пост #${complaint.postId}`;
            case 'comment': return `Комментарий #${complaint.commentId}`;
            case 'music': return `Трек #${complaint.songId}`;
            case 'profile': return `Профиль @${complaint.target_username}`;
            default: return 'Неизвестный контент';
        }
    };

    const getProfileDisplay = () => {
        return (
            <>
                <span>Профиль </span>
                <button
                    onClick={handleProfileClick}
                    className="complaint-profile-link"
                >
                    @{complaint.target_username}
                </button>
            </>
        );
    };

    const handleProfileClick = () => {
        if (complaint.target_username) {
            navigate(`/profile/${complaint.target_username}`);
            openModal({ type: 'close' });
        }
    };

    const renderContent = () => {
        if (loading) {
            return <LoadingSpinner />;
        }

        if (contentError) {
            return (
                <div className="content-error">
                    <I_CLOSE />
                    <span>{contentError}</span>
                </div>
            );
        }

        switch (targetType) {
            case 'post':
                return postData ? <Post post={postData} /> : null;
            case 'comment':
                return commentData ? (
                    <CommentComponent
                        comment={commentData}
                        onReplyClick={() => { }}
                        onDelete={() => { }}
                        isInModal={false}
                    />
                ) : null;
            case 'music':
                return songData ? (
                    <UserContentAudio song={songData} canPay={true} className="UI-Block" />
                ) : null;
            case 'profile':
                return profileData ? (
                    <Block className="complaint-profile-card">
                        <Avatar avatar={profileData.avatar} name={profileData.name} size={40} />
                        <div className="profile-info">
                            <div className="profile-name">{profileData.name}</div>
                            <div className="profile-username">@{profileData.username}</div>
                        </div>
                    </Block>
                ) : null;
            default:
                return (
                    <div className="violation-text">
                        {complaint.violation || 'Контент недоступен'}
                    </div>
                );
        }
    };

    return (
        <div className="ComplaintModal">
            <Block className="complaint-info">
                <div className="info-item">
                    <strong>Автор жалобы:</strong> {complaint.author}
                </div>
                <div className="info-item">
                    <strong>Дата создания:</strong> {formatDate(complaint.created)}
                </div>
                <div className="info-item">
                    <strong>Категория:</strong> {complaint.reason}
                </div>
                {complaint.text && (
                    <div className="info-item">
                        <strong>Описание:</strong> {complaint.text}
                    </div>
                )}
            </Block>

            <div className="complaint-target">
                <span>Жалоба на: </span>
                {targetType === 'profile' ? (
                    getProfileDisplay()
                ) : (
                    <span>{getTargetTitle()}</span>
                )}
                <span className="status-badge" style={{
                    color: getStatusColor(complaint.status),
                    backgroundColor: `${getStatusColor(complaint.status)}15`,
                }}>
                    {complaint.status === 'resolved' ? 'Решена' :
                        complaint.status === 'rejected' ? 'Отклонена' :
                            complaint.status === 'under_review' ? 'На рассмотрении' : 'Ожидает'}
                </span>
            </div>

            <Block className="violation-content">
                <strong>Содержимое жалобы:</strong>
                <div className="violation-body">
                    {renderContent()}
                </div>
            </Block>

            {!viewOnly && (complaint.status === 'unanswered' || complaint.status === 'pending') && (
                <div className="moderation-actions">
                    <Button
                        title="Взять на рассмотрение"
                        onClick={async () => {
                            try {
                                await updateComplaintStatus(complaint.id, 'under_review');
                                openModal({ type: 'close' });
                            } catch (error) {
                                console.error('Ошибка при взятии жалобы:', error);
                            }
                        }}
                    />

                    <button
                        className="action-btn history-btn"
                        onClick={() => {
                            openModal({
                                type: 'routed',
                                props: {
                                    title: `История жалобы #${complaint.id}`,
                                    children: <ModerationHistory reportId={complaint.id} />
                                }
                            });
                        }}
                    >
                        <I_CLOCK />
                        Показать историю
                    </button>
                </div>
            )}

            {!viewOnly && complaint.status === 'under_review' && (
                <div className="moderation-actions">
                    <button
                        className="action-btn approve-btn"
                        onClick={() => {
                            openModal({
                                type: 'routed',
                                props: {
                                    title: t('moderation.punishment_user'),
                                    children: (
                                        <PunishmentMenu
                                            complaint={complaint}
                                            onClose={() => openModal({ type: 'close' })}
                                            onApply={(text) => updateComplaintStatus(complaint.id, 'resolved', text)}
                                        />
                                    )
                                }
                            });
                        }}
                    >
                        <I_CHECKMARK />
                        {t('moderation.punish_user')}
                    </button>
                    <button
                        className="action-btn reject-btn"
                        onClick={() => {
                            openModal({
                                type: 'routed',
                                props: {
                                    title: 'Отклонение жалобы',
                                    children: (
                                        <RejectModal
                                            complaint={complaint}
                                            onClose={() => openModal({ type: 'close' })}
                                            onReject={(text) => updateComplaintStatus(complaint.id, 'rejected', text)}
                                        />
                                    )
                                }
                            });
                        }}
                    >
                        <I_CLOSE />
                        Отклонить жалобу
                    </button>

                    <button
                        className="action-btn history-btn"
                        onClick={() => {
                            openModal({
                                type: 'routed',
                                props: {
                                    title: `История жалобы #${complaint.id}`,
                                    children: <ModerationHistory reportId={complaint.id} />
                                }
                            });
                        }}
                    >
                        <I_CLOCK />
                        Показать историю
                    </button>
                </div>
            )}

            {(complaint.status === 'resolved' || complaint.status === 'rejected') && (
                <>
                    <div className="status-info">
                        <div className={`status-badge ${complaint.status}`}>
                            {complaint.status === 'resolved' ? <I_CHECKMARK /> : <I_CLOSE />}
                            {complaint.status === 'resolved' ? 'Жалоба решена' : 'Жалоба отклонена'}
                        </div>
                        {complaint.resolution && (
                            <Block className="resolution-info">
                                <strong>
                                    {complaint.status === 'resolved' ? 'Решение:' : 'Причина отклонения:'}
                                </strong>
                                <div className="resolution-text">{complaint.resolution}</div>
                                {complaint.updated_at && (
                                    <div className="resolved-date">
                                        {complaint.status === 'resolved' ? 'Решено:' : 'Отклонено:'} {formatDate(complaint.updated_at)}
                                    </div>
                                )}
                            </Block>
                        )}
                    </div>

                    <div className="moderation-actions">
                        <button
                            className="action-btn history-btn"
                            onClick={() => {
                                openModal({
                                    type: 'routed',
                                    props: {
                                        title: `История жалобы #${complaint.id}`,
                                        children: <ModerationHistory reportId={complaint.id} />
                                    }
                                });
                            }}
                        >
                            <I_CLOCK />
                            Показать историю
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ComplaintDetail;
