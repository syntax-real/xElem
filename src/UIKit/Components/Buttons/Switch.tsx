import clsx from "clsx";

const Switch = ({ checked, onChange }) => {
  return (
    <label
      className={clsx("UI-Switch", {
        "UI-Switch-On": checked,
      })}
    >
      <input type="checkbox" checked={checked} onChange={onChange} />
    </label>
  );
};

export default Switch;
