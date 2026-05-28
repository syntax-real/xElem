import { useState } from "react";
import clsx from "clsx";
import Block from "../Layout/Block";

interface TabsProps {
  tabs: { title: string }[];
  select: (i: number) => void;
  className?: string;
  style?: React.CSSProperties;
  block?: boolean;
  insert?: boolean;
}

const Tabs = ({
  tabs,
  select,
  className,
  style,
  block = true,
  insert = false,
}: TabsProps) => {
  const [activeTab, setActiveTab] = useState(0);

  const selectTab = (i) => {
    setActiveTab(i);
    select(i);
  };

  const Wrapper = block ? Block : "div";

  return (
    <Wrapper
      className={clsx(
        "UI-Tabs",
        className,
        !block && "UI-Tabs-NoBlock",
        insert && "UI-Tabs-Insert",
      )}
      style={style}
    >
      {tabs.map((tab, i) => (
        <button
          key={i}
          className={clsx("Tab", i === activeTab && "ActiveTab")}
          onClick={() => selectTab(i)}
        >
          {tab.title}
        </button>
      ))}
    </Wrapper>
  );
};

export default Tabs;
