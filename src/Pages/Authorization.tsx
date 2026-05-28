import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Animate } from "../System/Elements/Function";
import { I_EYE, I_EYE_OFF, I_LOGO } from "../System/UI/IconPack";
import { PreloadLastUsers } from "../System/UI/Preload";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useTranslation } from "react-i18next";
import { useModalsStore } from "../Store/modalsStore";
import BaseConfig from "../Configs/Base";
import { useWebSocket } from "../System/Context/WebSocket";
import { Avatar, Block, Button, Switch, TextInput } from "../UIKit";
import { useAuth } from "../System/Hooks/useAuth";

export const Authorization = () => {
  const { wsClient } = useWebSocket();
  const { accountData, isSocketAuthorized, addAccount, setSocketAuthorized } =
    useAuth();
  const { t } = useTranslation();
  const { openModal } = useModalsStore();
  const navigate = useNavigate();

  const hcaptchaRef = useRef(null);
  const [token, setToken] = useState("");

  const [loginLoading, setLoginLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regLoading, setRegLoading] = useState(false);
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regReferralCode, setRegReferralCode] = useState("");
  const [regReferralLocked, setRegReferralLocked] = useState(false);
  const [regAccept, setRegAccept] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [lastUsers, setLastUsers] = useState([]);

  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyCodeLoading, setVerifyCodeLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    wsClient.send({ type: "system", action: "get_last_users" }).then((res) => {
      if (Array.isArray(res.users)) setLastUsers(res.users);
    });
  }, []);

  useEffect(() => {
    if (accountData && !isSocketAuthorized) navigate("/");
  }, []);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref")?.trim();
    if (code) {
      setRegReferralCode(code);
      setRegReferralLocked(true);
      requestAnimationFrame(() => {
        Animate(".Login", "AUTH-HIDE_LOGIN", 0.3);
        Animate(".Reg", "AUTH-SHOW_REG", 0.3);
        Animate(".VerifyEmail", "AUTH-HIDE_REG", 0.3);
      });
    } else {
      setRegReferralLocked(false);
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const authorize = (data) => {
    if (data.status === "success") {
      wsClient
        .send({
          type: "authorization",
          action: "connect",
          S_KEY: data.S_KEY,
        })
        .then((res) => {
          if (res.status === "success") {
            addAccount(res.accountData, data.S_KEY);
            setSocketAuthorized(true);
            navigate("/");
          }
        });
    } else if (data.status === "verify_email") {
      setVerifyEmail(data.email || regEmail || loginEmail || verifyEmail);
      showVerifyScreen();
    } else if (data.status === "error") {
      openModal({
        type: "alert",
        props: { title: "Ошибка", message: data.message },
      });
    }
  };

  const showVerifyScreen = () => {
    setVerifyCode("");
    Animate(".Login", "AUTH-HIDE_LOGIN", 0.3);
    Animate(".Reg", "AUTH-HIDE_REG", 0.3);
    setTimeout(() => Animate(".VerifyEmail", "AUTH-SHOW_REG", 0.3), 300);
  };

  const submitCode = (e) => {
    e.preventDefault();
    if (!verifyCode.trim() || verifyCodeLoading) return;
    setVerifyCodeLoading(true);
    wsClient
      .send({
        type: "social",
        action: "auth/verify_email",
        email: verifyEmail,
        code: verifyCode.replace(/\s/g, ""),
        device_type: BaseConfig.session.device,
        device: BaseConfig.session.name,
      })
      .then((res) => {
        setVerifyCodeLoading(false);
        if (res.status === "success") {
          authorize(res);
        } else {
          openModal({
            type: "alert",
            props: { title: "Ошибка", message: res.message },
          });
        }
      });
  };

  const login = (e) => {
    setShowRegPassword(false);
    e.preventDefault();
    setLoginLoading(true);
    wsClient
      .send({
        type: "social",
        action: "auth/login",
        email: loginEmail,
        password: loginPassword,
        device_type: BaseConfig.session.device_type,
        device_name: BaseConfig.session.device_name,
        client_name: BaseConfig.session.client_name,
      })
      .then((res) => {
        setLoginLoading(false);
        authorize(res);
      });
  };

  const registration = (e) => {
    e.preventDefault();
    setRegLoading(true);
    wsClient
      .send({
        type: "social",
        action: "auth/reg",
        name: regName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        referral_code: regReferralCode,
        accept: regAccept,
        h_captcha: token,
      })
      .then((res) => {
        setRegLoading(false);
        authorize(res);
      });
  };

  const resendVerification = () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    wsClient
      .send({
        type: "social",
        action: "auth/resend_verification",
        email: verifyEmail,
      })
      .then((res) => {
        setResendLoading(false);
        if (res.status === "success") {
          if (res.email) {
            setVerifyEmail(res.email);
          }
          setResendCooldown(120);
        } else {
          openModal({
            type: "alert",
            props: { title: "Ошибка", message: res.message },
          });
        }
      });
  };

  const goToReg = () => {
    Animate(".Login", "AUTH-HIDE_LOGIN", 0.3);
    Animate(".Reg", "AUTH-SHOW_REG", 0.3);
  };
  const goToLogin = () => {
    Animate(".Login", "AUTH-SHOW_LOGIN", 0.3);
    Animate(".Reg", "AUTH-HIDE_REG", 0.3);
    Animate(".VerifyEmail", "AUTH-HIDE_REG", 0.3);
  };

  return (
    <div className="Content">
      <Block className="Auth-Body">
        <div className="Left">
          <div className="LogoAndTitle">
            <I_LOGO />
            <div className="Title">
              <span>Element</span> - {t("welcome_text")}
            </div>
            <div className="LastUsers">
              {lastUsers.length && lastUsers.length > 0 ? (
                lastUsers.map((user: any, i) => (
                  <NavLink key={i} to={`/e/${user.username}`} className="User">
                    <Avatar avatar={user.avatar} name={user.name} size={40} />
                    <div className="Name">{user.name}</div>
                  </NavLink>
                ))
              ) : (
                <PreloadLastUsers />
              )}
            </div>
          </div>
          <div className="Watermark">
            {`${t("author_text")} ${BaseConfig.update.version}`}
            <div className="Part">
              связь -{" "}
              <a
                href="mailto:elemsupport@proton.me"
                style={{ cursor: "pointer", userSelect: "all" }}
              >
                elemsupport@proton.me
              </a>
            </div>
          </div>
        </div>
        <div className="Right">
          {/* Вход */}
          <form id="AUTH-LOGIN" className="Login" onSubmit={login}>
            <div className="Form_Container-Text">{t("login_title")}</div>
            <div className="Authorization-Form">
              <TextInput
                name="email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder={t("input_email")}
              />
              <TextInput
                name="password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder={t("input_password")}
              />
              <Button
                title={t("login_button")}
                type="submit"
                isLoading={loginLoading}
                buttonStyle="action"
              />
            </div>
            <Button
              title={t("create_account")}
              type="button"
              onClick={goToReg}
              className="Authorization-BTN_2"
              buttonStyle="action"
            />
          </form>

          {/* Регистрация */}
          <form className="Reg" onSubmit={registration}>
            <div className="Form_Container-Text">
              {t("create_account_title")}
            </div>
            <div className="Authorization-Form">
              <TextInput
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder={t("name")}
              />
              <TextInput
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder={t("input_username")}
              />
              <TextInput
                value={regEmail}
                name="email"
                type="email"
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder={t("input_email")}
              />
              <TextInput
                value={regReferralCode}
                onChange={(e) => setRegReferralCode(e.target.value)}
                placeholder={t("input_referral_code")}
                readOnly={regReferralLocked}
              />
              <div className="PasswordInput">
                <TextInput
                  value={regPassword}
                  name="password"
                  type={showRegPassword ? "text" : "password"}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder={t("input_password")}
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword((v) => !v)}
                >
                  {showRegPassword ? <I_EYE_OFF /> : <I_EYE />}
                </button>
              </div>
              {BaseConfig.captcha && (
                <HCaptcha
                  sitekey="29c6b1c2-7e78-43ec-8bf8-5de49c58c54a"
                  ref={hcaptchaRef}
                  onVerify={setToken}
                />
              )}
              <div className="Authorization-Accept_R">
                <Switch
                  checked={regAccept}
                  onChange={(e) => setRegAccept(e.target.checked)}
                />
                <div style={{ marginLeft: "10px" }}>
                  {t("accept_rules_p1")}{" "}
                  <NavLink
                    to="/info/rules"
                    className="Authorization-Accept_R_BTN"
                  >
                    {t("accept_rules_p2")}
                  </NavLink>
                </div>
              </div>
              <Button
                title={t("create_account_button")}
                type="submit"
                isLoading={regLoading}
                buttonStyle="action"
              />
            </div>
            <Button
              title={t("login_button_go_to")}
              onClick={goToLogin}
              type="button"
              className="Authorization-BTN_2"
              buttonStyle="action"
            />
          </form>

          {/* Подтверждение почты */}
          <div className="VerifyEmail">
            <div className="Form_Container-Text">Подтвердите почту</div>
            <form className="Authorization-Form" onSubmit={submitCode}>
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                Мы отправили код на
                <br />
                <strong style={{ color: "var(--text-primary)" }}>
                  {verifyEmail || "—"}
                </strong>
              </div>
              <TextInput
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="Введите код из письма"
                maxLength={7}
              />
              <Button
                title="Подтвердить"
                type="submit"
                isLoading={verifyCodeLoading}
              />
              <Button
                title={
                  resendCooldown > 0
                    ? `Отправить снова (${resendCooldown}с)`
                    : "Отправить снова"
                }
                type="button"
                onClick={resendVerification}
                isLoading={resendLoading}
                className="Authorization-BTN_2"
              />
            </form>
            <Button
              title={t("login_button_go_to")}
              onClick={goToLogin}
              type="button"
              className="Authorization-BTN_2"
            />
          </div>
        </div>
      </Block>
    </div>
  );
};

export default Authorization;
