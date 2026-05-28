import { useEffect, useState } from "react";
import {
  useWebSocket,
  useWebSocketEvent,
} from "../../../System/Context/WebSocket";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Avatar, Block } from "@/UIKit";

const HandleUser = ({ user }) => {
  return (
    <NavLink to={`/e/${user.username}`} className="User">
      <Avatar avatar={user.avatar} name={user.name} size={40} />
      <div className="UI-Online"></div>
    </NavLink>
  );
};

const OnlineUsers = () => {
  const { t } = useTranslation();
  const { wsClient } = useWebSocket();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    wsClient.send({
      type: "social",
      action: "get_online_users",
    });
  }, []);

  useWebSocketEvent("social", (data) => {
    if (data.action === "get_online_users") {
      setUsers(data.users);
    }
  });

  return (
    <Block className="HomePage-OnlineUsers UI-B_FIRST">
      <div className="UI-Title">{t("online_users")}</div>
      <div className="Scroll">
        <div className="Users">
          {users.map((user, i) => (
            <HandleUser key={i} user={user} />
          ))}
        </div>
      </div>
    </Block>
  );
};

export default OnlineUsers;
