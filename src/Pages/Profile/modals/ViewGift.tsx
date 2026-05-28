import { useState } from 'react';
import { Avatar, Block } from '@/UIKit';
import NeoImage from '../../../UIKit/Components/Base/NeoImage';
import { NavLink } from 'react-router-dom';

const ViewGift = ({ profileData, gift }) => {
    const [imageLoaded, setImageLoaded] = useState(false);

    function formatGiftDate(dateString: string) {
        console.log(dateString);
        const date = new Date(dateString);

        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        return `${hours}:${minutes} ${day}.${month}.${year}`;
    }

    const onLoaded = () => {
        setImageLoaded(true);
    }

    return (
        <div className="ViewGift">
            <div className="Header">
                <div className="Image">
                    {
                        !imageLoaded && (
                            <img className="Preview" src={gift.image.preview} alt="фыр" draggable={false} />
                        )
                    }
                    <NeoImage
                        image={gift.image}
                        lossless={true}
                        gradientBackground={false}
                        draggable={false}
                        onLoaded={onLoaded}
                    />
                </div>

                <div className="Name">{gift.name}</div>
                <div className="Description">{gift.description}</div>
            </div>
            <Block className="GiftTable">
                <table>
                    <tbody>
                        <tr>
                            <td>От</td>
                            <td>
                                {
                                    gift.sender && (
                                        <NavLink to={`/e/${gift.sender.username}`} className="Sender">
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
                            </td>
                        </tr>
                        <tr>
                            <td>Получатель</td>
                            <td>
                                {
                                    profileData && (
                                        <NavLink to={`/e/${profileData.username}`} className="Sender">
                                            <Avatar
                                                avatar={profileData.avatar}
                                                name={profileData.name}
                                                size={20}
                                            />
                                            <div className="Name">
                                                {profileData.name}
                                            </div>
                                        </NavLink>
                                    )
                                }
                            </td>
                        </tr>
                        <tr>
                            <td>Цена</td>
                            <td>
                                <div className="Price">
                                    {gift.price} <div className="UI-Eball">E</div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>Сообщение</td>
                            <td className="message">{gift.message || '—'}</td>
                        </tr>
                        <tr>
                            <td>Дата</td>
                            <td>{formatGiftDate(gift.date)}</td>
                        </tr>
                    </tbody>
                </table>
            </Block>
        </div>
    );
};

export default ViewGift;