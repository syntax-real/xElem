import { useRef, useState } from 'react';
import { useWebSocket } from '@/System/Context/WebSocket';
import { useAuth } from '@/System/Hooks/useAuth';
import { useTranslation } from 'react-i18next';
import {
    Avatar,
    Block,
    Cover,
    MenuItems,
    QuestionModal,
    Switch,
    Textarea,
    TextInput,
} from '@/UIKit';
import Links from '../components/Links';
import { useModalsStore } from '@/Store/modalsStore';
import getModal from '../utils/gitModal';
import SettingsButton from '../components/SettingsButton';
import { I_DELETE, I_EMAIL, I_LOCK, I_USERNAME } from '@/System/UI/IconPack';

const EditProfile = () => {
    const { t } = useTranslation();
    const { openModal } = useModalsStore();
    const { accountData, updateAccount } = useAuth();
    const { wsClient } = useWebSocket();
    const [name, setName] = useState(accountData.name);
    const [description, setDescription] = useState(accountData.description);
    const coverInputRef = useRef(null);
    const avatarInputRef = useRef(null);
    const [coverUploading, setCoverUploading] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);

    const deleteAvatar = () => {
        const getDelete = () => {
            wsClient.send({
                type: 'social',
                action: 'change_profile/avatar/delete',
            });
            updateAccount({ avatar: null });
        };

        openModal({
            type: 'query',
            props: {
                title: t('are_you_sure'),
                message: 'Вы уверены что хотите удалить аватар?',
                onConfirm: getDelete,
            },
        });
    };

    const deleteCover = () => {
        const getDelete = () => {
            wsClient.send({
                type: 'social',
                action: 'change_profile/cover/delete',
            });
            updateAccount({ cover: null });
        };

        openModal({
            type: 'query',
            props: {
                title: t('are_you_sure'),
                text: 'Вы уверены что хотите удалить обложку?',
                onConfirm: getDelete,
            },
        });
    };

    const handleChangeFile = async (type, fileInputRef, setUploading) => {
        setUploading(true);
        const file = fileInputRef.current.files[0];

        if (file) {
            const arrayBuffer = await file.arrayBuffer();

            wsClient
                .send({
                    type: 'social',
                    action: `change_profile/${type}/upload`,
                    file: new Uint8Array(arrayBuffer),
                })
                .then((res: any) => {
                    if (res.status === 'success') {
                        setUploading(false);
                        updateAccount({
                            [type === 'avatar' ? 'avatar' : 'cover']:
                                res[type === 'avatar' ? 'avatar' : 'cover'],
                        });
                    } else if (res.status === 'error') {
                        setUploading(false);
                        openModal({
                            type: 'alert',
                            props: {
                                title: t('error'),
                                message: res.message,
                            },
                        });
                    }
                });
        } else {
            setUploading(false);
            openModal({
                type: 'alert',
                props: {
                    title: t('error'),
                    message: t('file_not_selected'),
                },
            });
        }
    };

    const changeAvatar = () =>
        handleChangeFile('avatar', avatarInputRef, setAvatarUploading);
    const changeCover = () =>
        handleChangeFile('cover', coverInputRef, setCoverUploading);

    const changeProfile = () => {
        const showError = (res) => {
            openModal({
                type: 'alert',
                props: {
                    title: t('error'),
                    message: res.message,
                },
            });
        };

        if (name !== accountData.name) {
            const data = {
                type: 'social',
                action: 'change_profile/name',
                name: name,
            };

            wsClient.send(data).then((res) => {
                if (res.status === 'success') {
                    updateAccount({ name: name });
                } else if (res.status === 'error') {
                    showError(res);
                }
            });
        }
        if (description !== accountData.description) {
            const data = {
                type: 'social',
                action: 'change_profile/description',
                description: description,
            };

            wsClient.send(data).then((res) => {
                if (res.status === 'success') {
                    updateAccount({ description: description });
                } else if (res.status === 'error') {
                    showError(res);
                }
            });
        }
    };

    const handlePartitionClick = ({ type, title, params }: any) => {
        const Element = getModal(type);

        openModal({
            type: 'routed',
            props: {
                title: title,
                children: (
                    <Element
                        handlePartitionClick={handlePartitionClick}
                        accountData={accountData}
                        params={params}
                    />
                ),
            },
        });
    };

    const changeShowListeningSong = (value) => {
        wsClient.send({
            type: 'social',
            action: 'account/settings/change',
            payload: {
                settings: {
                    show_listening_song: value
                }
            }
        })
        updateAccount({ settings: { show_listening_song: value } });
    }


    return (
        <>
            <Block>
                <div className="Settings-CP_Cover">
                    <Cover cover={accountData.cover} isUploading={coverUploading} />
                    <div className="Settings-ChangeButtons">
                        <input
                            id="S-CP_UPLOAD_COVER"
                            type="file"
                            accept="image/*"
                            autoComplete="off"
                            ref={coverInputRef}
                            onChange={changeCover}
                        />
                        <label htmlFor="S-CP_UPLOAD_COVER" className="Button">
                            {t('upload_button')}
                        </label>
                        <button onClick={deleteCover} className="ButtonDL">
                            {t('delete_button')}
                        </button>
                    </div>
                </div>
                <div className="Settings-CP_Avatar">
                    <Avatar
                        avatar={accountData.avatar}
                        name={accountData.username}
                        size={70}
                        isUploading={avatarUploading}
                    />
                    <div className="Settings-ChangeButtons">
                        <form
                            id="S-CP_UPLOAD_AVATAR_FORM"
                            encType="multipart/form-data"
                        >
                            <input
                                id="S-CP_UPLOAD_AVATAR"
                                type="file"
                                accept="image/*"
                                ref={avatarInputRef}
                                onChange={changeAvatar}
                            />
                        </form>
                        <label htmlFor="S-CP_UPLOAD_AVATAR" className="Button">
                            {t('upload_button')}
                        </label>
                        <button onClick={deleteAvatar} className="ButtonDL">
                            {t('delete_button')}
                        </button>
                    </div>
                </div>
                <div className="Settings-CP_Input_container">
                    <div className="Title">{t('settings_name')}</div>
                    <TextInput
                        className="UI-Input"
                        placeholder={t('input_text')}
                        value={name}
                        maxLength={60}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <QuestionModal
                        input={name}
                        target={accountData.name}
                        set={setName}
                        onApply={changeProfile}
                    />
                </div>
                <div className="Settings-CP_Input_container">
                    <div className="Title">{t('description')}</div>
                    <Textarea
                        className="UI-Input"
                        placeholder={t('input_text')}
                        value={description}
                        maxLength={1000}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <QuestionModal
                        input={description}
                        target={accountData.description}
                        set={setDescription}
                        onApply={changeProfile}
                    />
                </div>
                <Links
                    handlePartitionClick={handlePartitionClick}
                    accountData={accountData}
                />
            </Block>
            <MenuItems>
                <div className="UI-Parameter Item">
                    Показать песню которая сейчас играет
                    <Switch
                        checked={accountData.settings.show_listening_song}
                        onChange={(e) => {
                            changeShowListeningSong(e.target.checked);
                        }}
                    />
                </div>
            </MenuItems>
            <MenuItems>
                <SettingsButton
                    handlePartitionClick={handlePartitionClick}
                    t={t}
                    btn={{
                        type: 'change_username',
                        icon: <I_USERNAME />,
                        color: 'rgb(71 42 221)',
                        label: 'change_username',
                    }}
                />
                <SettingsButton
                    handlePartitionClick={handlePartitionClick}
                    t={t}
                    btn={{
                        type: 'change_email',
                        icon: <I_EMAIL />,
                        color: 'rgb(255 82 82)',
                        label: 'change_email',
                    }}
                />
                <SettingsButton
                    handlePartitionClick={handlePartitionClick}
                    t={t}
                    btn={{
                        type: 'change_password',
                        icon: <I_LOCK />,
                        color: 'rgb(71 42 221)',
                        label: 'change_password',
                    }}
                />
                <SettingsButton
                    handlePartitionClick={handlePartitionClick}
                    t={t}
                    btn={{
                        type: 'delete_account',
                        icon: <I_DELETE />,
                        color: 'rgb(255 82 82)',
                        label: 'delete_account',
                    }}
                />
            </MenuItems>

        </>
    );
};

export default EditProfile;
