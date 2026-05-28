import { useTranslation } from 'react-i18next';
import { useModalsStore } from '@/Store/modalsStore';
import { useWebSocket } from '@/System/Context/WebSocket';
import { ChangeEvent, useState } from 'react';
import { AvatarInput, Button, TextInput } from '@/UIKit';
import { imageToBase64 } from '@/System/Elements/Function';
import { useNavigate } from 'react-router-dom';

const ArtistManager = ({ onClose, isEdit = false, artist }: any) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { wsClient } = useWebSocket();
    const { openModal } = useModalsStore() as any;
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [avatarPreview, setAvatarPreview] = useState<any>(null);
    const [avatarFile, setAvatarFile] = useState<any>(null);
    const [name, setName] = useState<string>(isEdit ? artist.name : '');
    const [slug, setSlug] = useState<string>(isEdit ? artist.slug : '');

    const create = async () => {
        setIsLoading(true);

        try {
            const payload: any = {
                name,
                slug
            };

            if (avatarFile) {
                payload.avatar = new Uint8Array(await avatarFile.arrayBuffer());
            }

            const res = await wsClient.send({
                type: 'social',
                action: 'music/artists/create',
                payload,
            });

            setIsLoading(false);

            if (res.status === 'success') {
                navigate(`/music/artists/${slug}`);
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

    const handleClick = () => {
        if (isEdit) {
            return;
        } else {
            create();
        }
    };

    const handleAvatar = async (
        event: ChangeEvent<HTMLInputElement>,
    ): Promise<void> => {
        const file = event.target.files && event.target.files[0];
        setAvatarFile(file);

        if (file) {
            const b64 = await imageToBase64(file);
            setAvatarPreview(b64);
        }
    };

    return (
        <>
            <div className="Inputs">
                <AvatarInput
                    avatarPreview={avatarPreview}
                    name={name}
                    onChange={handleAvatar}
                    isUploading={false}
                    style={{ margin: '0 auto 10px' }}
                />
                <TextInput
                    placeholder={t('music.input_artist_name')}
                    value={name}
                    maxLength={60}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setName(e.target.value)
                    }
                />
                <TextInput
                    placeholder={t('music.input_artist_slug')}
                    value={slug}
                    maxLength={60}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setSlug(e.target.value)
                    }
                />
            </div>

            <Button
                title={isEdit ? t('change') : t('create')}
                isLoading={isLoading}
                buttonStyle="action"
                onClick={handleClick}
                style={{ marginBottom: 5 }}
            />
        </>
    );
};

export default ArtistManager;
