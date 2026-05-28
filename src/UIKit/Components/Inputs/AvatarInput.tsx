import { I_UPLOAD_IMAGE } from '@/System/UI/IconPack';

interface AvatarInputProps {
    avatarPreview: string | null;
    name: string;
    onChange: any;
    isUploading: boolean;
    size?: number;
    style?: React.CSSProperties
}

const AvatarInput = ({ avatarPreview, name, onChange, isUploading, size = 100, style }: AvatarInputProps) => {
    const id = `avatar-${Math.random().toString(36)}`;

    return (
        <label className="UI-AvatarInput" htmlFor={id} style={style}>
            <div
                className="Avatar"
                style={{
                    width: size,
                    height: size
                }}
            >
                {
                    avatarPreview ? (
                        <img src={avatarPreview} draggable={false} />
                    ) : (
                        <div className="NonAvatar" style={{ fontSize: size * 0.5 }}>
                            {name?.length > 0
                                ? name.charAt(0)
                                : <I_UPLOAD_IMAGE style={{ width: size / 2, height: size / 2 }} />
                            }
                        </div>
                    )
                }
            </div>

            <input
                id={id}
                type="file"
                accept="image/*"
                onChange={onChange}
                disabled={isUploading}
                hidden
            />
        </label>
    );
}

export default AvatarInput;