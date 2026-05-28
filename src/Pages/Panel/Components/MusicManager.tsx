import { motion } from 'framer-motion';
import { I_CLOSE } from '../../../System/UI/IconPack';
import { useTranslation } from 'react-i18next';
import { Button } from '@/UIKit';
import { useState } from 'react';
import { useWebSocket } from '@/System/Context/WebSocket';
import { useModalsStore } from '@/Store/modalsStore';

const MusicManager = ({ setActive, statistic }) => {
    const { wsClient } = useWebSocket();
    const { openModal } = useModalsStore();
    const { t } = useTranslation();
    const [total, _] = useState(statistic?.songs?.total || 0);
    const [trash, setTrash] = useState(statistic?.songs?.trash || 0);

    const cleanTrashBin = () => {
        wsClient
            .send({
                type: 'social',
                action: 'dashboard/music/clean_trash_bin'
            })
            .then((res) => {
                if (res.status === 'success') {
                    openModal({
                        type: 'alert',
                        props: {
                            title: t('success'),
                            message: res.message
                        }
                    })
                    setTrash(0);
                }
            });
    }

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
                style={{ width: 'fit-content' }}
                layoutId="music-block"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="TopBar">
                    <div className="Title">Управление музыкой</div>
                    <button onClick={() => setActive(null)}>
                        <I_CLOSE />
                    </button>
                </div>
                <div className="UI-AW_Content">
                    <div style={{ margin: 5 }}>
                        <div>
                            Всего треков: {total}
                        </div>
                        <div style={{ color: 'red' }}>
                            Удалено треков: {trash}
                        </div>
                        <Button style={{ marginTop: 10 }} onClick={cleanTrashBin}>
                            Очистить корзину
                        </Button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default MusicManager;