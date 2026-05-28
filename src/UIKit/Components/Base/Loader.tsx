import { Ring } from "ldrs/react";

export const Loader = () => {
  return (
    <div
      style={{
        marginTop: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ring
        size="30"
        stroke="3"
        bgOpacity="0"
        speed="2"
        color="var(--TEXT_COLOR)"
      />
    </div>
  );
};
