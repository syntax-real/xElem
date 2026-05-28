import { motion } from 'framer-motion';
import { NavButton } from '../../../Components/Navigate';

export interface MenuItemProps {
  icon?: React.ReactNode;
  title: string;
  onClick?: () => void;
  to?: string;
  action?: React.ReactNode;
  className?: string;
  variants?: any;
  withBorder?: boolean;
}

export const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: { duration: 0.2 }
  }
};

export const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  onClick,
  to = '',
  action,
  className = '',
  variants = itemVariants,
  withBorder = false
}) => {
  const content = (
    <>
      {icon && (
        <div className="MenuItem-Icon">
          {icon}
        </div>
      )}
      <div className="MenuItem-Content">
        <div className="MenuItem-Title">{title}</div>
      </div>
      <div className="MenuItem-Action">
        {action || (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.58L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.58Z" />
          </svg>
        )}
      </div>
    </>
  );

  const baseClassName = `MenuItem ${withBorder ? 'MenuItem-WithBorder' : ''} ${className}`;

  if (to) {
    return (
      <motion.div variants={variants} key={`menu-item-${title}`}>
        <NavButton to={to} className={baseClassName} onClick={onClick}>
          {content}
        </NavButton>
      </motion.div>
    );
  }

  if (!onClick) {
    return null;
  }

  return (
    <motion.button variants={variants} className={baseClassName} onClick={onClick} key={`menu-item-${title}`}>
      {content}
    </motion.button>
  );
};

export default MenuItem; 