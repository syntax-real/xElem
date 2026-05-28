import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebSocket } from '@/System/Context/WebSocket';
import { LineSpinner } from 'ldrs/react';
import { Gift } from '@/UIKit';
import { useModalsStore } from '@/Store/modalsStore';
import ViewGift from '../modals/ViewGift';

const Gifts = ({ profileData }) => {
    const { t } = useTranslation();
    const { openModal } = useModalsStore();
    const { wsClient } = useWebSocket();
    const [loading, setLoading] = useState(true);
    const [gifts, setGifts] = useState([]);

    useEffect(() => {
        wsClient.send({
            type: 'social',
            action: 'gifts/load',
            payload: {
                username: profileData?.username
            }
        }).then((res) => {
            if (res.status === 'success') {
                setGifts(res.gifts)
                setLoading(false);
                console.log(res);
            }
        })
    }, []);

    const openGift = (gift) => {
        openModal({
            type: 'routed',
            props: {
                children: (
                    <ViewGift
                        profileData={profileData}
                        gift={gift}
                    />
                )
            }
        })
    }

    return (
        <div>
            {loading ? (
                <div
                    style={{
                        margin: 'auto',
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
            ) : (
                gifts.length > 0 ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
                        gap: '7px',
                    }}>
                        {
                            gifts.map((gift: any, i) => (
                                <Gift
                                    key={i}
                                    gift={gift}
                                    payButton={false}
                                    profileData={profileData}
                                    onClick={() => {
                                        openGift(gift)
                                    }}
                                />
                            ))
                        }
                    </div>
                ) : (
                    <div className="UI-ErrorMessage">
                        {t('ups')}
                    </div>
                )
            )}
        </div>
    )
}

export default Gifts;