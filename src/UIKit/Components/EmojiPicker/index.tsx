import { useEffect, useState } from "react";
import Emojis from "../../../Configs/Emoji.json";
import {
  I_EP_ACTIONS,
  I_EP_BULB,
  I_EP_CAR,
  I_EP_FOX,
  I_EP_FLAG,
  I_EP_FOOD,
  I_EP_SMILE,
  I_EP_SYMBOL,
} from "../../../System/UI/IconPack";
import { AnimatePresence, motion } from "framer-motion";
import { useClickAway } from "@uidotdev/usehooks";
import clsx from "clsx";
import { isMobile } from "react-device-detect";

interface EmojiPickerProps {
  isOpen: boolean;
  setIsOpen: any;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  inputRef: any;
  onEmojiSelect: (
    emoji: string,
    selectionStart: number,
    selectionEnd: number,
  ) => void;
  className?: string;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  isOpen,
  setIsOpen,
  buttonRef,
  inputRef,
  onEmojiSelect,
  className,
}) => {
  const [currentCategory, setCurrentCategory] =
    useState<string>("smileys_and_people");
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const ref = useClickAway<HTMLDivElement>(() => {
    setIsOpen(false);
  });

  const updatePosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const pickerWidth = 300;
    const pickerHeight = 360;

    let top = rect.bottom + 8;
    let left = rect.left + rect.width / 2 - pickerWidth / 2;

    if (top + pickerHeight > window.innerHeight) {
      top = rect.top - pickerHeight - 8;
    }

    if (top < 8) top = 8;

    if (left + pickerWidth > window.innerWidth) {
      left = window.innerWidth - pickerWidth - 8;
    }

    if (left < 8) left = 8;

    setPosition({ top, left });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, buttonRef]);

  useEffect(() => {
    if (!isOpen) return;

    const picker = ref.current;
    if (!picker) return;

    const onScroll = (e: Event) => {
      const path = (e as any).composedPath?.() || [];
      if (path.includes(picker)) return;

      setIsOpen(false);
    };

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, buttonRef]);

  const handleEmojiSelect = (emoji: string) => {
    const input = inputRef.current;
    const selStart = input?.selectionStart ?? input?.value.length ?? 0;
    const selEnd = input?.selectionEnd ?? selStart;
    const newCursorPos = selStart + emoji.length;

    if (input) {
      (input as any).__pendingCursor = newCursorPos;
    }

    onEmojiSelect(emoji, selStart, selEnd);
  };

  const currentEmojis =
    Emojis.find((category) => category[currentCategory])?.[currentCategory] ||
    [];

  const categories = [
    {
      code: "smileys_and_people",
      icon: <I_EP_SMILE />,
    },
    {
      code: "animals_and_nature",
      icon: <I_EP_FOX />,
    },
    {
      code: "food_and_drink",
      icon: <I_EP_FOOD />,
    },
    {
      code: "actions",
      icon: <I_EP_ACTIONS />,
    },
    {
      code: "world",
      icon: <I_EP_CAR />,
    },
    {
      code: "objects",
      icon: <I_EP_BULB />,
    },
    {
      code: "symbols",
      icon: <I_EP_SYMBOL />,
    },
    {
      code: "flags",
      icon: <I_EP_FLAG />,
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "fixed",
            zIndex: 1,
          }}
        ></div>
      )}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={clsx("UI-EmojiPicker", className)}
            ref={ref}
            style={{
              top: position.top,
              left: isMobile ? 0 : position.left,
              right: isMobile ? 0 : "",
              width: className === "sidebar-emoji-picker" ? "100%" : undefined,
            }}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <div className="Categories">
              {categories.map((category, i) => (
                <button
                  key={i}
                  className={clsx("Category", {
                    Selected: category.code === currentCategory,
                  })}
                  onClick={() => setCurrentCategory(category.code)}
                >
                  {category.icon}
                </button>
              ))}
            </div>
            <div className="Grid">
              {currentEmojis &&
                currentEmojis.map((emojiObj, index) => (
                  <div
                    key={index}
                    className="EmojiItem"
                    title={emojiObj.emoji}
                    onClick={() => handleEmojiSelect(emojiObj.emoji)}
                  >
                    <div className="UI-Emoji">
                      <img
                        src={`/static_sys/Images/Emoji/Apple/${emojiObj.unified.toLowerCase()}.png`}
                        alt={emojiObj.emoji}
                        draggable="false"
                      />
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default EmojiPicker;
