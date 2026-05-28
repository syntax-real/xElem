import clsx from "clsx";
import { HandleUserIcons } from "../../../System/Elements/Handlers";

const Name = ({ name, icons, className, styles }: any) => {
  return (
    <div className={clsx("UI-NameBody", className)} style={styles}>
      <div className="Name">{name}</div>
      {icons && <HandleUserIcons icons={icons} />}
    </div>
  );
};

export default Name;
