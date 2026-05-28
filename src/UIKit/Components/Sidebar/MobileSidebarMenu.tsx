import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import Sidebar from './Sidebar';
import MenuItem, { itemVariants } from './MenuItem';
import UserCard from './UserCard';
import ChannelItem from './ChannelItem';
import AccountsList from './AccountsList';

import {
  I_EPACK,
  I_SETTINGS,
  I_AVATAR,
  I_MEGAPHONE,
  I_NOTIFICATIONS,
  I_HALL,
  I_WALLET
} from '../../../System/UI/IconPack.jsx';

export interface MobileSidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  accountData: any;
  accounts: any[];
  switchAccount: (id: number) => void;
  deleteAccount: (id: number) => void;
  onLogout: () => void;
}

const channelSectionVariants = {
  hidden: {
    height: 0,
    opacity: 0,
    transition: {
      duration: 0.1,
      ease: 'easeInOut'
    }
  },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: {
      duration: 0.1,
      ease: 'easeInOut',
    }
  }
};

export const MobileSidebarMenu: React.FC<MobileSidebarMenuProps> = ({
  isOpen,
  onClose,
  accountData,
  accounts,
  switchAccount,
  deleteAccount,
  onLogout
}) => {
  const { t } = useTranslation();
  const [isAccountListOpen, setIsAccountListOpen] = useState(false);
  const [isChannelsListOpen, setIsChannelsListOpen] = useState(false);

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  const handleDeleteAccount = (id: number) => {
    deleteAccount(id);
    setIsAccountListOpen(false);
  };

  const handleSwitchAccount = (id: number) => {
    switchAccount(id);
    setIsAccountListOpen(false);
  };

  const toggleChannelsList = () => {
    setIsChannelsListOpen(prev => !prev);
  };

  const showAccountsList = () => {
    setIsAccountListOpen(true);
  };

  const hideAccountsList = () => {
    setIsAccountListOpen(false);
  };

  const renderChannelList = useMemo(() => {
    if (!accountData?.channels || !Array.isArray(accountData.channels) || accountData.channels.length === 0) {
      return (
        <div className="Null" key="no-channels">{t('no_channels_yet')}</div>
      );
    }

    return accountData.channels.map((channel: any) => (
      <ChannelItem
        key={channel.id || channel.username || `channel-${Math.random()}`}
        channel={channel}
        onClick={onClose}
      />
    ));
  }, [accountData?.channels, accountData?.username, accountData?.name, accountData?.avatar, onClose, t]);

  return (
    <Sidebar isOpen={isOpen} onClose={onClose} className="MobileSidebarMenu">
      {isAccountListOpen ? (
        <AccountsList
          accounts={accounts}
          onSwitchAccount={handleSwitchAccount}
          onDeleteAccount={handleDeleteAccount}
          onBack={hideAccountsList}
          translations={{
            back: t('back'),
            accounts: t('accounts'),
            addAccount: t('add_account'),
            exit: t('exit')
          }}
        />
      ) : (
        <div className="S-Content MobileSidebarContent">
          <motion.div variants={itemVariants} className="Header">
            <UserCard
              avatar={accountData?.avatar}
              name={accountData?.name || ''}
              username={accountData?.username || ''}
              onClick={showAccountsList}
            />
          </motion.div>

          <motion.div variants={itemVariants} className="MenuList">
            <MenuItem
              icon={<div className="Icon"><I_AVATAR /></div>}
              title={t('my_profile')}
              to={`/e/${accountData?.username}`}
              onClick={onClose}
            />
          </motion.div>

          <motion.div variants={itemVariants} className="MenuList">
            <MenuItem
              icon={<div className="Icon"><I_WALLET /></div>}
              title={t('wallet')}
              to="/wallet"
              onClick={onClose}
            />
            <MenuItem
              icon={<div className="Icon"><I_NOTIFICATIONS /></div>}
              title={t('notifications_title')}
              to="/notifications"
              onClick={onClose}
            />

            <MenuItem
              icon={<div className="Icon"><I_MEGAPHONE /></div>}
              title={t('my_channels')}
              onClick={toggleChannelsList}
              withBorder={false}
              action={
                isChannelsListOpen ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 14l5-5 5 5z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                )
              }
            />

            <AnimatePresence>
              {isChannelsListOpen && (
                <motion.div
                  className="ChannelsSection"
                  variants={channelSectionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  {renderChannelList}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div variants={itemVariants} className="MenuList">
            <MenuItem
              icon={<div className="Icon"><I_SETTINGS /></div>}
              title={t('nav_settings')}
              to="/settings"
              onClick={onClose}
            />

            <MenuItem
              icon={<div className="Icon"><I_HALL /></div>}
              title={t('nav_hall')}
              to="/hall"
              onClick={onClose}
            />

            <MenuItem
              icon={<div className="Icon"><I_EPACK /></div>}
              title="EPACK"
              to="/epack"
              onClick={onClose}
            />

            <MenuItem
              icon={<img src="/static_sys/Images/GoldStar.svg" alt="Gold Star" className="GoldIcon" />}
              title={t('subscribe_gold')}
              to="/gold"
              onClick={onClose}
            />
          </motion.div>

          <motion.button
            variants={itemVariants}
            className="LogoutButton"
            onClick={handleLogout}
          >
            <span>{t('exit')}</span>
          </motion.button>
        </div>
      )}
    </Sidebar>
  );
};

export default MobileSidebarMenu; 