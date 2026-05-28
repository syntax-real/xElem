import { motion } from 'framer-motion';
import { I_CLOSE } from '../../../System/UI/IconPack';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import { useWebSocket } from '@/System/Context/WebSocket';
import { Tabs } from '@/UIKit';
import { DeviceTypes } from '@/Configs/DeviceTypes';

const SessionsManager = ({ setActive }) => {
    const { wsClient } = useWebSocket();
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [types, setTypes] = useState([]);
    const [clientNames, setClientNames] = useState([]);

    const [tab, setTab] = useState(0);

    useEffect(() => {
        wsClient.send({
            type: 'social',
            action: 'dashboard/statistic/sessions'
        }).then((res) => {
            if (res.status === 'success') {
                setTotal(res.data.total || 0);
                setTypes(res.data.device_types || []);
                setClientNames(res.data.client_names || []);
            }
            setLoading(false);
        });
    }, []);

    const colors = ['#4f46e5', '#06b6d4', '#f59e0b', '#ef4444', '#22c55e'];

    const typesPie = useMemo(() => {
        const sum = types.reduce((a, b) => a + b.total, 0) || 1;
        let acc = 0;

        return types.map((item) => {
            const value = item.total / sum;
            const start = acc;
            acc += value;

            return {
                ...item,
                start,
                end: acc,
                color: DeviceTypes[item.device_type].color ?? '#94a3b8'
            };
        });
    }, [types]);

    const devicesPie = useMemo(() => {
        const sum = clientNames.reduce((a, b) => a + b.total, 0) || 1;
        let acc = 0;

        return clientNames.map((item, i) => {
            const value = item.total / sum;
            const start = acc;
            acc += value;

            return {
                ...item,
                start,
                end: acc,
                color: colors[i % colors.length]
            };
        });
    }, [clientNames]);

    const describeArc = (start, end) => {
        const r = 80;
        const cx = 100;
        const cy = 100;

        const startAngle = 2 * Math.PI * start;
        const endAngle = 2 * Math.PI * end;

        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);

        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);

        const largeArc = end - start > 0.5 ? 1 : 0;

        return `
            M ${cx} ${cy}
            L ${x1} ${y1}
            A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}
            Z
        `;
    };

    const selectTab = (i) => {
        setTab(i);
    }

    const tabs = [
        {
            title: 'Типы устройств',
        },
        {
            title: 'Названия клиентов',
        }
    ];

    return (
        <motion.div
            className="UI-Backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
        >
            <motion.div
                className="UI-ActionWindow"
                style={{ width: 650 }}
                layoutId="sessions-block"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="TopBar">
                    <div className="Title">Аналитика сессий</div>
                    <button onClick={() => setActive(null)}>
                        <I_CLOSE />
                    </button>
                </div>
                <div className="UI-AW_Content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <Tabs
                        tabs={tabs}
                        select={selectTab}
                        insert
                        style={{ width: 'fit-content' }}
                    />
                    <div style={{ display: 'flex', flex: 1, gap: 20 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: 10 }}>
                                Всего сессий: <b>{total}</b>
                            </div>

                            {loading ? (
                                <div>{t('loading')}</div>
                            ) : tab === 0 ? (
                                <svg width="200" height="200" viewBox="0 0 200 200">
                                    {typesPie.map((s, i) => (
                                        <path
                                            key={i}
                                            d={describeArc(s.start, s.end)}
                                            fill={s.color}
                                        />
                                    ))}
                                </svg>
                            ) : tab === 1 ? (
                                <svg width="200" height="200" viewBox="0 0 200 200">
                                    {devicesPie.map((s, i) => (
                                        <path
                                            key={i}
                                            d={describeArc(s.start, s.end)}
                                            fill={s.color}
                                        />
                                    ))}
                                </svg>
                            ) : null}
                        </div>
                        <div style={{ flex: 1 }}>
                            {tab === 0 ? (
                                <>
                                    <div style={{ fontWeight: 600, marginBottom: 10 }}>
                                        Топ типов устройств
                                    </div>

                                    {types.map((t, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '6px 10px',
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: 8,
                                                marginBottom: 6,
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                                                <div
                                                    style={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: '50%',
                                                        background: DeviceTypes[t.device_type].color ?? '#94a3b8'
                                                    }}
                                                />

                                                <span>
                                                    {DeviceTypes[t.device_type]?.name ?? 'Unknown'}
                                                </span>
                                            </div>

                                            <b>{t.total}</b>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <>
                                    <div style={{ fontWeight: 600, marginBottom: 10 }}>
                                        Топ клиентов
                                    </div>
                                    {clientNames.slice(0, 10).map((d, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '6px 10px',
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: 8,
                                                marginBottom: 6,
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                                                <div
                                                    style={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: '50%',
                                                        background: colors[i % colors.length]
                                                    }}
                                                />

                                                <span>{d.client_name}</span>
                                            </div>

                                            <b>{d.total}</b>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default SessionsManager;