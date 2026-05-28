import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

interface SliderProps {
  min?: number;
  max?: number;
  value: number;
  draggable?: boolean;
  onChange?: (value: number) => void;
  step?: number;
  vertical?: boolean;
  className?: string;
}

const Slider = ({
  min = 0,
  max = 100,
  value,
  draggable = true,
  onChange,
  step = 1,
  vertical = false,
  className,
}: SliderProps) => {
  const sliderRef = useRef<any>(null);
  const [progress, setProgress] = useState(
    ((value - min) / (max - min)) * 100 || 0,
  );
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      const percent = ((value - min) / (max - min)) * 100;
      setProgress(percent || 0);
    }
  }, [value, min, max, isDragging]);

  const calcProgress = (e) => {
    const sliderRect = sliderRef.current.getBoundingClientRect();

    if (vertical) {
      const offsetY = e.clientY - sliderRect.top;
      const percent = 100 - (offsetY / sliderRect.height) * 100;
      return Math.max(0, Math.min(100, percent));
    }

    const offsetX = e.clientX - sliderRect.left;
    return Math.max(0, Math.min(100, (offsetX / sliderRect.width) * 100));
  };

  const handleMouseDown = (e) => {
    if (!draggable) return;
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);
    const newPercent = calcProgress(e);
    setProgress(newPercent);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!draggable) return;
    if (!sliderRef.current) return;
    const newPercent = calcProgress(e);
    setProgress(newPercent);

    const newValue =
      Math.round(((newPercent / 100) * (max - min) + min) / step) * step;
    if (onChange) onChange(newValue);
  };

  const handleMouseUp = (e) => {
    if (!draggable) return;
    if (e.button !== 0) return;
    setIsDragging(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);

    const newPercent = calcProgress(e);
    setProgress(newPercent);
    const newValue =
      Math.round(((newPercent / 100) * (max - min) + min) / step) * step;
    if (onChange) onChange(newValue);
  };

  const sliderStyle = vertical
    ? { width: isDragging ? "10px" : "", borderRadius: isDragging ? "5px" : "" }
    : {
        height: isDragging ? "10px" : "",
        borderRadius: isDragging ? "5px" : "",
      };

  return (
    <div
      className={clsx("UI-Slider", { Vertical: vertical }, className)}
      style={sliderStyle}
      ref={sliderRef}
      onMouseDown={handleMouseDown}
      data-no-double-tap
    >
      <div
        className={`Progress ${vertical ? "Vertical" : ""}`}
        style={
          vertical ? { height: `${progress}%` } : { width: `${progress}%` }
        }
      />
    </div>
  );
};

export default Slider;
