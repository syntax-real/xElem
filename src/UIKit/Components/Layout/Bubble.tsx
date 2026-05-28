import clsx from "clsx";

interface BubbleParams {
  children: any;
  style?: any;
  className?: string;
  onClick?: () => void;
}

const Bubble = ({ children, className, style, onClick }: BubbleParams) => {
  return (
    <div
      className={clsx("UI-Bubble", className)}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
};

export default Bubble;
