import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Animate } from "../../System/Elements/Function";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";
import MiniPlayer from "./MiniPlayer";
import { I_DOWNLOAD, I_MUSIC } from "../../System/UI/IconPack";
import SearchResult from "./SearchResult";
import NavPanel from "./NavPanel";
import MobileSidebar from "./MobileSidebar";
import { Avatar, Bubble, TextInput } from "../../UIKit";
import { useAuth } from "../../System/Hooks/useAuth";
import { useDownloadStore } from "../../Store/downloadStore";
import Downloads from "./Downloads";
import { usePlayerStore } from "../../Store/playerStore";
import useSettingsStore from "../../Store/settingsStore";

interface TopBarProps {
  title?: boolean;
  search?: boolean;
  titleText?: string;
  className?: string;
}

const TopBar: React.FC<TopBarProps> = ({ title, search, titleText }) => {
  const { t } = useTranslation();
  const { accountData } = useAuth();
  const { showDownloads } = useSettingsStore();
  const songSelected = usePlayerStore((state) => state.songSelected);
  const navigate = useNavigate();
  const { downloads } = useDownloadStore();
  const [isMobile, setIsMobile] = useState<boolean>(
    () => window.innerWidth <= 768,
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [notificationsVisible, setNotificationsVisible] =
    useState<boolean>(false);
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(false);

  const panelHidden = useSelector((state: any) => state.ui.topPanelHidden);

  const [searchValue, setSearchValue] = useState<string>("");
  const [isNavPanelOpen, setIsNavPanelOpen] = useState(false);
  const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState<boolean>(false);

  const navPanelRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const variants = useMemo(
    () => ({
      hidden: { opacity: 0, y: -20, scale: 0.9 },
      visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.1 } },
    }),
    [],
  );

  useEffect(() => {
    const checkIfMobile = () => {
      const isMobileNow = window.innerWidth <= 768;
      setIsMobile(isMobileNow);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const toggleNavPanel = () => {
    if (isMobile) {
      setMobileSidebarOpen(true);
      if (notificationsVisible) setNotificationsVisible(false);
      return;
    }

    if (isNavPanelOpen) {
      closePanel();
    } else {
      openPanel();
    }
  };

  const openPanel = () => {
    Animate(".UI-NavPanel", "NAV_PANEL_BUTTONS-SHOW", 0.3);
    setIsNavPanelOpen(true);
  };

  const closePanel = () => {
    Animate(".UI-NavPanel", "NAV_PANEL_BUTTONS-HIDE", 0.3);
    setIsNavPanelOpen(false);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  const goToBalance = useCallback(() => {
    navigate("/wallet");
  }, [navigate]);

  useEffect(() => {
    const updatePosition = () => {
      if (!isNavPanelOpen || !navPanelRef.current || !avatarRef.current) return;

      const avatarRect = avatarRef.current.getBoundingClientRect();
      const navPanel = navPanelRef.current;

      const top = avatarRect.bottom + window.scrollY;
      const left = avatarRect.left + window.scrollX;

      navPanel.style.position = "absolute";
      navPanel.style.top = `${top + 10}px`;
      navPanel.style.left = `${left + 45}px`;
      navPanel.style.zIndex = "30";
    };

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isNavPanelOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isNavPanelOpen && !notificationsVisible) return;
      const target = event.target as Element;
      if (
        !target.closest(".UI-NavPanel") &&
        !target.closest(".AvatarContainer") &&
        !(avatarRef.current && avatarRef.current.contains(target))
      ) {
        isNavPanelOpen && closePanel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNavPanelOpen, notificationsVisible]);

  return (
    <AnimatePresence>
      {!panelHidden && (
        <>
          <motion.header
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
          >
            <div className="UI-N_DIV">
              {accountData?.id ? (
                <>
                  {title ? (
                    <div className="UI-N_L_AND_N">
                      <NavLink className="UI-Logo" to="/" />
                      <div>{titleText}</div>
                    </div>
                  ) : (
                    <NavLink className="UI-Logo" to="/" />
                  )}
                  <motion.div
                    className="Search-Container"
                    initial={shouldAnimate ? "hidden" : false}
                    animate="visible"
                    exit="exit"
                    variants={variants}
                  >
                    {search && (
                      <TextInput
                        className="UI-Bubble Search"
                        placeholder={t("search")}
                        value={searchValue}
                        onChange={(e) => {
                          setSearchValue(e.target.value);
                        }}
                        type="text"
                        transparent={true}
                      />
                    )}
                    <Bubble
                      className="EBalls"
                      onClick={goToBalance}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="UI-Eball">E</div>
                      <div className="Count">
                        {typeof accountData?.e_balls === "number"
                          ? accountData.e_balls.toFixed(3)
                          : Number(accountData?.e_balls || 0).toFixed(3)}
                      </div>
                    </Bubble>
                    {songSelected && (
                      <button
                        className="SwitchButton"
                        onClick={() => {
                          setIsMusicPlayerOpen((prev) => !prev);
                          setShouldAnimate(true);
                        }}
                      >
                        <I_MUSIC />
                      </button>
                    )}
                    {showDownloads && Object.values(downloads).length > 0 && (
                      <button
                        className="SwitchButton"
                        onClick={() => {
                          setIsDownloadsOpen(true);
                          setShouldAnimate(true);
                        }}
                      >
                        <I_DOWNLOAD />
                      </button>
                    )}
                  </motion.div>
                  <div className="AvatarContainer" ref={avatarRef}>
                    <Avatar
                      avatar={accountData.avatar}
                      name={accountData.name}
                      size={40}
                      onClick={toggleNavPanel}
                    />
                  </div>
                </>
              ) : (
                <div className="UI-N_L_AND_N">
                  <NavLink className="UI-Logo" to="/auth" />
                  <span>Element</span>
                </div>
              )}
            </div>
          </motion.header>

          {!isMobile && (
            <div ref={navPanelRef}>
              <NavPanel />
            </div>
          )}

          <SearchResult searchValue={searchValue} />

          <AnimatePresence>
            {isMusicPlayerOpen && !searchValue && (
              <MiniPlayer
                setIsMusicPlayerOpen={setIsMusicPlayerOpen}
                variants={variants}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {isDownloadsOpen && !searchValue && (
              <Downloads
                setIsDownloadsOpen={setIsDownloadsOpen}
                variants={variants}
              />
            )}
          </AnimatePresence>

          {isMobile && (
            <MobileSidebar
              isOpen={mobileSidebarOpen}
              onClose={closeMobileSidebar}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default TopBar;
