import { useTranslation } from "react-i18next";

const ChangeLanguage = () => {
  const { t, i18n } = useTranslation();
  const languages = [
    {
      code: "en",
      name: t("lang_en"),
      icon: "1f1ec-1f1e7.png",
    },
    {
      code: "ru",
      name: t("lang_ru"),
      icon: "1f1f7-1f1fa.png",
    },
  ];

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };

  return (
    <>
      <div className="UI-PartitionName">{t("lang_warning")}</div>
      {languages.map((lang, i) => (
        <button
          key={i}
          onClick={() => changeLanguage(lang.code)}
          className={`Settings-ChangeLanguage ${i18n.language === lang.code ? "UI-Selected" : ""}`}
        >
          <img
            src={`/static_sys/Images/Emoji/Apple//${lang.icon}`}
            alt={lang.code}
            draggable={false}
          />
          {lang.name}
        </button>
      ))}
    </>
  );
};

export default ChangeLanguage;
