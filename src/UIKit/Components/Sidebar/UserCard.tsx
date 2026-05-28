import { Avatar } from '../..';

export interface UserCardProps {
  avatar: any;
  name: string;
  username: string;
  onClick?: () => void;
  showExpandIcon?: boolean;
  className?: string;
}

export const UserCard: React.FC<UserCardProps> = ({
  avatar,
  name,
  username,
  onClick,
  showExpandIcon = true,
  className = ''
}) => {
  return (
    <div className={`UserCard ${className}`} onClick={onClick}>
      <div className="UserAvatar">
        <Avatar 
          avatar={avatar} 
          name={name} 
          size="medium"
        />
      </div>
      <div className="UserInfo">
        <div className="Name">{name}</div>
        <div className="Username">@{username}</div>
      </div>
      {showExpandIcon && (
        <div className="ExpandButton">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default UserCard; 