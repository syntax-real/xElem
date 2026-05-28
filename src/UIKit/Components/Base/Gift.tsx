import { useState } from 'react';
import NeoImage from './NeoImage';
import Avatar from './Avatar';
import { NavLink } from 'react-router-dom';
import Button from '../Buttons/Button';
import { I_EYE, I_EYE_OFF } from '../../../System/UI/IconPack';
import { useWebSocket } from '@/System/Context/WebSocket';
import Block from '../Layout/Block';

interface GiftProps {
    gift: any;
    payButton?: boolean;
    onPay?: () => void;
    ribbon?: boolean;
    ribbonStyle?: any;
    ribbonText?: string;
    profileData?: any;
    onClick?: () => void;
}

const Gift = ({ gift, payButton = false, onPay, ribbon, ribbonStyle, ribbonText, profileData, onClick }: GiftProps) => {
    const { wsClient } = useWebSocket();
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isHidden, setIsHidden] = useState(gift.is_hidden);

    const onLoaded = () => {
        setImageLoaded(true);
    }

    const toggleHidden = () => {
        setIsHidden(!isHidden);

        wsClient.send({
            type: 'social',
            action: isHidden ? 'gifts/show' : 'gifts/hide',
            payload: {
                id: gift.id,
                username: profileData.username
            }
        });
    }

    return (
        <Block className="UI-Gift">
            {
                onClick && (
                    <button className="UI-ButtonSpace" onClick={onClick} />
                )
            }
            {
                ribbon && (
                    <div className="Ribbon" style={ribbonStyle}>{ribbonText}</div>
                )
            }
            {
                profileData?.my_profile && (
                    <div className="Buttons">
                        <Button onClick={toggleHidden}>
                            {
                                isHidden ? <I_EYE_OFF /> : <I_EYE />
                            }
                        </Button>
                    </div>
                )
            }
            <div className="Image">
                {
                    !imageLoaded && (
                        <img className="Preview" src={gift.image.preview} alt="фыр" draggable={false} />
                    )
                }
                <NeoImage
                    image={gift.image}
                    onLoaded={onLoaded}
                    gradientBackground={false}
                    draggable={false}
                />
            </div>
            <div className="Metadata">
                <div className="Name">
                    {gift.name}
                </div>
                {
                    gift.description && (
                        <div className="Description">
                            {
                                gift.description
                            }
                        </div>
                    )
                }
            </div>
            {
                gift.sender && (
                    <NavLink to={`/e/${gift.sender.username}`} className="Sender">
                        <div className="From">
                            от
                        </div>
                        <Avatar
                            avatar={gift.sender.avatar}
                            name={gift.sender.name}
                            size={20}
                        />
                        <div className="Name">
                            {gift.sender.name}
                        </div>
                    </NavLink>
                )
            }
            {
                payButton && (
                    <button className="Pay" onClick={onPay}>
                        {gift.price}
                        <div className="UI-Eball">Е</div>
                    </button>
                )
            }
        </Block>
    )
}

export default Gift;