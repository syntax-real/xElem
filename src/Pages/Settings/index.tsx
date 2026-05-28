import { useEffect, useState } from "react";
import {
  I_ACCOUNT,
  I_ADVANCED,
  I_DEVICES,
  I_INFO,
  I_LANG,
  I_STORAGE,
  I_USERS,
  I_WARNING,
} from "../../System/UI/IconPack";
import { useTranslation } from "react-i18next";
import Themes from "./components/Themes";
import { useModalsStore } from "../../Store/modalsStore";
import { BackButton, Block, MenuItems } from "../../UIKit";
import { useAuth } from "../../System/Hooks/useAuth";
import "../../System/UI/ThemePrev.scss";
import "./Settings.scss";
import getModal from "./utils/gitModal";
import { useLocation, useNavigate, useRoutes } from "react-router-dom";
import Account from "./pages/Account";
import { ROUTES } from "./routes";
import SettingsButton from "./components/SettingsButton";
import Sessions from "./pages/Sessions";
import Storage from "./pages/Storage";
import Status from "./pages/Status";
import ChangeLanguage from "./pages/ChangeLanguage";
import Authors from "./pages/Authors";
import AdvancedSettings from "./pages/AdvancedSettings";
import MyReports from "./pages/MyReports";
import { isMobile } from "react-device-detect";

const routes = [
  {
    path: "*",
    element: <Account />,
  },
  {
    path: "account",
    element: <Account />,
  },
  {
    path: "sessions",
    element: <Sessions />,
  },
  {
    path: "status",
    element: <Status />,
  },
  {
    path: "language",
    element: <ChangeLanguage />,
  },
  {
    path: "authors",
    element: <Authors />,
  },
  {
    path: "advanced",
    element: <AdvancedSettings />,
  },
  {
    path: "storage",
    element: <Storage />,
  },
  {
    path: "reports",
    element: <MyReports />,
  },
];

const ACCOUNT_BUTTONS = [
  {
    to: ROUTES.SETTINGS.ACCOUNT,
    icon: <I_ACCOUNT />,
    color: "rgb(71 42 221)",
    label: "partition_account",
  },
];

const CONFIDENTIALITY_BUTTONS = [
  {
    to: ROUTES.SETTINGS.SESSIONS,
    icon: <I_DEVICES />,
    color: "rgb(12 227 0)",
    label: "sessions",
  },
];

const OTHER_BUTTONS = [
  {
    to: ROUTES.SETTINGS.STATUS,
    icon: <I_WARNING />,
    color: "var(--ACCENT_COLOR)",
    label: "my_status",
  },
  {
    to: ROUTES.SETTINGS.LANGUAGE,
    icon: <I_LANG />,
    color: "rgb(76 107 204)",
    label: "language",
  },
  {
    to: ROUTES.SETTINGS.AUTHORS,
    icon: <I_USERS />,
    color: "rgb(76 107 204)",
    label: "authors",
  },
  {
    to: ROUTES.SETTINGS.ADVANCED,
    icon: <I_ADVANCED />,
    color: "rgb(89 175 255)",
    label: "settings.advanced.title",
  },
  {
    to: ROUTES.SETTINGS.STORAGE,
    icon: <I_STORAGE />,
    color: "rgb(89 175 255)",
    label: "storage",
  },
  {
    to: ROUTES.SETTINGS.REPORTS,
    icon: <I_WARNING />,
    color: "rgb(255 82 82)",
    label: "my_reports",
  },
  // {
  //     type: 'my_appeals',
  //     icon: <I_WARNING />,
  //     color: 'rgb(255 165 0)',
  //     label: 'my_appeals',
  // },
  {
    type: "link",
    to: "/info/advantages",
    icon: <I_INFO />,
    color: "rgb(101 85 180)",
    label: "info",
  },
];

const Settings = () => {
  const { accountData } = useAuth();
  const { t } = useTranslation();
  const { openModal } = useModalsStore();
  const routing = useRoutes(routes);
  const location = useLocation();
  const navigate = useNavigate();

  const isRootSettings =
    location.pathname === "/settings" || location.pathname === "/settings/";

  const [typeViewPosts, setTypeViewPosts] = useState(() => {
    const saved = localStorage.getItem("S-PostsType");
    return saved || "last";
  });

  useEffect(() => {
    localStorage.setItem("S-PostsType", typeViewPosts);
  }, [typeViewPosts]);

  const handlePartitionClick = ({ type, title, params }: any) => {
    const Element = getModal(type);

    openModal({
      type: "routed",
      props: {
        title: title,
        children: (
          <Element
            handlePartitionClick={handlePartitionClick}
            accountData={accountData}
            params={params}
          />
        ),
      },
    });
  };

  return (
    <>
      {((isMobile && !isRootSettings) || !isMobile) && (
        <div className="UI-C_R" style={{ width: "100%", maxWidth: "100%" }}>
          {isMobile ? (
            <div style={{ marginBottom: 150 }}>
              <span className="UI-B_FIRST" />
              <BackButton
                onClick={() => navigate("/settings")}
                style={{ marginBottom: 5 }}
              />
              {routing}
            </div>
          ) : (
            <div className="UI-ScrollView">
              <span className="UI-B_FIRST" />
              {routing}
            </div>
          )}
        </div>
      )}
      {((isMobile && isRootSettings) || !isMobile) && (
        <div
          className="UI-C_L"
          style={{ maxWidth: isMobile ? "100%" : "300px" }}
        >
          <div id="SETTINGS-BODY" className="UI-ScrollView">
            <span className="UI-B_FIRST" />
            <MenuItems>
              {ACCOUNT_BUTTONS.map((button) => (
                <SettingsButton
                  key={button.type}
                  btn={button}
                  t={t}
                  handlePartitionClick={handlePartitionClick}
                />
              ))}
            </MenuItems>
            <div className="UI-PartitionName">
              {t("partition_confidentiality")}
            </div>
            <MenuItems>
              {CONFIDENTIALITY_BUTTONS.map((button) => (
                <SettingsButton
                  key={button.type}
                  btn={button}
                  t={t}
                  handlePartitionClick={handlePartitionClick}
                />
              ))}
            </MenuItems>
            <div className="UI-PartitionName">{t("partition_other")}</div>
            <MenuItems>
              {OTHER_BUTTONS.map((button) => (
                <SettingsButton
                  key={button.type}
                  btn={button}
                  t={t}
                  handlePartitionClick={handlePartitionClick}
                />
              ))}
            </MenuItems>
            <div className="UI-PartitionName">{t("partition_posts_type")}</div>
            <Block>
              <div className="Settings-PType">
                {["last", "rec", "subscribe"].map((type) => (
                  <button
                    key={type}
                    className={typeViewPosts === type ? "Active" : ""}
                    onClick={() => setTypeViewPosts(type)}
                  >
                    {type === "last"
                      ? t("category_last")
                      : type === "rec"
                        ? t("category_recommended")
                        : t("category_subscriptions")}
                  </button>
                ))}
              </div>
            </Block>
            <div className="UI-PartitionName">
              {t("partition_change_theme")}
            </div>
            <Block className="Settings-Themes">
              <Themes />
            </Block>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;
