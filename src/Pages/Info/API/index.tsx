import { useState } from 'react';
import First from './Pages/First';
import AccountSettings from './Pages/AccountSettings';
import Posts from './Pages/Posts';
import Profiles from './Pages/Profiles';
import Channels from './Pages/Channels';
import Messages from './Pages/Messages';
import Gifts from './Pages/Gifts';
import { Block, DropdownSelect } from '@/UIKit';

const API = () => {
    const [selectedPage, setSelectedPage] = useState(0);

    const apiPages = [
        {
            title: 'Для начала',
            content: <First />,
        },
        {
            title: 'Настройки аккаунта',
            content: <AccountSettings />,
        },
        {
            title: 'Профили',
            content: <Profiles />,
        },
        {
            title: 'Посты',
            content: <Posts />,
        },
        {
            title: 'Каналы',
            content: <Channels />,
        },
        {
            title: 'Сообщения',
            content: <Messages />,
        },
        {
            title: 'Подарки',
            content: <Gifts />,
        }
    ];

    return (
        <Block className="Info-Block UI-B_FIRST">
            <div className="UI-Title">Документация по API</div>
            <DropdownSelect
                list={apiPages}
                setSelected={setSelectedPage}
            />
            {apiPages[selectedPage].content}
        </Block>
    );
};

export default API;