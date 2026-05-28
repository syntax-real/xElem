import { motion, AnimatePresence, Variants } from "framer-motion";
import { I_CLOSE } from "../UI/IconPack";
import clsx from "clsx";
import { Backdrop } from "../../UIKit/Components/Modals/Backdrop";
import { cloneElement, isValidElement } from "react";

export const Modal: React.FC = () => null;

interface UniversalPanelProps {
  className?: string;
  children: React.ReactNode;
  isOpen: boolean;
}

export const UniversalPanel: React.FC<UniversalPanelProps> = ({
  className = "",
  children,
  isOpen,
}) => {
  const variants: Variants = {
    open: {
      opacity: 1,
      visibility: "visible",
    },
    closed: {
      opacity: 0,
      visibility: "hidden",
    },
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={clsx("UI-UniversalPanel", "UI-LG_Block", className)}
          variants={variants}
          initial="closed"
          animate="open"
          exit="closed"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface WindowProps {
  title?: string;
  content?: React.ReactNode;
  className?: string;
  contentClass?: string;
  style?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  isOpen?: boolean;
  setOpen?: (open: boolean) => void;
  layoutId?: string;
  children?: React.ReactNode;
  childrenClassName?: string;
  onCloseModal?: () => void;
  onAnimationComplete?: () => void;
  zIndex?: number;
}

export const Window: React.FC<WindowProps> = ({
  title,
  content,
  className = "",
  contentClass = "",
  style,
  contentStyle,
  isOpen,
  setOpen,
  layoutId,
  children,
  childrenClassName,
  onCloseModal,
  onAnimationComplete,
  zIndex,
}) => {
  const handleClose = () => {
    if (onCloseModal) {
      onCloseModal();
    }
    if (setOpen) {
      setOpen(false);
    }
  };

  const renderContent = () => {
    return isValidElement(children)
      ? cloneElement(children, { onClose: handleClose })
      : children;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Backdrop />
          <motion.div
            className={clsx("UI-ActionWindow", className)}
            style={{
              ...style,
              ...(zIndex !== undefined && { zIndex }),
            }}
            initial={{ opacity: 0, visibility: "visible" }}
            animate={{ opacity: 1, visibility: "visible" }}
            exit={{ opacity: 0, visibility: "hidden" }}
            transition={{ duration: 0.1 }}
            layoutId={layoutId}
            onAnimationComplete={(definition) => {
              if (definition === "exit" && onAnimationComplete) {
                onAnimationComplete();
              }
            }}
          >
            <div className="TopBar">
              <div className="Title">{title}</div>
              <button onClick={handleClose}>
                <I_CLOSE />
              </button>
            </div>
            <div
              className={clsx("UI-AW_Content", contentClass, childrenClassName)}
              style={contentStyle}
            >
              {content}
              {renderContent()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
