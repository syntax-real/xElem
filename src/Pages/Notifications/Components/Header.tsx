import { useState } from "react";
import { DropdownSelect, Tabs } from "@/UIKit";
import { t } from "i18next";

const Header = ({ setConfig }) => {
  const [order, setOrder] = useState(0);

  const tabs = [
    {
      title: t("all"),
      content: "all",
    },
    {
      title: t("reactions"),
      content: "reactions",
    },
    {
      title: t("comments"),
      content: "comments",
    },
    {
      title: t("subscriptions"),
      content: "subscriptions",
    },
  ];

  const dropdown = [
    {
      title: t("date_desc"),
      content: "date_desc",
    },
    {
      title: t("date_asc"),
      content: "date_asc",
    },
  ];

  const selectCategory = (i) => {
    setConfig((prev) => ({
      ...prev,
      category: tabs[i].content,
    }));
  };

  const selectOrder = (i) => {
    setOrder(i);
    setConfig((prev) => ({
      ...prev,
      order: dropdown[i].content,
    }));
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        justifyContent: "center",
        width: "100%",
        margin: "10px 0",
      }}
    >
      <Tabs
        tabs={tabs}
        select={selectCategory}
        block={false}
        style={{ width: "fit-content" }}
      />
      <DropdownSelect
        list={dropdown}
        selected={order}
        setSelected={selectOrder}
      />
    </div>
  );
};

export default Header;
