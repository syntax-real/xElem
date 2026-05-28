import { useEffect, useState } from 'react';
import {
    I_BACK,
    I_SEND,
    I_SETTINGS,
    I_COPY
} from '../../../System/UI/IconPack';
import { useModalsStore } from '@/Store/modalsStore';
import { Avatar, Block, Button, ContextMenu, LiquidBlock, Name, TextInput } from '@/UIKit';
import { useWebSocket } from '@/System/Context/WebSocket';
import { useTranslation } from 'react-i18next';
import UserPermissionsModal from '../Modals/UserPermissionsModal';
import Loader from '../Components/Loader';

const HandleUser = ({ user }) => {
    const { openModal } = useModalsStore() as any;
    const { t } = useTranslation();


    const handleCopy = (value) => {
        navigator.clipboard.writeText(value);
    };

    const openUserSettings = () => {
        openModal({
            type: 'routed',
            props: {
                title: `Разрешения: ${user.name}`,
                children: <UserPermissionsModal user={user} />,
            },
        })
    }

    const items = [
        {
            icon: <I_COPY />,
            title: t('copy_username'),
            onClick: () => handleCopy(user.username),
        },
        {
            icon: <I_COPY />,
            title: t('copy_email'),
            onClick: () => handleCopy(user.email),
        },
        {
            icon: <I_SETTINGS />,
            title: t('manage'),
            onClick: openUserSettings,
        },
    ];

    return (
        <ContextMenu items={items}>
            <Block className="Dashboard-Item">
                <Avatar
                    avatar={user.avatar}
                    name={user.name}
                    size={35}
                />
                <div className="BaseInfo">
                    <Name
                        name={user.name}
                        icons={user.icons}
                    />
                    <div onClick={() => handleCopy(user.username)} className="Username">
                        @{user.username}
                    </div>
                </div>
                <div className="LiteInfo">
                    <div className="Text">UID: {user.id}</div>
                    <div
                        onClick={() => handleCopy(user.email)}
                        style={{ cursor: 'pointer' }}
                        className="Text"
                    >
                        {user.email}
                    </div>
                </div>
                <div className="GovernButtons">
                    <button
                        onClick={openUserSettings}
                    >
                        <I_SETTINGS />
                    </button>
                </div>
            </Block>
        </ContextMenu>
    );
};

const Users = () => {
    const { t } = useTranslation();
    const { wsClient } = useWebSocket();
    const [searchValue, setSearchValue] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [users, setUsers] = useState<any>([]);
    const [usersCount, setUsersCount] = useState<number>(0);
    const [startIndex, setStartIndex] = useState<number>(0);

    const loadUsers = ({ startIndex, searchValue }) => {
        wsClient
            .send({
                type: 'social',
                action: 'dashboard/users/load',
                payload: {
                    start_index: startIndex,
                    search_value: searchValue,
                },
            })
            .then((res) => {
                if (res.users) {
                    setUsers(res.users);
                    setUsersCount(res.users_count);
                    setIsLoading(false);
                }
            });
    };

    const search = () => {
        loadUsers({ startIndex: 0, searchValue: searchValue });
        setStartIndex(0);
    };

    const next = () => {
        if (startIndex < usersCount) {
            setStartIndex(startIndex + 50);
            loadUsers({ startIndex: startIndex + 50, searchValue: searchValue });
        }
    };

    const back = () => {
        if (startIndex !== 0) {
            setStartIndex(startIndex - 50);
            loadUsers({ startIndex: startIndex - 50, searchValue: searchValue });
        }
    };

    useEffect(() => {
        loadUsers({ startIndex: 0, searchValue: '' });
    }, []);

    return (
        <>
            <Block
                style={{ display: 'flex', flexDirection: 'column' }}
                className="UI-B_FIRST"
            >
                <div className="UI-Title">{t('users')}</div>
                <div className="Dashboard-Search">
                    <TextInput
                        placeholder="Поиск"
                        value={searchValue}
                        onChange={(e) => {
                            setSearchValue(e.target.value);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                search();
                            }
                        }}
                    />
                    <Button
                        onClick={search}
                        buttonStyle="action"
                    >
                        <I_SEND />
                    </Button>
                </div>
            </Block>
            <div className="Dashboard-Items">
                {
                    isLoading ? (
                        <Loader />
                    ) : (
                        users.length > 0 &&
                        users.map((user) => <HandleUser key={user.id} user={user} />)
                    )
                }
            </div>
            <LiquidBlock className="Dashboard-BottomBar">
                <button
                    onClick={back}
                    className={`Back ${startIndex === 0 ? 'NonActiveButton' : ''}`}
                >
                    <I_BACK />
                    {t('back')}
                </button>
                <div className="Pages">
                    <div style={{ marginRight: 3 }}>{startIndex + 50}</div>
                    из
                    <div style={{ marginLeft: 3 }}>{usersCount}</div>
                </div>
                <button
                    onClick={next}
                    className={`Next ${startIndex > usersCount ? 'NonActiveButton' : ''}`}
                >
                    <I_BACK />
                    Вперёд
                </button>
            </LiquidBlock>
        </>
    );
};

export default Users;
