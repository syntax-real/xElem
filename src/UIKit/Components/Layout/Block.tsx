import clsx from "clsx";

interface BlockProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const Block = ({ children, className, style, onClick }: BlockProps) => {
  return (
    <div
      className={clsx("UI-Block", className)}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Block;
