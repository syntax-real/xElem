import { useState, useEffect } from 'react';
import { useWebSocket } from '@/System/Context/WebSocket';
import { useModalsStore } from '@/Store/modalsStore';
import { useTranslation } from 'react-i18next';
import {
    TextInput,
    Button,
    Block,
    Switch,
    PartitionName,
    Avatar,
    MenuItems,
    DropdownSelect
} from '@/UIKit';
import { HandleUserIcons, ProfileIcons } from '../../../System/Elements/Handlers';

interface Permissions {
    Posts: boolean;
    Comments: boolean;
    NewChats: boolean;
    MusicUpload: boolean;
    Admin: boolean;
}

interface UserIcons {
    VERIFY: boolean;
    FAKE: boolean;
}

interface UserPermissionsModalProps {
    user: {
        id: number;
        name: string;
        username: string;
    };
    onUserDeleted?: () => void;
}

const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({
    user
}) => {
    const { wsClient } = useWebSocket();
    const { openModal } = useModalsStore() as any;
    const { t } = useTranslation();
    const [userData, setUserData] = useState<any>(null);
    const [permissions, setPermissions] = useState<Permissions | null>(null);
    const [icons, setIcons] = useState<UserIcons>({
        VERIFY: false,
        FAKE: false,
    });
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [eballs, setEballs] = useState<string>('');
    const [password, setPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [rolesLoaded, setRolesLoaded] = useState(false);
    const [roles, setRoles] = useState<any>([]);
    const selectedRoleIndex =
        roles.length && userData
            ? roles.findIndex(r => r.key === userData.role)
            : -1;

    useEffect(() => {
        loadUserData();
    }, [user.id]);

    const normalizeIcons = (iconsArray: any[]) => {
        return iconsArray.reduce((acc, item) => {
            acc[item.icon_id] = true;
            return acc;
        }, {
            VERIFY: false,
            FAKE: false,
        });
    };

    const loadUserData = async () => {
        setLoading(true);
        try {
            const response = await wsClient.send({
                type: 'social',
                action: 'moderation/get_user_data',
                payload: {
                    user_id: user.id,
                },
            });

            if (response.status === 'success') {
                console.log(response);
                setUserData(response.user);
                setPermissions(response.user.permissions);
                if (response.user.icons) {
                    setIcons(normalizeIcons(response.user.icons));
                }
                if (response.eballs !== undefined) {
                    setEballs(String(response.eballs));
                }
            } else {
                openModal({
                    type: 'alert',
                    props: {
                        title: t('error'),
                        message: response.message || 'Ошибка загрузки разрешений',
                    },
                });
            }
        } catch (err) {
            openModal({
                type: 'alert',
                props: {
                    title: t('error'),
                    message: 'Ошибка подключения',
                },
            });
        } finally {
            setLoading(false);
        }
    };

    const updatePermissions = async () => {
        if (!permissions) return;

        setLoading(true);
        try {
            const response = await wsClient.send({
                type: 'social',
                action: 'moderation/update_user_data',
                payload: {
                    user_id: user.id,
                    permissions,
                    icons,
                    reason: reason.trim(),
                    role: roles[selectedRoleIndex].key
                },
            });

            if (response.status === 'success') {
                openModal({
                    type: 'alert',
                    props: {
                        title: t('success'),
                        message: 'Разрешения успешно обновлены',
                    },
                });
            } else {
                openModal({
                    type: 'alert',
                    props: {
                        title: t('error'),
                        message: response.message || 'Ошибка обновления разрешений',
                    },
                });
            }
        } catch (err) {
            console.log(err);
            openModal({
                type: 'alert',
                props: {
                    title: t('error'),
                    message: 'Ошибка подключения',
                },
            });
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = (key: keyof Permissions) => {
        if (!permissions) return;
        setPermissions((prev) => (prev ? { ...prev, [key]: !prev[key] } : null));
    };

    const toggleIcon = (key: keyof UserIcons) => {
        setIcons((prev) => {
            const newState = { ...prev, [key]: !prev[key] };
            return newState;
        });
    };

    const changeEballs = async () => {
        const amount = parseFloat(eballs);
        if (isNaN(amount)) {
            openModal({
                type: 'alert',
                props: {
                    title: t('error'),
                    message: 'Введите корректное число',
                },
            });
            return;
        }

        try {
            const response = await wsClient.send({
                type: 'social',
                action: 'dashboard/users/change_eballs',
                payload: { uid: user.id, amount },
            });

            openModal({
                type: 'alert',
                props: {
                    title: response.status === 'success' ? t('success') : t('error'),
                    message: response.message,
                },
            });
        } catch {
            openModal({
                type: 'alert',
                props: { title: t('error'), message: 'Ошибка подключения' },
            });
        }
    };

    useEffect(() => {
        if (loading && !permissions) return;

        wsClient.send({
            type: 'social',
            action: 'dashboard/get_roles'
        }).then((res) => {
            if (res.status === 'success') {
                setRolesLoaded(true);
                setRoles([
                    { key: null, title: t('roles.none') },
                    ...res.roles.map((role: string) => ({
                        key: role,
                        title: t(`roles.${role}`)
                    }))
                ]);
            }
        })
    }, [loading, permissions]);

    const changePassword = () => {
        if (passwordLoading) return;
        setPasswordLoading(true);

        wsClient
            .send({
                type: 'social',
                action: 'dashboard/users/change_password',
                payload: {
                    uid: user.id,
                    password: password,
                },
            })
            .then((res) => {
                setPasswordLoading(false);
                if (res.status === 'success') {
                    openModal({
                        type: 'alert',
                        props: {
                            title: t('success'),
                            message: res.message,
                        },
                    });
                } else {
                    openModal({
                        type: 'alert',
                        props: {
                            title: t('error'),
                            message: res.message,
                        },
                    });
                }
            });
        setPassword('');
    };

    const selectRole = (role) => {
        setUserData(prev => ({
            ...prev,
            role
        }));
    }

    if (loading && !permissions) {
        return (
            <div className="loading-container">
                <div className="loading-spinner">Загрузка...</div>
            </div>
        );
    }

    if (!permissions) return null;

    return (
        <>
            <div className="UserPermissions-List">
                <Block className="Header">
                    <Avatar
                        avatar={userData.avatar}
                        name={userData.name}
                        size={60}
                    />
                    <div className="Data">
                        <div className="UI-NameBody">
                            <div className="Name">
                                {userData.name}
                            </div>
                            <HandleUserIcons icons={userData.icons} />
                        </div>
                        <div className="db">@{userData.username}</div>
                        <div className="dc">{userData.email}</div>
                    </div>
                </Block>

                {
                    rolesLoaded && (
                        <>
                            <PartitionName name={t('role')} />
                            <MenuItems>
                                <div className="Item UI-Parameter">
                                    <span>Выбрать роль</span>
                                    <DropdownSelect
                                        list={roles}
                                        selected={selectedRoleIndex}
                                        setSelected={(i) => {
                                            const role = roles[i]?.key ?? null;
                                            selectRole(role);
                                        }}
                                    />
                                </div>
                            </MenuItems>
                        </>
                    )
                }

                <PartitionName name={t('permissions')} />
                <MenuItems>
                    <div className="UI-Parameter Item">
                        <span>Создание постов</span>
                        <Switch
                            checked={permissions.Posts}
                            onChange={() => togglePermission('Posts')}
                        />
                    </div>

                    <div className="UI-Parameter Item">
                        <span>Написание комментариев</span>
                        <Switch
                            checked={permissions.Comments}
                            onChange={() => togglePermission('Comments')}
                        />
                    </div>

                    <div className="UI-Parameter Item">
                        <span>Создание чатов</span>
                        <Switch
                            checked={permissions.NewChats}
                            onChange={() => togglePermission('NewChats')}
                        />
                    </div>

                    <div className="UI-Parameter Item">
                        <span>Загрузка музыки</span>
                        <Switch
                            checked={permissions.MusicUpload}
                            onChange={() => togglePermission('MusicUpload')}
                        />
                    </div>
                </MenuItems>

                <PartitionName name="Иконки профиля" />
                <MenuItems>
                    <div className="UI-Parameter Item">
                        <span className='PRF_I'>{ProfileIcons.VERIFY.icon} {t(ProfileIcons.VERIFY.title)}</span>
                        <Switch
                            checked={icons.VERIFY}
                            onChange={() => toggleIcon('VERIFY')}
                        />
                    </div>

                    <div className="UI-Parameter Item">
                        <span className='PRF_I'>{ProfileIcons.FAKE.icon} {t(ProfileIcons.FAKE.title)}</span>
                        <Switch
                            checked={icons.FAKE}
                            onChange={() => toggleIcon('FAKE')}
                        />
                    </div>
                </MenuItems>

                <PartitionName name={t('change_password')} />
                <Block
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <TextInput
                        placeholder={t('new_password')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <Button
                        title={passwordLoading ? 'Сохранение...' : 'Сохранить'}
                        onClick={changePassword}
                        isActive={!passwordLoading}
                        buttonStyle="action"
                    />
                </Block>

                <PartitionName name="Е-баллы" />
                <Block style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <TextInput
                        placeholder="Кол-во е-баллов"
                        value={eballs}
                        onChange={(e) => setEballs(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <Button
                        title="Применить"
                        onClick={changeEballs}
                        buttonStyle="action"
                    />
                </Block>

                <Block
                    style={{
                        marginTop: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <TextInput
                        placeholder="Причина изменения (необязательно)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <Button
                        title={loading ? 'Сохранение...' : 'Сохранить'}
                        onClick={updatePermissions}
                        isActive={!loading}
                        buttonStyle="action"
                    />
                </Block>
            </div>
        </>
    );
};

export default UserPermissionsModal;
