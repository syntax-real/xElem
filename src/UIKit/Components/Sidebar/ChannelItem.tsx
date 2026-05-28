import { motion } from 'framer-motion';
import { NavButton } from '../../../Components/Navigate';
import { Avatar } from '../..';
import { itemVariants } from './MenuItem';

export interface ChannelItemProps {
  channel: {
    id?: string | number;
    username?: string;
    name?: string;
    avatar?: any;
  };
  onClick?: () => void;
  variants?: any;
}


const processChannelAvatar = (channelAvatar: any) => {
  let avatarToUse: any = null;
  
  if (!channelAvatar) {
    return null;
  }
  
  try {
    if (typeof channelAvatar === 'string') {
      if (channelAvatar.startsWith('{') || channelAvatar.startsWith('[')) {
        try {
          const parsed = JSON.parse(channelAvatar);
          if (parsed && typeof parsed === 'object') {
            if (parsed.file) {
              avatarToUse = {
                file: parsed.file,
                path: parsed.path || "",
                aura: parsed.aura || "rgb(127 110 176)",
                simple: parsed.simple || ""
              };
            } else if (parsed.avatar) {
              const nestedAvatar = typeof parsed.avatar === 'string' ? 
                JSON.parse(parsed.avatar) : parsed.avatar;
              
              avatarToUse = {
                file: nestedAvatar.file || "",
                path: nestedAvatar.path || "",
                aura: nestedAvatar.aura || "rgb(127 110 176)",
                simple: nestedAvatar.simple || ""
              };
            }
          }
        } catch (e) {
          
        }
      } else {
        avatarToUse = channelAvatar;
      }
    } else if (typeof channelAvatar === 'object' && channelAvatar !== null) {
      if (channelAvatar.file) {
        avatarToUse = {
          file: channelAvatar.file,
          path: channelAvatar.path || "",
          aura: channelAvatar.aura || "rgb(127 110 176)",
          simple: channelAvatar.simple || ""
        };
      } else if (channelAvatar.avatar) {
        const nestedAvatar = typeof channelAvatar.avatar === 'string' ? 
          JSON.parse(channelAvatar.avatar) : channelAvatar.avatar;
        
        avatarToUse = {
          file: nestedAvatar.file || "",
          path: nestedAvatar.path || "",
          aura: nestedAvatar.aura || "rgb(127 110 176)",
          simple: nestedAvatar.simple || ""
        };
      }
    }
  } catch (e) {
    
  }
  
  return avatarToUse;
};

export const ChannelItem: React.FC<ChannelItemProps> = ({
  channel,
  onClick,
  variants = itemVariants
}) => {
  const avatarToUse = processChannelAvatar(channel.avatar);
  const displayName = channel.name || channel.username || "Channel";
  
  return (
    <motion.div variants={variants} key={channel.id || channel.username || `channel-${Math.random()}`}>
      <NavButton 
        to={`/e/${channel.username || ''}`} 
        className="MenuItem ChannelMenuItem" 
        onClick={onClick}
      >
        <div className="MenuItem-Avatar">
          <Avatar 
            avatar={avatarToUse} 
            name={displayName} 
            size="small"
          />
        </div>
        <div className="MenuItem-Content">
          <div className="MenuItem-Title">
            <span className="ChannelName">{displayName}</span>
          </div>
        </div>

      </NavButton>
    </motion.div>
  );
};

export default ChannelItem; 