import { useRoutes } from "react-router-dom";
import { I_API, I_INFO } from "../../System/UI/IconPack";
import Advantages from "./Pages/Advantages";
import Rules from "./Pages/Rules";
import Updates from "./Pages/Updates";
import API from "./API";
import { LeftNavButton, TopBar } from "../../Components/Navigate";
import { AboutUs } from "./Pages/AboutProject";
import { useTranslation } from "react-i18next";

const Info = () => {
  const { t } = useTranslation();

  const pages = [
    {
      path: "advantages",
      name: "advantages",
      icon: <I_INFO />,
      element: <Advantages />,
    },
    {
      path: "rules",
      name: "rules",
      icon: <I_INFO />,
      element: <Rules />,
    },
    {
      path: "about_project",
      name: "about_project",
      icon: <I_INFO />,
      element: <AboutUs />,
    },
    {
      path: "updates",
      name: "updates",
      icon: <I_INFO />,
      element: <Updates />,
    },
    {
      path: "api",
      name: "API",
      icon: <I_API />,
      element: <API />,
    },
  ];
  const routing = useRoutes(pages);

  return (
    <>
      <TopBar search={false} title={true} titleText={"Информация"} />
      <div className="Content">
        <div className="UI-L_NAV UI-B_FIRST">
          {pages.map((page, i) => {
            return (
              // @ts-ignore
              !page?.hidden && (
                <LeftNavButton key={i} currentPage="info" target={page.path}>
                  <div className="UI-LN_ICON">{page.icon}</div>
                  {t(page.name)}
                </LeftNavButton>
              )
            );
          })}
        </div>
        <div className="UI-PAGE_BODY">
          <div className="UI-ScrollView">{routing}</div>
        </div>
      </div>
    </>
  );
};

export default Info;
