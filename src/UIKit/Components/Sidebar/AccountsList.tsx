import { motion } from 'framer-motion';
import { NavButton } from '../../../Components/Navigate';
import { Avatar, BackButton } from '../..';
import { itemVariants } from './MenuItem';

export interface Account {
  id: number;
  name: string;
  username?: string;
  avatar?: any;
  S_KEY: string;
}

export interface AccountsListProps {
  accounts: Account[];
  onSwitchAccount: (id: number) => void;
  onDeleteAccount: (id: number, S_KEY: string) => void;
  onBack: () => void;
  onAddAccount?: () => void;
  translations: {
    back: string;
    accounts: string;
    addAccount: string;
    exit: string;
  };
}

export const AccountsList: React.FC<AccountsListProps> = ({
  accounts,
  onSwitchAccount,
  onDeleteAccount,
  onBack,
  onAddAccount,
  translations
}) => {
  return (
    <div className="S-Content">
      <motion.div variants={itemVariants} className="Header">
        <BackButton
          onClick={onBack}
          style={{ marginLeft: 5 }}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="UI-PartitionName">{translations.accounts}</motion.div>
      <div className="MenuList" style={{ marginTop: 0 }}>
        {accounts.map((account, index) => (
          <motion.div
            key={account.id}
            className="Account"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            custom={index}
          >
            <button
              className="AccountButton"
              onClick={() => onSwitchAccount(account.id)}
            >
              <Avatar
                avatar={account.avatar}
                name={account.name}
                size="small"
              />
              <span>{account.name}</span>
            </button>

            {accounts.length > 1 && (
              <button
                className="DeleteButton"
                onClick={() => onDeleteAccount(account.id, account.S_KEY)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <motion.div variants={itemVariants} className="ButtonsGroup">
        <NavButton to="/auth" className="Button" onClick={onAddAccount}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          <span>{translations.addAccount}</span>
        </NavButton>
      </motion.div>
    </div>
  );
};

export default AccountsList; 