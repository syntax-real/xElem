import clsx from "clsx";

interface LiquidBlockProps {
  children: React.ReactNode;
  className?: string;
}

const LiquidBlock = ({ children, className }: LiquidBlockProps) => {
  return <div className={clsx("UI-LG_Block", className)}>{children}</div>;
};

export default LiquidBlock;
