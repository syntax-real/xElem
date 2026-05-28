import { useAuth } from '../System/Hooks/useAuth';

export const DefaultBanner = () => {
    const { accountData } = useAuth();

    if (accountData?.gold_status) {
        return null;
    }

    return (
        <>
            <div className='UI-AD_N2-B'>
                <div className='UI-AD_C_TOP'>
                    <div className='UI-AD_TITLE'>Реклама</div>
                </div>
                <div className='UI-AD-T'>
                    Подпишитесь на телеграм канал автора сайта
                </div>
                <img
                    style={{ width: '100%', zIndex: 0, position: 'absolute', inset: 0 }}
                    src='/static_sys/Images/TG_BG.jpg'
                    alt='ad_img'
                />
                <div className='UI-AD_C_BOTTOM'>
                    <a className='UI-AD_BTN' href='https://t.me/XaromieChannel'>
                        Перейти
                    </a>
                </div>
            </div>
            <a href='https://my.vdsok.guru/aff.php?aff=2' target='_blank'>
                <div className='UI-AD_N2-B' style={{ display: 'flex' }}>
                    <div className='UI-AD_C_TOP'>
                        <div className='UI-AD_TITLE'>Реклама</div>
                    </div>
                    <img
                        style={{ height: '100%' }}
                        src='/static_sys/Images/Host.jpg'
                        alt='ad_img'
                    />
                </div>
            </a>
        </>
    );
};
