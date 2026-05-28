import { motion } from "framer-motion";
import BaseConfig from "@/Configs/Base";
import { Block } from "@/UIKit";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import useSettingsStore from "@/Store/settingsStore";

const Update = () => {
  const { showNewUpdate, setShowNewUpdate } = useSettingsStore();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (!showNewUpdate) {
    return null;
  }

  return (
    <Block className="UI-B_FIRST UI_Bubble">
      <div className="UI-Title">
        {t("update")} {BaseConfig.update.version}
      </div>

      <motion.div
        className="UI-B_CONTENT"
        layout
        style={{
          overflow: "hidden",
        }}
        animate={{
          maxHeight: expanded ? 1000 : 150,
        }}
        transition={{
          duration: 0.35,
          ease: "easeInOut",
        }}
      >
        {BaseConfig.update.content.map((section, index) => (
          <div key={index}>
            <div
              style={{
                fontSize: "0.95em",
                opacity: 0.9,
                marginTop: 7,
                marginBottom: 5,
              }}
            >
              {section.title}:
            </div>

            {section.changes.map((change, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  margin: "3px 0",
                }}
              >
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
        ))}
      </motion.div>

      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          marginTop: 10,
          cursor: "pointer",
          color: "var(--ACCENT_COLOR)",
          opacity: 0.8,
          userSelect: "none",
        }}
      >
        {expanded ? t("wrap") : t("show_more")}
      </button>
      <button
        onClick={() => setShowNewUpdate(false)}
        style={{
          marginTop: 10,
          cursor: "pointer",
          color: "var(--ACCENT_COLOR)",
          opacity: 0.8,
          userSelect: "none",
          marginLeft: 5,
        }}
      >
        {t("hide")}
      </button>
    </Block>
  );
};

export default Update;
