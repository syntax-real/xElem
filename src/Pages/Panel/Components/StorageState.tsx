import { useTranslation } from 'react-i18next';
import { Block, Button } from '@/UIKit';
import { HandleFileSize } from '../../../System/Elements/Handlers';
import { useWebSocket } from '@/System/Context/WebSocket';

const colors = {
    apps: 'rgb(47 128 237)',
    avatars: 'rgb(64 231 135)',
    covers: 'rgb(48 149 91)',
    posts: 'rgb(103 21 241)',
    comments: 'rgb(171 123 252)',
    messenger: 'rgb(127 164 255)',
    music: 'rgb(255 80 0)',
    simple: 'rgb(107, 114, 128)',
    exports: 'rgb(213, 63, 140)',
    temp: ' rgb(98 50 25)',
    images: '#38B2AC',
    files: '#805AD5',
    videos: '#DD6B20',
    pools: '#4299E1',
};
const StorageState = ({ storage, storageSpace, usedSpace }) => {
    const { t } = useTranslation();
    const { wsClient } = useWebSocket();

    const cleanStorage = () => {
        wsClient.send({
            type: 'social',
            action: 'dashboard/storage/clean'
        }).then((res) => {
            console.log(res);
        })
    };

    return (
        <>
            <div className="UI-PartitionName">Память</div>
            <Block>
                <div style={{ margin: 5 }}>
                    <div style={{ fontSize: '0.8rem', marginBottom: 5 }}>
                        Всего занято
                    </div>
                    <div style={{ fontSize: '0.9rem', marginBottom: 5, marginTop: 2 }}>
                        <HandleFileSize bytes={usedSpace} /> /{' '}
                        <HandleFileSize bytes={storageSpace} />
                    </div>

                    <div className="OverallProgressContainer">
                        {storage.map((entry) => {
                            const key = entry.path;
                            const color = colors[key] || '#D1D5DB';
                            const percent =
                                storageSpace > 0 ? (entry.size / storageSpace) * 100 : 0;
                            return (
                                <div
                                    key={key}
                                    className="OverallProgressSegment"
                                    style={{ width: `${percent}%`, backgroundColor: color }}
                                    title={`${key}: ${percent.toFixed(1)}%`}
                                />
                            );
                        })}
                    </div>
                </div>

                <Button
                    onClick={cleanStorage}
                    title="Очистить"
                    style={{ marginBottom: 20, marginTop: 10 }}
                />

                {storage.map((entry) => {
                    const hasChildren =
                        Array.isArray(entry.paths) && entry.paths.length > 0;

                    const parentColor = colors[entry.path] || '#D1D5DB';

                    return (
                        <div key={entry.path} className="Panel-StorageList">
                            <div className="GroupedItem">
                                <div className="GroupedText">
                                    <div className="TreeRow">
                                        <div
                                            className="ColorIndicator"
                                            style={{ backgroundColor: parentColor }}
                                        />
                                        {t(`storage_paths.${entry.path}`)}
                                    </div>
                                </div>
                                <div className="Size">
                                    <HandleFileSize bytes={entry.size} />
                                </div>
                            </div>

                            {hasChildren && (
                                <div className="TreeWrapper">
                                    <svg
                                        className="TreeSVG"
                                        height={entry.paths.length * 20}
                                    >
                                        <defs>
                                            {entry.paths.map((sub) => {
                                                const childColor =
                                                    colors[sub.path] || '#D1D5DB';

                                                return (
                                                    <linearGradient
                                                        key={sub.path}
                                                        id={`grad-${entry.path}-${sub.path}`}
                                                        gradientUnits="userSpaceOnUse"
                                                        x1="0"
                                                        y1="0"
                                                        x2="60"
                                                        y2="40"
                                                    >
                                                        <stop offset="0%" stopColor={parentColor} />
                                                        <stop offset="100%" stopColor={childColor} />
                                                    </linearGradient>
                                                );
                                            })}
                                        </defs>

                                        {entry.paths.map((sub, i) => {
                                            const y = 20 + i * 40;

                                            return (
                                                <path
                                                    key={sub.path}
                                                    d={`M 10 0 C 10 ${y}, 30 ${y}, 60 ${y}`}
                                                    stroke={`url(#grad-${entry.path}-${sub.path})`}
                                                    strokeWidth="2"
                                                    fill="none"
                                                />
                                            );
                                        })}
                                    </svg>

                                    <div className="TreeList">
                                        {entry.paths.map((sub) => {
                                            const childColor =
                                                colors[sub.path] || '#D1D5DB';

                                            return (
                                                <div
                                                    key={sub.path}
                                                    className="GroupedSubItem"
                                                >
                                                    <div className="TreeRow">
                                                        <div
                                                            className="ColorIndicator"
                                                            style={{
                                                                backgroundColor: childColor,
                                                            }}
                                                        />
                                                        {t(`storage_paths.${sub.path}`)}
                                                    </div>

                                                    <div className="Size">
                                                        <HandleFileSize bytes={sub.size} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </Block>
        </>
    )
}

export default StorageState;