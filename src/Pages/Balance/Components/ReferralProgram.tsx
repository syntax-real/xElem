import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HandleTimeAge } from '../../../System/Elements/Handlers';
import { useWebSocket } from '@/System/Context/WebSocket';
import { Avatar, Block, Button, CopyInput } from '@/UIKit';
import { LineSpinner } from 'ldrs/react';

const ReferralProgram = () => {
    const { t } = useTranslation();
    const { wsClient } = useWebSocket();
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [dashboard, setDashboard] = useState<any>(null);
    const [loadError, setLoadError] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [startIndex, setStartIndex] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const loadDashboard = async () => {
        const res = await wsClient.send({
            type: 'social',
            action: 'referral/load',
        });

        if (res.status === 'success') {
            setDashboard(res);
            setLoadError('');
        } else {
            setLoadError(res.message || t('error_occurred'));
        }
    };

    const loadHistory = async (si = 0) => {
        const res = await wsClient.send({
            type: 'social',
            action: 'referral/history',
            payload: {
                start_index: si,
                limit: 25,
            },
        });

        if (res.status !== 'success') {
            return [];
        }

        return res.history || [];
    };

    const loadMore = async () => {
        if (isLoadingMore || !hasMore) {
            return;
        }

        setIsLoadingMore(true);
        const rows = await loadHistory(startIndex);
        setHistory((prev) => [...prev, ...rows]);
        setStartIndex((prev) => prev + rows.length);
        setHasMore(rows.length >= 25);
        setIsLoadingMore(false);
    };

    useEffect(() => {
        Promise.all([loadDashboard(), loadHistory(0)]).then(([, rows]) => {
            setHistory(rows);
            setStartIndex(rows.length);
            setHasMore(rows.length >= 25);
            setIsLoaded(true);
        });
    }, []);

    if (!isLoaded) {
        return (
            <div
                style={{
                    margin: 'auto',
                    marginTop: 10,
                    width: 'fit-content',
                }}
            >
                <LineSpinner
                    size="35"
                    stroke="2"
                    speed="1"
                    color="var(--TEXT_COLOR)"
                />
            </div>
        );
    }

    const stats = dashboard?.stats || {};
    const invitedBy = dashboard?.invited_by;

    if (!dashboard) {
        return <div className="UI-ErrorMessage">{loadError || t('ups')}</div>;
    }

    return (
        <div className="Referral-Container">
            <Block className="Referral-Card">
                <div className="UI-Title">{t('balance.referral.title')}</div>
                <div className="Referral-Description">
                    {t('balance.referral.description')}
                </div>

                <div className="Referral-Label">
                    {t('balance.referral.ref_code')}
                </div>
                <CopyInput value={dashboard?.profile?.ref_code || ''} />

                <div className="Referral-Label">
                    {t('balance.referral.invite_link')}
                </div>
                <CopyInput value={dashboard?.profile?.invite_link || ''} />

                <div className="Referral-Stats">
                    <div className="Row">
                        <div>{t('balance.referral.stats.total_invited')}</div>
                        <div>{stats.total_invited || 0}</div>
                    </div>
                    <div className="Row">
                        <div>{t('balance.referral.stats.rewarded')}</div>
                        <div>{stats.rewarded || 0}</div>
                    </div>
                    <div className="Row">
                        <div>{t('balance.referral.stats.pending')}</div>
                        <div>{stats.pending || 0}</div>
                    </div>
                    <div className="Row">
                        <div>{t('balance.referral.stats.total_earned')}</div>
                        <div className="Count">
                            <div className="UI-Eball">E</div>
                            {(Number(stats.total_earned) || 0).toFixed(3)}
                        </div>
                    </div>
                </div>

                {invitedBy && (
                    <div className="Referral-InvitedBy">
                        {t('balance.referral.invited_by')}
                        <span>
                            @{invitedBy.inviter_username || invitedBy.inviter_id}
                        </span>
                    </div>
                )}
            </Block>

            <Block>
                <div className="UI-Title">
                    {t('balance.referral.history_title')}
                </div>

                {history.length > 0 ? (
                    <>
                        {history.map((item) => (
                            <div key={item.id} className="Referral-HistoryItem">
                                <Avatar
                                    avatar={item.invited?.avatar}
                                    name={item.invited?.name}
                                    size={35}
                                />
                                <div className="Info">
                                    <div className="Name">
                                        {item.invited?.username
                                            ? `@${item.invited.username}`
                                            : `ID ${item.invited?.id}`}
                                    </div>
                                    <div className="Meta">
                                        {t(
                                            `balance.referral.status.${item.status}`,
                                        )}
                                        {' · '}
                                        <HandleTimeAge
                                            inputDate={
                                                item.reward_date ||
                                                item.created_at
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="Reward">
                                    <div className="UI-Eball">E</div>
                                    {Number(item.rewards?.inviter || 0).toFixed(
                                        3,
                                    )}
                                </div>
                            </div>
                        ))}

                        {hasMore && (
                            <Button
                                style={{ width: '100%', marginTop: 10 }}
                                onClick={loadMore}
                                disabled={isLoadingMore}
                            >
                                {isLoadingMore ? '...' : t('search_show_more')}
                            </Button>
                        )}
                    </>
                ) : (
                    <div className="UI-ErrorMessage">
                        {t('balance.referral.history_empty')}
                    </div>
                )}
            </Block>
        </div>
    );
};

export default ReferralProgram;
