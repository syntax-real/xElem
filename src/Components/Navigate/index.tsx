import { useNavigate, useLocation } from "react-router-dom";
import {
  I_HOME,
  I_MESSENGER,
  I_MUSIC,
  I_SETTINGS,
  I_EPACK,
  I_PANEL,
  I_GOLD_STAR_GRADIENT,
  I_NOTIFICATIONS,
  I_WALLET,
} from "../../System/UI/IconPack";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import TopBar from "./TopBar";
import MobileSidebar from "./MobileSidebar";
import { useAuth } from "../../System/Hooks/useAuth";
import { Notifications } from "../../UIKit";

export { TopBar, MobileSidebar };

interface NavButtonProps {
  to: string;
  className?: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

interface LeftNavButtonProps {
  target: string;
  currentPage?: string;
  className?: string;
  children: React.ReactNode;
}

export const NavButton: React.FC<NavButtonProps> = ({
  to,
  className,
  children,
  onClick,
  style,
}) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
      if (e.defaultPrevented) {
        return;
      }
    }
    navigate(to);
  };

  return (
    <button onClick={handleClick} className={className} style={style}>
      {children}
    </button>
  );
};

export const LeftNavButton: React.FC<LeftNavButtonProps> = ({
  target,
  currentPage,
  children,
  className,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveClass = (path: string) => {
    if (currentPage) {
      return location.pathname === `/${currentPage}/${target}`
        ? "ActiveButton"
        : "";
    } else {
      return currentPage
        ? currentPage === path
          ? "ActiveButton"
          : ""
        : location.pathname === path
          ? "ActiveButton"
          : "";
    }
  };

  const handleClick = () => {
    if (currentPage) {
      navigate(`/${currentPage}/${target}`);
    } else {
      navigate(target);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={clsx(className, getActiveClass(target))}
    >
      {children}
    </button>
  );
};

export const LeftBar: React.FC = () => {
  const { t } = useTranslation();
  const { accountData } = useAuth();

  return (
    <div className="UI-L_NAV UI-Bubble UI-B_FIRST">
      <LeftNavButton target="/">
        <div className="UI-LN_ICON">
          <I_HOME />
        </div>
        {t("nav_home")}
      </LeftNavButton>
      <LeftNavButton target="/notifications">
        <div className="UI-LN_ICON">
          <I_NOTIFICATIONS />
        </div>
        {t("notifications_title")}
        <Notifications count={accountData.notifications} />
      </LeftNavButton>
      <LeftNavButton className="MobileHidden" target="/wallet">
        <div className="UI-LN_ICON">
          <I_WALLET />
        </div>
        {t("wallet")}
      </LeftNavButton>
      {["admin", "moderator"].includes(accountData?.role) && (
        <LeftNavButton target="/panel/stat">
          <div className="UI-LN_ICON">
            <I_PANEL />
          </div>
          {t("nav_panel")}
        </LeftNavButton>
      )}
      <LeftNavButton target="/chat">
        <div className="UI-LN_ICON">
          <I_MESSENGER />
        </div>
        {t("nav_messenger")}
        <Notifications count={accountData.messenger_notifications} />
      </LeftNavButton>
      <LeftNavButton target="/music">
        <div className="UI-LN_ICON">
          <I_MUSIC />
        </div>
        {t("nav_music")}
      </LeftNavButton>
      <LeftNavButton className="MobileHidden" target="/settings">
        <div className="UI-LN_ICON">
          <I_SETTINGS />
        </div>
        {t("nav_settings")}
      </LeftNavButton>
    </div>
  );
};
