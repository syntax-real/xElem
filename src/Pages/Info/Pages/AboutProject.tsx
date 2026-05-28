import { GitHubButton } from "@/UIKit";
import { useTranslation } from "react-i18next";

export function AboutUs() {
  const { t } = useTranslation();

  return (
    <div className="Info-Block UI-B_FIRST text-center flex flex-col gap-3">
      <h1 className="text-3xl py-5">{t("about_project")}</h1>
      <h2 className="text-lg w-full max-w-150 mx-auto px-4">
        {t("about_project_text")}
      </h2>
      <h3 className="copyleft">
        {" "}
        copyleft{" "}
        <a target="_blank" href="https://t.me/syntax_real">
          Syntax
        </a>
        <div className="flex justify-center my-5">
          <GitHubButton
            title="xElem"
            link="https://github.com/syntax-real/xElem"
          />
        </div>
      </h3>
    </div>
  );
}
