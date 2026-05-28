import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/System/Context/WebSocket';
import { Block, PartitionName, Button } from '@/UIKit';
import { I_CLOSE } from '../../../System/UI/IconPack';
import '../../../System/UI/Moderation.scss';
import { useTranslation } from 'react-i18next';

interface DashboardStats {
    period: string;
    reports: {
        total: number;
        pending: number;
        under_review: number;
        resolved: number;
        rejected: number;
    };
    punishments: {
        total: number;
        active: number;
        by_type: Array<{ type: string; count: number }>;
    };
    categories: Array<{ category: string; count: number; percentage: number }>;
    daily_activity: Array<{ date: string; reports_count: number; resolved_count: number }>;
    moderators: Array<{
        moderator_id: number;
        moderator_name: string;
        moderator_username: string;
        reports_handled: number;
        punishments_applied: number;
        last_activity: string;
    }>;
    system: {
        total_reports: number;
        total_punishments: number;
        total_actions: number;
        active_punishments: number;
    };
    response_time: number;
}

const LoadingSpinner = () => (
    <div className="loading-spinner">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="60" strokeDashoffset="15">
                <animateTransform attributeName="transform" attributeType="XML" type="rotate" dur="1s" from="0 12 12" to="360 12 12" repeatCount="indefinite" />
            </circle>
        </svg>
    </div>
);

const StatCard = ({ title, value, subtitle }: {
    title: string;
    value: string | number;
    subtitle?: string;
}) => (
    <Block className="dashboard-stat-card">
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </Block>
);

const ProgressBar = ({ value, max, color, label }: {
    value: number;
    max: number;
    color: string;
    label: string;
}) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;

    return (
        <div className="progress-bar-container">
            <div className="progress-bar-header">
                <span className="progress-label">{label}</span>
                <span className="progress-value">{value} ({percentage.toFixed(1)}%)</span>
            </div>
            <div className="progress-bar-track">
                <div
                    className="progress-bar-fill"
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                    }}
                />
            </div>
        </div>
    );
};

const ModerationDashboard = () => {
    const { wsClient } = useWebSocket();
    const { t } = useTranslation();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('7d');
    const [error, setError] = useState<string | null>(null);

    const loadStats = useCallback(async (selectedPeriod: string = period) => {
        try {
            setLoading(true);
            setError(null);

            const response = await wsClient.send({
                type: 'social',
                action: 'moderation/dashboard_stats',
                payload: { period: selectedPeriod }
            });

            if (response.status === 'success') {
                setStats(response);
            } else {
                setError(response.message || 'Ошибка загрузки статистики');
            }
        } catch (err) {
            console.error('Ошибка загрузки дашборда:', err);
            setError('Не удалось загрузить статистику');
        } finally {
            setLoading(false);
        }
    }, [wsClient, period]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const periodTabs = [
        { label: 'Сегодня', value: '1d' },
        { label: '7 дней', value: '7d' },
        { label: '30 дней', value: '30d' },
        { label: 'Все время', value: 'all' }
    ];

    if (loading) {
        return (
            <div className="dashboard-loading">
                <LoadingSpinner />
                <span>Загрузка статистики...</span>
            </div>
        );
    }

    if (error) {
        return (
            <Block className="dashboard-error">
                <I_CLOSE />
                <div>Ошибка: {error}</div>
                <Button
                    title="Попробовать снова"
                    onClick={() => loadStats()}
                />
            </Block>
        );
    }

    if (!stats) return null;

    return (
        <div className="moderation-dashboard">
            <div className="dashboard-header">
                <PartitionName name="Дашборд модерации" />
                <Block className="period-selector">
                    {periodTabs.map(tab => (
                        <button
                            key={tab.value}
                            className={`period-btn ${period === tab.value ? 'active' : ''}`}
                            onClick={() => {
                                setPeriod(tab.value);
                                loadStats(tab.value);
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </Block>
            </div>

            <div className="dashboard-stats-grid">
                <StatCard
                    title="Всего жалоб"
                    value={stats.reports.total}
                    subtitle={`За ${period === '1d' ? 'сегодня' : period === '7d' ? '7 дней' : period === '30d' ? '30 дней' : 'все время'}`}
                />
                <StatCard
                    title="На рассмотрении"
                    value={stats.reports.under_review}
                    subtitle={stats.reports.pending > 0 ? `+${stats.reports.pending} новых` : 'Новых нет'}
                />
                <StatCard
                    title="Решено"
                    value={stats.reports.resolved}
                    subtitle={`${Math.round((stats.reports.resolved / (stats.reports.total || 1)) * 100)}% от общего`}
                />
                <StatCard
                    title="Активные наказания"
                    value={stats.punishments.active}
                    subtitle={`Всего: ${stats.punishments.total}`}
                />
            </div>

            <div className="dashboard-main-grid">
                <Block className="dashboard-category-block">
                    <div className="block-title">Топ категории жалоб</div>
                    {stats.categories.length > 0 ? (
                        <div className="category-list">
                            {stats.categories.slice(0, 5).map((category, index) => (
                                <ProgressBar
                                    key={category.category}
                                    value={category.count}
                                    max={stats.categories[0]?.count || 1}
                                    color={index === 0 ? '#ef4444' : index === 1 ? '#f59e0b' : index === 2 ? '#3b82f6' : '#6b7280'}
                                    label={t(`report_reasons.${category.category}`)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">Нет данных за выбранный период</div>
                    )}
                </Block>

                <Block className="dashboard-moderators-block">
                    <div className="block-title">Активность модераторов</div>
                    {stats.moderators.length > 0 ? (
                        <div className="moderators-list">
                            {stats.moderators.slice(0, 5).map((moderator) => (
                                <div key={moderator.moderator_id} className="moderator-item">
                                    <div className="moderator-name">{moderator.moderator_name}</div>
                                    <div className="moderator-stats">
                                        <div>{moderator.reports_handled} жалоб</div>
                                        <div>{moderator.punishments_applied} наказаний</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">Нет активности за выбранный период</div>
                    )}
                </Block>
            </div>

            <Block className="dashboard-system-stats">
                <div className="block-title">Общая статистика системы</div>
                <div className="system-stats-grid">
                    <div className="system-stat">
                        <div className="stat-number">{stats.system.total_reports}</div>
                        <div className="stat-label">Всего жалоб</div>
                    </div>
                    <div className="system-stat">
                        <div className="stat-number">{stats.system.total_actions}</div>
                        <div className="stat-label">Действий модераторов</div>
                    </div>
                    <div className="system-stat">
                        <div className="stat-number">{stats.response_time}ч</div>
                        <div className="stat-label">Среднее время отклика</div>
                    </div>
                    <div className="system-stat">
                        <div className={`stat-number ${stats.system.active_punishments > 0 ? 'active' : 'inactive'}`}>
                            {stats.system.active_punishments}
                        </div>
                        <div className="stat-label">Активных наказаний</div>
                    </div>
                </div>
            </Block>
        </div>
    );
};

export default ModerationDashboard;
