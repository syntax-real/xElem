import { useTranslation } from 'react-i18next';
import { HandleTimeAge } from '../../../System/Elements/Handlers';
import { I_CHECKMARK, I_CLOCK, I_CLOSE, I_WARNING } from '../../../System/UI/IconPack';

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'resolved': return <I_CHECKMARK />;
        case 'rejected': return <I_CLOSE />;
        case 'under_review': return <I_CLOCK />;
        default: return <I_WARNING />;
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'resolved': return '#4CAF50';
        case 'rejected': return '#F44336';
        case 'under_review': return '#FF9800'
        default: return 'var(--TEXT_COLOR)';
    }
};

const getStatusText = (status: string) => {
    switch (status) {
        case 'resolved': return 'Решена';
        case 'rejected': return 'Отклонена';
        case 'under_review': return 'На рассмотрении';
        case 'pending': return 'Ожидает';
        default: return 'Неизвестно';
    }
};

const getTargetTitle = (complaint: any) => {
    const { target_type, target_id } = complaint;

    switch (target_type) {
        case 'post': return `Пост #${target_id}`;
        case 'comment': return `Комментарий #${target_id}`;
        case 'music': return `Трек #${target_id}`;
        case 'user': return `Пользователь #${target_id}`;
        case 'channel': return `Канал #${target_id}`;
        default: return 'Контент';
    }
};

const getAuthorInfo = (author: any) => {
    if (typeof author === 'string') return author;
    if (author?.username) return `@${author.username}`;
    if (author?.name) return author.name;
    return 'Неизвестен';
};

type ComplaintsListProps = {
    complaints: any[];
    onSelect: (complaint: any) => void;
};

const ComplaintsList: React.FC<ComplaintsListProps> = ({ complaints, onSelect }) => {
    const { t } = useTranslation();

    if (complaints.length === 0) {
        return (
            <div className="empty-state">
                <I_WARNING />
                <div style={{ fontSize: '1.2rem' }}>Жалоб нет</div>
                <div style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: 5 }}>В этой категории пока нет жалоб для рассмотрения</div>
            </div>
        );
    }

    return (
        <>
            {complaints.map((complaint) => (
                <button
                    key={complaint.id}
                    className="complaint-item"
                    onClick={() => onSelect(complaint)}
                >
                    <div
                        className="status-icon"
                        style={{ color: getStatusColor(complaint.status) }}
                    >
                        {getStatusIcon(complaint.status)}
                    </div>

                    <div className="complaint-content">
                        <div className="complaint-header">
                            <span>{getTargetTitle(complaint)}</span>
                            <span style={{
                                color: getStatusColor(complaint.status),
                                backgroundColor: `${getStatusColor(complaint.status)}15`
                            }}>
                                {getStatusText(complaint.status)}
                            </span>
                        </div>

                        <div className="complaint-details">
                            <span>{t(`report_reasons.${complaint.category}`)}</span>
                            {complaint.message && (
                                <span>
                                    — {complaint.message.length > 50
                                        ? complaint.message.slice(0, 50) + '...'
                                        : complaint.message}
                                </span>
                            )}
                        </div>

                        <div className="complaint-meta">
                            <span>от {getAuthorInfo(complaint.author)}</span>
                            <span>•</span>
                            <span><HandleTimeAge inputDate={complaint.created_at} /></span>
                            {complaint.updated_at && complaint.status !== 'pending' && (
                                <>
                                    <span>•</span>
                                    <span>обновлено {<HandleTimeAge inputDate={complaint.updated_at} />}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="complaint-id">
                        #{complaint.id}
                    </div>
                </button>
            ))}
        </>
    );
};

export default ComplaintsList; 