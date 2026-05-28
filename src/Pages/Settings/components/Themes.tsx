import { HandleTheme } from "../../../System/Elements/Handlers";
import { useAuth } from "@/System/Hooks/useAuth";
import useSettingsStore from "../../../Store/settingsStore";
import { useMemo, useRef } from "react";
import { isDesktop } from "react-device-detect";
import { I_ARROW_LEFT, I_ARROW_RIGHT } from "../../../System/UI/IconPack";

interface ThemeItem {
  name: string;
  id: string;
  className: string;
  goldStatus: boolean;
}

const Themes: React.FC = () => {
  const { accountData } = useAuth();
  const { theme, setTheme } = useSettingsStore() as {
    theme: string;
    setTheme: (theme: string) => void;
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const themes = useMemo<ThemeItem[]>(() => {
    const allThemes: ThemeItem[] = [
      {
        name: "Светлая",
        id: "LIGHT",
        className: "Theme-Light",
        goldStatus: false,
      },
      {
        name: "Тёмная",
        id: "DARK",
        className: "Theme-Dark",
        goldStatus: false,
      },
      {
        name: "Золотая тёмная",
        id: "GOLD-DARK",
        className: "Theme-Gold-Dark",
        goldStatus: true,
      },
    ];

    return accountData.gold_status
      ? allThemes
      : allThemes.filter((t) => !t.goldStatus);
  }, [accountData.gold_status]);

  const onSetTheme = (themeId: string) => {
    setTheme(themeId);
    HandleTheme();
  };

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({
      left: -200,
      behavior: "smooth",
    });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({
      left: 200,
      behavior: "smooth",
    });
  };

  return (
    <>
      {isDesktop && (
        <button className="ThemeScrollButton left" onClick={scrollLeft}>
          <I_ARROW_LEFT />
        </button>
      )}

      <div
        className="Scroll"
        ref={scrollRef}
        style={{
          paddingLeft: isDesktop ? 50 : 8,
          paddingRight: isDesktop ? 50 : 8,
        }}
      >
        {themes.map((themeItem) => (
          <div
            key={themeItem.id}
            className={`${themeItem.className} ChangeTheme ${
              theme === themeItem.id ? "Selected" : ""
            }`}
            onClick={() => onSetTheme(themeItem.id)}
          >
            <div className="TH-Container">
              <div className="TH-TopBar"></div>
              <div className="TH-Posts">
                <div className="TH-AddPost">
                  <div className="TH-Button"></div>
                </div>
                <div className="TH-Post"></div>
                <div className="TH-Post"></div>
              </div>
              <div className="TH-BottomBar"></div>
            </div>
            <div className="Info">{themeItem.name}</div>
          </div>
        ))}
      </div>

      {isDesktop && (
        <button className="ThemeScrollButton right" onClick={scrollRight}>
          <I_ARROW_RIGHT />
        </button>
      )}
    </>
  );
};

export default Themes;
