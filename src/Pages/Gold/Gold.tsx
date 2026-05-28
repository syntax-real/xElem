import { useState } from 'react';
import GoldUsers from '../../System/Elements/GoldUsers';
import { useModalsStore } from '../../Store/modalsStore';
import { useTranslation } from 'react-i18next';
import { useWebSocket } from '../../System/Context/WebSocket';
import { useAuth } from '../../System/Hooks/useAuth';
import { Block, Button, LiquidBlock, MenuItems, Tabs } from '../../UIKit';
import { AnimatePresence, motion } from 'framer-motion';

type Advantage =
    | {
        title: string;
        description: string;
        info: true;
        video?: never;
    }
    | {
        title: string;
        description: string;
        video: string;
        info?: never;
    };

const Advantages = () => {
    const { t } = useTranslation();
    const [activeAdvantage, setActiveAdvantage] = useState<Advantage | null>(
        null,
    );
    const advantages: Advantage[] = [
        {
            title: t('gold_ad_1'),
            description: t('gold_ad_1_desc'),
            info: true,
        },
        {
            title: t('gold_ad_2'),
            description: t('gold_ad_2_desc'),
            video: 'GoldSub_Icon',
        },
        {
            title: t('gold_ad_3'),
            description: t('gold_ad_3_desc'),
            video: 'GoldSub_Ad',
        },
        {
            title: t('gold_ad_4'),
            description: t('gold_ad_4_desc'),
            video: 'GoldSub_Theme',
        },
        {
            title: t('gold_ad_5'),
            description: t('gold_ad_5_desc'),
            video: 'GoldSub_List',
        },
    ];

    const variants = {
        open: {
            opacity: 1,
            y: 0,
        },
        closed: {
            opacity: 0,
            y: 40,
        },
    };

    const closeAdvantage = () => {
        setActiveAdvantage(null);
    };

    return (
        <>
            <MenuItems>
                {advantages.map((advantage, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveAdvantage(advantage)}
                        className="Item GoldSub-A_Block"
                    >
                        <div className="GoldSub-A_B_TITLE">{advantage.title}</div>
                        <div>{advantage.description}</div>
                    </button>
                ))}
            </MenuItems>
            <div className="GoldSub-Info_action">
                <AnimatePresence>
                    {activeAdvantage?.info && (
                        <motion.div
                            className="UI-LG_Block GoldSub-InfoPreview"
                            initial="closed"
                            animate="open"
                            exit="closed"
                            variants={variants}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="Info">
                                <div className="InfoTitle">{activeAdvantage.title}</div>
                                {activeAdvantage?.info && (
                                    <div className="InfoDec">
                                        {' '}
                                        <div className="Title">
                                            {t('gold_info_prev_1')}
                                        </div>{' '}
                                        <div className="InfoContainer">
                                            {' '}
                                            <div className="Default">4 MB</div>{' '}
                                            <div className="Gold">8 MB</div>{' '}
                                        </div>{' '}
                                        <div className="Title">
                                            {t('gold_info_prev_2')}
                                        </div>{' '}
                                        <div className="InfoContainer">
                                            {' '}
                                            <div className="Default">20 MB</div>{' '}
                                            <div className="Gold">50 MB</div>{' '}
                                        </div>{' '}
                                        <div className="Title">
                                            {t('gold_info_prev_3')}
                                        </div>{' '}
                                        <div className="InfoContainer">
                                            {' '}
                                            <div className="Default">10 MB</div>{' '}
                                            <div className="Gold">30 MB</div>{' '}
                                        </div>{' '}
                                        <div className="Title">
                                            {t('gold_info_prev_4')}
                                        </div>{' '}
                                        <div
                                            className="InfoContainer"
                                            style={{ marginBottom: '25px' }}
                                        >
                                            {' '}
                                            <div className="Default">{t('no')}</div>{' '}
                                            <div className="Gold">{t('yes')}</div>{' '}
                                        </div>{' '}
                                    </div>
                                )}
                                <Button
                                    style={{ width: '100%' }}
                                    onClick={closeAdvantage}
                                >
                                    {t('close')}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {activeAdvantage?.video && (
                        <motion.div
                            className="UI-LG_Block GoldSub-VideoPreview"
                            initial="closed"
                            animate="open"
                            exit="closed"
                            variants={variants}
                            transition={{ duration: 0.2 }}
                        >
                            <motion.video
                                key={activeAdvantage.video}
                                src={`/static_sys/Videos/${activeAdvantage.video}.mp4`}
                                autoPlay
                                muted
                                loop
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            />

                            <div className="Info">
                                <div className="InfoTitle">{activeAdvantage.title}</div>
                                <div className="InfoDec">
                                    {activeAdvantage.description}
                                </div>

                                <Button
                                    style={{ width: '100%' }}
                                    onClick={closeAdvantage}
                                >
                                    {t('close')}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};

const History = () => {
    const { t } = useTranslation();
    const { accountData } = useAuth();

    return accountData.gold_history.length > 0 ? (
        accountData.gold_history.map((block, i) => (
            <Block
                key={i}
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                }}
            >
                <div className="Status">
                    {block.status === 1 ? 'Активна' : 'Неактивна'}
                </div>
                , активировано{' '}
                {new Date(block.date).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                })}
            </Block>
        ))
    ) : (
        <div className="UI-ErrorMessage">{t('ups')}</div>
    );
};

const Gold = () => {
    const { wsClient } = useWebSocket();
    const { t } = useTranslation();
    const { openModal } = useModalsStore() as any;
    const { accountData } = useAuth();
    const [activeTab, setActiveTab] = useState(0);

    const handleAnswer = (data) => {
        if (data.status === 'success') {
            openModal({
                type: 'alert',
                props: {
                    title: 'Успешно',
                    message: 'Подписка активирована',
                },
            });
        } else {
            openModal({
                type: 'alert',
                props: {
                    title: 'Ошибка',
                    message: data.message || 'Точных причин нет',
                },
            });
        }
    };

    const pay = () => {
        wsClient
            .send({
                type: 'social',
                action: 'gold/pay',
            })
            .then((data) => handleAnswer(data));
    };

    const activate = (code) => {
        wsClient
            .send({
                type: 'social',
                action: 'gold/activate',
                code: code,
            })
            .then((data) => handleAnswer(data));
    };

    const openActivate = () => {
        openModal({
            type: 'input',
            props: {
                title: 'Введите ключ',
                message:
                    'Ключ можно получить разными способами. Начиная от покупки, заканчивая просто подарком от кого-то.',
                onConfirm: (inputValue) => {
                    activate(inputValue);
                },
            },
        });
    };

    const tabs = [
        {
            title: t('gold_advantage'),
            content: <Advantages />,
        },
        {
            title: t('gold_history'),
            content: <History />,
        },
    ];

    return (
        <>
            <div className="UI-C_L">
                <div className="UI-ScrollView">
                    <Block className="UI-B_FIRST">
                        <div className="UI-Title">{t('subscribe_gold')}</div>
                        <img
                            className="GoldSub-Logo"
                            src="/static_sys/Images/SubscriptionLogo.svg"
                            alt="Gold Subscription Logo"
                            draggable={false}
                        />
                        {accountData.gold_status ? (
                            <div className="GoldSub-Price">{t('gold_payed')}</div>
                        ) : (
                            <div className="GoldSub-Price">{t('gold_price')}</div>
                        )}
                    </Block>
                    <Tabs tabs={tabs} select={setActiveTab} />
                    {tabs[activeTab]?.content}
                    {!accountData.gold_status && (
                        <LiquidBlock className="GoldSub-Buttons">
                            <Button onClick={pay} className="Pay">
                                {t('gold_pay')}
                                <div className="Eballs">
                                    <div className="UI-Eball">E</div>
                                    0.1
                                </div>
                            </Button>
                            <Button onClick={openActivate} className="Activate">
                                {t('activate')}
                            </Button>
                        </LiquidBlock>
                    )}
                </div>
            </div>
            <div className="UI-C_R">
                <div className="UI-ScrollView">
                    <Block className="UI-B_FIRST">
                        <div className="UI-Title">{t('gold_users_list_2')}</div>
                        <div className="GoldSub-Users">
                            <GoldUsers />
                        </div>
                    </Block>
                </div>
            </div>
        </>
    );
};

export default Gold;
