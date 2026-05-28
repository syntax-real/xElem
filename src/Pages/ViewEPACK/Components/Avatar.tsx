const detectBase64Mime = (value) => {
    if (!value || typeof value !== 'string') {
        return 'image/jpeg';
    }

    const normalized = value.trim();

    if (normalized.startsWith('R0lGOD')) return 'image/gif';
    if (normalized.startsWith('iVBORw0KGgo')) return 'image/png';
    if (normalized.startsWith('/9j/')) return 'image/jpeg';
    if (normalized.startsWith('UklGR')) return 'image/webp';

    return 'image/jpeg';
};

const toAvatarSrc = (avatar) => {
    if (!avatar || typeof avatar !== 'string') {
        return null;
    }

    const normalized = avatar.trim();
    if (!normalized) {
        return null;
    }

    if (normalized.startsWith('data:image/')) {
        return normalized;
    }

    return `data:${detectBase64Mime(normalized)};base64,${normalized}`;
};

const Avatar = ({ avatar, name }) => {
    const avatarSrc = toAvatarSrc(avatar);

    return (
        <div className="Avatar" style={{ width: 40, height: 40 }}>
            {
                avatarSrc
                    ? <img src={avatarSrc} alt="фыр" />
                    : <div className="NonAvatar">{name[0] || '?'}</div>
            }
        </div>
    )
};

export default Avatar;
