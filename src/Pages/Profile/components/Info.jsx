import { useTranslation } from 'react-i18next';
import { HandleTimeAge } from '../../../System/Elements/Handlers';
import { Block } from '@/UIKit';

const HandleProfileDate = ({ date }) => {
    const dateObj = new Date(date);
    const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}.${(dateObj.getMonth() + 1).toString().padStart(2, '0')}.${dateObj.getFullYear()}`;

    return formattedDate;
};

const Info = ({ profileLoaded, profileData }) => {
    const { t } = useTranslation();

    return (
        <Block>
            {profileLoaded && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px',
                    }}
                >
                    <div>
                        {t('profile_date')}{' '}
                        <HandleProfileDate date={profileData?.create_date} />{' '}
                        <div style={{ opacity: 0.8, display: 'inline' }}>
                            (
                            <HandleTimeAge
                                inputDate={profileData?.create_date}
                                showDetailed={true}
                            />
                            )
                        </div>
                    </div>
                    {profileData.type === 'user' && (
                        <div>
                            {t('profile_last_online')}{' '}
                            <HandleProfileDate
                                date={profileData?.last_online}
                            />{' '}
                            <div style={{ opacity: 0.8, display: 'inline' }}>
                                (
                                <HandleTimeAge
                                    inputDate={profileData?.last_online}
                                    showDetailed={true}
                                />
                                )
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Block>
    );
};

export default Info;
