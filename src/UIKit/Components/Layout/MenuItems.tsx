import clsx from "clsx";
import { ReactNode, CSSProperties } from "react";

interface MenuItemsProps {
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}

const MenuItems = ({ className, children, style }: MenuItemsProps) => {
  return (
    <div style={style} className={clsx("UI-MenuItems", className)}>
      {children}
    </div>
  );
};

export default MenuItems;
