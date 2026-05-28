import clsx from "clsx";

interface ButtonProps {
  title?: string;
  type?: "submit" | "reset" | "button";
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  buttonStyle?: any;
  isLoading?: boolean;
  isActive?: boolean;
  children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  title,
  type,
  onClick,
  className,
  style,
  buttonStyle,
  isLoading = false,
  isActive = true,
  children,
}) => {
  const handleClick = () => {
    if (!isLoading && isActive && onClick) {
      onClick();
    }
  };

  const getStyleClass = () => {
    switch (buttonStyle) {
      case "action":
        return "UI-Button--action";
      case "block":
        return "UI-Button--block";
      default:
        return "";
    }
  };

  return (
    <button
      className={clsx("UI-Button", className, getStyleClass(), {
        "UI-Button--noActive": !isActive,
      })}
      onClick={handleClick}
      type={type}
      style={style}
    >
      {isLoading && <div className="UI-PRELOAD"></div>}
      {title}
      {children}
    </button>
  );
};

export default Button;
