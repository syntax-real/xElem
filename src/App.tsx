import "./System/UI/Style.scss";
import "./System/UI/LoadersPack.css";
import "./System/UI/AnimPack.css";
import "@/System/UI/index.css";

import "./System/Modules/i18n";
import "ldrs/react/Ring.css";
import { lazy, Suspense, useEffect, useState } from "react";
import { useRoutes, Navigate, Outlet } from "react-router-dom";
import { HandleTheme } from "./System/Elements/Handlers";
import { Loading } from "./System/Elements/Loading";
import { useWebSocket } from "./System/Context/WebSocket";
import { useAuth } from "./System/Hooks/useAuth";
import MainLayout from "./Layouts/MainLayout";
import Authorization from "./Pages/Authorization";
import VerifyEmail from "./Pages/VerifyEmail";
import Profile from "./Pages/Profile";
import Post from "./Pages/Post";
import Home from "./Pages/Home";
const Music = lazy(() => import("./Pages/Music"));
const Messenger = lazy(() => import("./Pages/Messenger"));
import Settings from "./Pages/Settings";
const ViewEPACK = lazy(() => import("./Pages/ViewEPACK"));
import Gold from "./Pages/Gold/Gold";
import Balance from "./Pages/Balance";
const Panel = lazy(() => import("./Pages/Panel"));
const Info = lazy(() => import("./Pages/Info/Info"));
import JoinGroup from "./Pages/Messenger/JoinGroup";
import Notifications from "./Pages/Notifications";
import "./Services/notificationService";
import "./Services/downloadService";

HandleTheme();

const ProtectedRoute = () => {
  const { accountData } = useAuth();

  return accountData ? <Outlet /> : <Navigate to="/auth" replace />;
};

const routes = [
  {
    path: "/auth",
    element: <Authorization />,
  },
  {
    path: "/verify-email",
    element: <VerifyEmail />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: (
          <MainLayout className="HomePage">
            <Home />
          </MainLayout>
        ),
      },
      {
        path: "/home",
        element: (
          <MainLayout className="HomePage">
            <Home />
          </MainLayout>
        ),
      },
      {
        path: "/notifications",
        element: (
          <MainLayout className="Notifications-Page">
            <Notifications />
          </MainLayout>
        ),
      },
      {
        path: "/panel/*",
        name: "Панель управления",
        element: <Panel />,
        layout: "base",
      },
      {
        path: "/chat",
        element: <Messenger />,
      },
      {
        path: "/chat/:selectedChat",
        element: <Messenger />,
      },
      {
        path: "/music/*",
        element: (
          <MainLayout className="Music-Page">
            <Music />
          </MainLayout>
        ),
      },
      {
        path: "/settings/*",
        element: (
          <MainLayout className="Settings-Page">
            <Settings />
          </MainLayout>
        ),
      },
      {
        path: "/gold",
        element: (
          <MainLayout className="GoldSub-Page">
            <Gold />
          </MainLayout>
        ),
      },
      {
        path: "/wallet",
        element: (
          <MainLayout className="BalancePage">
            <Balance />
          </MainLayout>
        ),
      },
      {
        path: "/join/:link",
        element: <JoinGroup />,
      },
    ],
  },
  {
    path: "/profile/:username/*",
    protected: false,
    element: <Profile />,
  },
  {
    path: "/e/:username/*",
    protected: false,
    element: <Profile />,
  },
  {
    path: "/post/:id",
    protected: false,
    element: <Post />,
  },
  {
    path: "/epack",
    element: (
      <MainLayout className="EPACK-Page">
        <ViewEPACK />
      </MainLayout>
    ),
  },
  {
    path: "/info",
    protected: false,
    name: "Информация",
    children: [
      {
        path: "*",
        element: <Info />,
      },
    ],
  },
];

export const App = () => {
  const { socketReady } = useWebSocket();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded && socketReady) {
      setIsLoaded(true);
    }
  }, [socketReady, isLoaded]);

  const routing = useRoutes(routes);
  return (
    <>
      {isLoaded ? (
        <Suspense fallback={<Loading />}>{routing}</Suspense>
      ) : (
        <Loading />
      )}
    </>
  );
};
