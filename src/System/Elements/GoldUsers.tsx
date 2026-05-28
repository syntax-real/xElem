import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { HandleGoldUser } from "./Handlers";
import { useWebSocket } from "../Context/WebSocket";
import { Loader } from "@/UIKit/Components/Base/Loader";

const GoldUsers = () => {
  const { t } = useTranslation();
  const { wsClient } = useWebSocket();
  const [isLoaded, setIsLoaded] = useState(false);
  const [goldUsers, setGoldUsers] = useState([]);

  useEffect(() => {
    wsClient
      .send({
        type: "system",
        action: "get_gold_users",
      })
      .then((res) => {
        setIsLoaded(true);
        if (res.users && Array.isArray(res.users)) {
          setGoldUsers(res.users.sort((a, b) => b.subscribers - a.subscribers));
        }
      });
  }, []);

  return isLoaded ? (
    goldUsers.length > 0 ? (
      goldUsers.map((user, i) => <HandleGoldUser key={i} user={user} />)
    ) : (
      <div className="UI-ErrorMessage">{t("ups")}</div>
    )
  ) : (
    <Loader />
  );
};

export default GoldUsers;
