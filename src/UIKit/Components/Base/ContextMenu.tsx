import { useState, useEffect, useRef, MouseEvent, memo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { I_BACK } from '../../../System/UI/IconPack';
import { useTranslation } from 'react-i18next';

interface ContextMenuItem {
  icon: React.ReactNode;
  title: string;
  onClick?: (props?: any) => void;
  children?: ContextMenuItem[];
  divider?: boolean;
  color?: string;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  isActive?: boolean;
  children: React.ReactNode;
  className?: string;
  props?: any;
  header?: React.ReactNode;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ items, isActive = true, children, className = '', props = {}, header }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuStack, setMenuStack] = useState<ContextMenuItem[][]>([items]);
  const currentMenu = menuStack[menuStack.length - 1];

  const handleBack = () => {
    setMenuStack(prev => prev.slice(0, -1));
  };

  const handleItemClick = useCallback((item: ContextMenuItem) => {
    if (item.children) {
      setMenuStack(prev => [...prev, item.children!]);
      return;
    }

    item.onClick?.(props);
    setIsOpen(false);
  }, [props]);

  useEffect(() => {
    if (isOpen) {
      setMenuStack([items]);
    }
  }, [isOpen, items]);

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    if (!isActive) return;

    if (containerRef.current) {
      const firstChild = containerRef.current.firstElementChild as HTMLElement;
      if (firstChild) {
        const rect = firstChild.getBoundingClientRect();
        if (
          e.clientX < rect.left || e.clientX > rect.right ||
          e.clientY < rect.top || e.clientY > rect.bottom
        ) {
          return;
        }
      }
    }

    const x = e.clientX;
    const y = e.clientY;

    setPosition({ x, y });
    setIsOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let { x, y } = position;

      if (x + rect.width > window.innerWidth) {
        x = window.innerWidth - rect.width - 8;
      }
      if (y + rect.height > window.innerHeight) {
        y = y - rect.height;
        if (y < 0) y = 8;
      }
      if (x < 0) x = 8;

      setAdjustedPosition({ x, y });
    } else {
      setAdjustedPosition(position);
    }
  }, [isOpen, position]);

  const variants = {
    show: {
      opacity: 1,
      boxShadow: '0px 1px 10px 1px var(--AIR_CONTEXT_SHADOW_COLOR_END)',
      transition: { duration: 0.1 }
    },
    hide: {
      opacity: 0,
      boxShadow: '0px 0px 0px 0px var(--AIR_CONTEXT_SHADOW_COLOR_START)',
      transition: { duration: 0.1 }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`UI-ContextMenu-Container ${className}`}
      onContextMenu={handleContextMenu}
    >
      {children}

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={menuRef}
              className="UI-LG_Block UI-GovernButtons"
              style={{
                position: 'fixed',
                top: adjustedPosition.y,
                left: adjustedPosition.x,
                right: 'auto',
                zIndex: 99999
              }}
              initial="hide"
              animate="show"
              exit="hide"
              variants={variants}
            >
              {header && <div className="ContextMenu-Header" onClick={() => setIsOpen(false)}>{header}</div>}
              <div className="Container">
                {menuStack.length > 1 && (
                  <button onClick={handleBack}>
                    <I_BACK />
                    {t('back')}
                  </button>
                )}

                {currentMenu.map((item, index) => (
                  <button
                    key={index}
                    style={item.color ? { color: item.color } : undefined}
                    onClick={() => handleItemClick(item)}
                  >
                    {item.icon}
                    {item.title}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default memo(ContextMenu, (prev, next) => {
  return (
    prev.isActive === next.isActive &&
    prev.className === next.className &&
    prev.header === next.header &&
    prev.children === next.children &&
    prev.items === next.items &&
    prev.props === next.props
  );
});