import clsx from "clsx";
import { motion } from "framer-motion";
import { memo } from "react";

interface AddButtonProps {
  title?: string;
  onClick?: () => void;
  className?: string;
  layoutId?: string;
}

const AddButton: React.FC<AddButtonProps> = ({
  title,
  onClick,
  className,
  layoutId,
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <motion.button
      className={clsx("UI-AddButton", className)}
      onClick={handleClick}
      layoutId={layoutId}
    >
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path
          d="m0 0h24v24h-24z"
          opacity="0"
          transform="matrix(-1 0 0 -1 24 24)"
        />
        <path d="m19 11h-6v-6a1 1 0 0 0 -2 0v6h-6a1 1 0 0 0 0 2h6v6a1 1 0 0 0 2 0v-6h6a1 1 0 0 0 0-2z" />
      </svg>
      {title}
    </motion.button>
  );
};

export default memo(AddButton);
