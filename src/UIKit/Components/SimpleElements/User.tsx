import { useTranslation } from 'react-i18next';
import { HandleSubscribers, HandleUserIcons } from '../../../System/Elements/Handlers';
import Avatar from '../Base/Avatar';

interface UserProps {
    user: any;
    onClick?: any;
}

const User = ({ user, onClick }: UserProps) => {
    const { t } = useTranslation();

    return (
        <button
            className="UI-ListElement"
            onClick={onClick}
        >
            <Avatar
                avatar={user.avatar}
                name={user.name}
                size={40}
            />
            <div className="Body">
                <div className="UI-NameBody">
                    <div className="Name">
                        {user.name || t('deleted_account')}
                    </div>
                    {user.icons && (
                        <HandleUserIcons icons={user.icons} />
                    )}
                </div>
                <div className="Desc">
                    <HandleSubscribers count={user.subscribers} />
                    {' • '}
                    {user.posts} постов
                </div>
            </div>
        </button>
    )
}

export default User;