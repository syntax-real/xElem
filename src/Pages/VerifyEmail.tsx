import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWebSocket } from "../System/Context/WebSocket";
import { useAuth } from "../System/Hooks/useAuth";
import { Block } from "../UIKit";
import BaseConfig from "../Configs/Base";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const { wsClient, socketReady } = useWebSocket();
  const { addAccount, setSocketAuthorized } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!socketReady || verified) return;

    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Токен не найден");
      return;
    }

    setVerified(true);

    wsClient
      .send({
        type: "social",
        action: "auth/verify_email",
        token,
        device_type: BaseConfig.session.device,
        device: BaseConfig.session.name,
      })
      .then((res) => {
        if (res.status === "success") {
          wsClient
            .send({
              type: "authorization",
              action: "connect",
              S_KEY: res.S_KEY,
            })
            .then((connectRes) => {
              if (connectRes.status === "success") {
                addAccount(connectRes.accountData, res.S_KEY);
                setSocketAuthorized(true);
                setStatus("success");
                setTimeout(() => navigate("/"), 1500);
              } else {
                setStatus("success");
                setMessage("Почта подтверждена! Войдите в аккаунт.");
                setTimeout(() => navigate("/auth"), 2000);
              }
            });
        } else {
          setStatus("error");
          setMessage(res.message || "Ссылка недействительна");
        }
      });
  }, [socketReady]);

  return (
    <div className="Content">
      <Block
        className="Auth-Body"
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <div style={{ textAlign: "center", padding: "40px" }}>
          {status === "loading" && (
            <>
              <div style={{ fontSize: 32, marginBottom: 16 }}>
                Подтверждение...
              </div>
              <div style={{ color: "var(--text-secondary)" }}>
                Проверяем вашу ссылку
              </div>
            </>
          )}
          {status === "success" && (
            <>
              <div style={{ fontSize: 32, marginBottom: 16 }}>
                Почта подтверждена!
              </div>
              <div style={{ color: "var(--text-secondary)" }}>
                {message || "Перенаправляем..."}
              </div>
            </>
          )}
          {status === "error" && (
            <>
              <div style={{ fontSize: 32, marginBottom: 16 }}>Ошибка</div>
              <div style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
                {message}
              </div>
              <a href="/auth" style={{ color: "var(--accent)" }}>
                Вернуться к входу
              </a>
            </>
          )}
        </div>
      </Block>
    </div>
  );
};

export default VerifyEmail;
