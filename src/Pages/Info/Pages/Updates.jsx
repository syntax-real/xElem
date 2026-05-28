import { useEffect, useState } from "react";
import { useWebSocket } from "@/System/Context/WebSocket";
import { useTranslation } from "react-i18next";
import { HandleTimeAge } from "../../../System/Elements/Handlers";

const HandleUpdate = ({ type, update }) => {
  const { t } = useTranslation();

  const formatDate = (dateString) => {
    const date = new Date(dateString);

    const datePart = new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);

    const timePart = new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

    return `${datePart} в ${timePart}`;
  };

  return (
    <div className="Info-UpdateBlock">
      <div className="Title">
        {type === "release" ? t("update") : t("beta")} {update.version}
      </div>
      <div className="UpdateContent">
        {Array.isArray(update.content) ? (
          update.content.map((section, i) => (
            <div key={i}>
              {section.title && (
                <div
                  style={{
                    fontSize: "0.95em",
                    opacity: 0.9,
                    marginTop: 5,
                    marginBottom: 5,
                  }}
                >
                  {section.title}:
                </div>
              )}
              {section.changes.map((change, i) => (
                <div key={i} style={{ display: "flex" }}>
                  <div
                    style={{
                      color: "var(--ACCENT_COLOR)",
                      opacity: 0.7,
                      marginRight: 5,
                    }}
                  >
                    •
                  </div>
                  {change}
                </div>
              ))}
            </div>
          ))
        ) : (
          <div>
            {update?.changes.map((change, i) => (
              <div key={i} style={{ display: "flex" }}>
                <div
                  style={{
                    color: "var(--ACCENT_COLOR)",
                    opacity: 0.7,
                    marginRight: 5,
                  }}
                >
                  •
                </div>
                {change}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="UpdateDate">
        {formatDate(update.date)} ({<HandleTimeAge inputDate={update.date} />})
      </div>
    </div>
  );
};

const Updates = () => {
  const [updates, setUpdates] = useState([]);

  const loadUpdates = async () => {
    const data = await import("../../../Configs/Updates.json");
    setUpdates(data.default);
  };

  useEffect(() => {
    loadUpdates();
  }, []);

  return (
    <div className="UI-ScrollView">
      <div className="UI-Block Info-Block UI-B_FIRST">
        <div className="UI-Title">История обновлений</div>
        <div>
          {updates.map((update, i) => (
            <HandleUpdate key={i} type={update.type} update={update} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Updates;
