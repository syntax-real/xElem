import { useNavigate } from "react-router-dom";

export function Logo() {
  const n = useNavigate();

  return (
    <h1
      onClick={() => n("/")}
      className="text-xl md:text-2xl cursor-pointer hover:opacity-80 active:opacity-50 transform"
    >
      xElem
    </h1>
  );
}
