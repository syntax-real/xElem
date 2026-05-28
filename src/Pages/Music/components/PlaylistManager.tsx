import { useTranslation } from 'react-i18next';
import { useModalsStore } from '@/Store/modalsStore';
import { useWebSocket } from '@/System/Context/WebSocket';
import { ChangeEvent, useState } from 'react';
import { Button, DropdownSelect, Textarea, TextInput } from '@/UIKit';
import { useDispatch, useSelector } from 'react-redux';
import { setLibrary } from '@/Store/slices/music/musicPlayer';
import { useAuth } from '@/System/Hooks/useAuth';
import { imageToBase64 } from '@/System/Elements/Function';
import { I_UPLOAD_IMAGE } from '@/System/UI/IconPack';

const PlaylistManager = ({ onClose, isEdit = false, playlist }: any) => {
    const { t } = useTranslation();
    const { wsClient } = useWebSocket();
    const { openModal } = useModalsStore() as any;
    const { accountData } = useAuth();
    const myLibrary = useSelector((state: any) => state.musicPlayer.my_library);
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [coverPreview, setCoverPreview] = useState<any>(null);
    const [coverFile, setCoverFile] = useState<any>(null);
    const [name, setName] = useState<string>(isEdit ? playlist.name : '');
    const [description, setDescription] = useState<string>(
        isEdit ? playlist.description : '',
    );
    const [privacy, setPrivacy] = useState<number>(
        isEdit ? playlist.privacy : 0,
    );

    const create = async () => {
        setIsLoading(true);

        try {
            const payload: any = {
                name,
                description,
                privacy,
            };

            if (coverFile) {
                payload.cover = new Uint8Array(await coverFile.arrayBuffer());
            }

            const res = await wsClient.send({
                type: 'social',
                action: 'music/playlists/create',
                payload,
            });

            setIsLoading(false);

            if (res.status === 'success') {
                dispatch(
                    setLibrary([
                        {
                            id: res.playlist_id,
                            type: 1,
                            title: name,
                            author: { name: accountData.name },
                            add_date: Date.now()
                        },
                        ...myLibrary,
                    ]),
                );
                onClose?.();
            } else {
                openModal({
                    type: 'alert',
                    props: {
                        title: t('error'),
                        message: res.message,
                    },
                });
            }
        } catch (e) {
            setIsLoading(false);
        }
    };

    const edit = async () => {
        let payload: any = {};

        payload.playlist_id = playlist.id;
        if (name !== playlist.name) payload.name = name;
        if (description !== playlist.description)
            payload.description = description;
        if (privacy !== playlist.privacy) payload.privacy = privacy;
        if (coverFile) {
            payload.cover = new Uint8Array(await coverFile.arrayBuffer());
        }

        wsClient
            .send({
                type: 'social',
                action: 'music/playlists/edit',
                payload,
            })
            .then((res) => {
                if (res.status === 'success') {
                    dispatch(
                        setLibrary(
                            myLibrary.map((p: any) =>
                                p.id === playlist.id
                                    ? {
                                        ...p,
                                        title: payload.name ?? p.title,
                                        description:
                                            payload.description ??
                                            p.description,
                                        privacy: payload.privacy ?? p.privacy,
                                    }
                                    : p,
                            ),
                        ),
                    );
                    onClose?.();
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
    };

    const list = [
        {
            title: t('public'),
            key: 0,
        },
        {
            title: t('private'),
            key: 1,
        },
        {
            title: t('link_only'),
            key: 2,
        },
    ];

    const handleClick = () => {
        if (isEdit) {
            edit();
        } else {
            create();
        }
    };

    const handleCover = async (
        event: ChangeEvent<HTMLInputElement>,
    ): Promise<void> => {
        const file = event.target.files && event.target.files[0];
        setCoverFile(file);

        if (file) {
            const b64 = await imageToBase64(file);
            setCoverPreview(b64);
        }
    };

    return (
        <>
            <div className="Inputs">
                <div
                    className="UI-AppIcon"
                    style={{ borderRadius: 14, margin: '0 auto 10px auto' }}
                >
                    <input
                        id="PlaylistCover"
                        type="file"
                        accept="image/*"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            if (e.target.files && e.target.files.length > 0) {
                                handleCover(e);
                            }
                        }}
                    />
                    <label htmlFor="PlaylistCover"></label>
                    {coverPreview ? (
                        <img
                            src={coverPreview}
                            alt="Playlist Cover"
                            draggable={false}
                        />
                    ) : (
                        <I_UPLOAD_IMAGE />
                    )}
                </div>
                <TextInput
                    placeholder={t('input_name')}
                    value={name}
                    maxLength={60}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setName(e.target.value)
                    }
                />
                <Textarea
                    placeholder={t('input_description')}
                    value={description}
                    maxLength={1000}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                        setDescription(e.target.value)
                    }
                />

                <div className="UI-Parameter" style={{ margin: '10px 0px' }}>
                    <span>{t('privacy')}</span>
                    <DropdownSelect
                        list={list}
                        selected={privacy}
                        setSelected={(i) => setPrivacy(list[i].key)}
                    />
                </div>
            </div>

            <Button
                title={isEdit ? t('change') : t('create')}
                isActive={
                    isEdit
                        ? name !== playlist.name ||
                        description !== playlist.description ||
                        privacy !== playlist.privacy || coverFile !== undefined
                        : name !== ''
                }
                isLoading={isLoading}
                buttonStyle="action"
                onClick={handleClick}
                style={{ marginBottom: 5 }}
            />
        </>
    );
};

export default PlaylistManager;
