import { useClickAway } from "@uidotdev/usehooks";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { I_BACK } from "../../../System/UI/IconPack";
import { useTranslation } from "react-i18next";

interface GovernButtonProps {
  isOpen: boolean;
  setIsOpen?: any;
  buttons: any[];
}

interface GovernButton {
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
  color?: string;
  children?: GovernButton[];
}

const GovernButtons = ({ isOpen, setIsOpen, buttons }: GovernButtonProps) => {
  const { t } = useTranslation();
  const [stack, setStack] = useState<GovernButton[][]>([buttons]);
  const current = stack[stack.length - 1];
  const ref: any = useClickAway(() => {
    if (setIsOpen) {
      setIsOpen(false);
    }
  });

  const goBack = () => {
    setStack((prev) => prev.slice(0, -1));
  };

  const handleClick = (btn: GovernButton) => {
    if (btn.children?.length) {
      setStack((prev) => [...prev, btn.children!]);
      return;
    }

    btn.onClick?.();
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) {
      setStack([buttons]);
    }
  }, [isOpen, buttons]);

  const variants = {
    show: {
      opacity: 1,
      boxShadow: "0px 1px 10px 1px var(--AIR_CONTEXT_SHADOW_COLOR_END)",
      transition: { duration: 0.2 },
    },
    hide: {
      opacity: 0,
      boxShadow: "0px 0px 0px 0px var(--AIR_CONTEXT_SHADOW_COLOR_START)",
      transition: { duration: 0.2 },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="UI-LG_Block UI-GovernButtons"
          variants={variants}
          initial="hide"
          animate="show"
          exit="hide"
          ref={ref}
        >
          <div className="Container">
            {stack.length > 1 && (
              <button onClick={goBack}>
                <I_BACK />
                {t("back")}
              </button>
            )}

            {current.map((button, i) => (
              <button
                key={i}
                onClick={() => handleClick(button)}
                style={{ color: button.color || undefined }}
              >
                {button.icon}
                {button.title}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GovernButtons;
