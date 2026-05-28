import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInView } from "react-intersection-observer";
import { useAuth } from "../../System/Hooks/useAuth";
import { useWebSocket } from "../../System/Context/WebSocket";
import Notification from "./Components/Notification";
import Header from "./Components/Header";
import { Ring } from "ldrs/react";
import { Loader } from "@/UIKit/Components/Base/Loader";

const Notifications: React.FC = () => {
  const { accountData, isAuthorized, updateAccount } = useAuth();
  const { t } = useTranslation();
  const { wsClient } = useWebSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newNotifications, setNewNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isOnceLoaded, setIsOnceLoaded] = useState<boolean>(false);
  const [si, setSI] = useState<number>(0);
  const { ref: endRef, inView: endIsView } = useInView({
    threshold: 0,
  });
  const { ref: viewRef, inView: isViewed } = useInView({
    threshold: 0,
  });
  const [config, setConfig] = useState({
    category: "all",
    order: "date_desc",
  });

  useEffect(() => {
    if (isViewed) {
      wsClient.send({
        type: "social",
        action: "notifications/view",
      });
      updateAccount({
        notifications: 0,
      });
    }
  }, [isViewed]);

  useEffect(() => {
    if (endIsView && isOnceLoaded) {
      setSI((prevSI) => prevSI + 25);
      load({ startIndex: si + 25, isLoadingMore: true });
    }
  }, [endIsView]);

  useEffect(() => {
    if (isOnceLoaded) {
      setIsLoading(true);
      setNotifications([]);
      setSI(0);
      load({ startIndex: 0 });
    }
  }, [config]);

  const load = ({ startIndex, isLoadingMore = false }) => {
    if (!isAuthorized) return;

    if (isLoadingMore) {
      setIsLoadingMore(true);
    }

    wsClient
      .send({
        type: "social",
        action: "notifications/load",
        payload: {
          ...config,
          start_index: startIndex,
        },
      })
      .then((res: any) => {
        if (res.status === "success") {
          if (
            Array.isArray(res.notifications) &&
            res.notifications.length > 0
          ) {
            setNewNotifications((prev) => [
              ...prev,
              ...res.notifications.filter(
                (notification) => !notification.viewed,
              ),
            ]);
            setNotifications((prev) => [
              ...prev,
              ...res.notifications.filter(
                (notification) => notification.viewed,
              ),
            ]);
            setIsOnceLoaded(true);
            setIsLoading(false);
            setIsLoadingMore(false);
          }
        }
      });
  };

  useEffect(() => {
    setIsOnceLoaded(false);
    setNewNotifications([]);
    setNotifications([]);
    setSI(0);
    load({ startIndex: 0 });
  }, [accountData?.notifications, isAuthorized]);

  return (
    <div className="UI-ScrollView">
      <div className="Notifications UI-B_FIRST">
        <Header setConfig={setConfig} />
        {!isLoading ? (
          newNotifications.length > 0 || notifications.length > 0 ? (
            <>
              <span ref={viewRef} />
              {newNotifications.length > 0 && (
                <div className="Notifications-New">
                  {newNotifications.map((notification, i) => (
                    <Notification
                      key={`new-${i}`}
                      notification={notification}
                    />
                  ))}
                </div>
              )}
              {notifications.length > 0 &&
                notifications.map((notification, i) => (
                  <Notification key={`all-${i}`} notification={notification} />
                ))}

              {isLoadingMore ? (
                <div
                  style={{
                    marginTop: 5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ring
                    size="30"
                    stroke="3"
                    bgOpacity="0"
                    speed="2"
                    color="var(--TEXT_COLOR)"
                  />
                </div>
              ) : (
                <div
                  ref={endRef}
                  style={{ width: 5, height: 5, margin: "auto" }}
                />
              )}
            </>
          ) : (
            <div className="UI-ErrorMessage">{t("ups")}</div>
          )
        ) : (
          <Loader />
        )}
      </div>
    </div>
  );
};

export default Notifications;
