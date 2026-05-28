import clsx from "clsx";
import Image from "./Image";
import UploadLoader from "../Loaders/UploadLoader";
import { memo, useCallback } from "react";
import { useAuth } from "@/System/Hooks/useAuth";
import { isEqual } from "@/Utils/isEqual";

interface CoverProps {
  cover?: string | null;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  loading?: boolean;
  isLoaded?: boolean;
  isUploading?: boolean;
}

const Cover: React.FC<CoverProps> = memo(
  ({
    cover,
    className,
    style,
    onClick,
    loading = false,
    isLoaded = false,
    isUploading = false,
  }) => {
    const { accountData } = useAuth();

    const handleClick = useCallback(() => {
      if (onClick) {
        onClick();
      }
    }, [onClick]);

    return (
      <div
        className={clsx("UI-Cover", className)}
        style={style}
        onClick={handleClick}
      >
        {cover && (
          <Image
            image={cover}
            variant={
              accountData?.settings?.images_preview_format
                ? accountData?.settings?.images_preview_format
                : "webp"
            }
          />
        )}
        {loading && !isLoaded && <div className="UI-PRELOAD"></div>}
        {isUploading && <UploadLoader />}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.cover === nextProps.cover &&
      prevProps.isUploading === nextProps.isUploading &&
      prevProps.loading === nextProps.loading &&
      prevProps.isLoaded === nextProps.isLoaded &&
      prevProps.className === nextProps.className &&
      isEqual(prevProps.style, nextProps.style)
    );
  },
);

export default Cover;
export type { CoverProps };
