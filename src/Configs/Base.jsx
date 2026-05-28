import { browserName, browserVersion } from "react-device-detect";

const CURRENT_VERSION = 0.2;

const BaseConfig = {
  session: {
    client_name: `Element Web ${CURRENT_VERSION}`,
    device_type: "browser",
    device_name: `${browserName} ${browserVersion}`,
  },
  captcha: true,
  domains: {
    client: import.meta.env.VITE_CLIENT_URL ?? "https://localhost:3000",
    base: import.meta.env.VITE_BASE_URL ?? "https://localhost:3000",
    ws: ["wss://ws.elemsocial.com/user_api"],
  },
  vapid: {
    public_key:
      "BP2xfmqDnX7-yoDsZQxgHt8aTd7fSRhLno0-fPwpGoglILifPqzVmEo0OLNYILeU0qVkC5qo_rLhzzcrBh_EIIs",
  },
  update: {
    version: CURRENT_VERSION,
    content: [
      {
        title: "Общие изменения",
        changes: [
          "Новый дизайн в стиле Flat UI и Liquid Glass.",
          "Исправлен баг с BottomBar и размытием фона в Safari.",
        ],
      },
      {
        title: "Техническое стороны",
        changes: [
          "Бандл оптимизирован на 45 КБ (удалены nanoid, crypto-js, ua-parser-js, lodash).",
          "clsx вместо classnames.",
        ],
      },
      {
        title: "Уведомления",
        changes: [
          "Добавлена возможность просмотра уведомлений по категориям, а так же возможность сортировки уведомлений по времени.",
        ],
      },
      {
        title: "Музыка",
        changes: [
          "Добавлен статус «сейчас слушает» (можно отключить в настройках).",
          "Публичные плейлисты теперь отображаются в разделе «Плейлисты от пользователей».",
          "Теперь можно добавлять обложку к плейлистам.",
        ],
      },
    ],
  },
};

export default BaseConfig;
