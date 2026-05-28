import clsx from "clsx";
import Image from "./Image";
import { useNavigate } from "react-router-dom";
import UploadLoader from "../Loaders/UploadLoader";
import { memo, useCallback, useMemo } from "react";
import { I_GHOST } from "../../../System/UI/IconPack";
import { useAuth } from "@/System/Hooks/useAuth";

interface AvatarProps {
  avatar?: any;
  name: string;
  className?: string;
  onClick?: () => void;
  to?: string;
  loading?: boolean;
  isLoaded?: boolean;
  isUploading?: boolean;
  size?: any;
}

const Avatar: React.FC<AvatarProps> = memo(
  ({
    avatar,
    name,
    className,
    onClick,
    to,
    loading = false,
    isLoaded = false,
    isUploading = false,
    size = 0,
  }) => {
    const { accountData } = useAuth();
    const navigate = useNavigate();
    const sizeStyle =
      size !== 0
        ? { width: size, height: size, fontSize: size * 0.5 }
        : undefined;

    const handleClick = useCallback(() => {
      if (to) {
        navigate(to);
      }
      if (onClick) {
        onClick();
      }
    }, [to, onClick, navigate]);

    const isRenderableAvatar = useMemo(
      () => !!avatar?.file_id,
      [avatar?.file_id],
    );

    return (
      <div
        onClick={handleClick}
        className={clsx("Avatar", className)}
        {...(size !== undefined ? { style: sizeStyle } : {})}
      >
        {!isRenderableAvatar ? (
          <div className="NonAvatar">
            {name?.length > 0 ? (
              name.charAt(0)
            ) : (
              <I_GHOST
                style={{ width: `${size / 2}px`, height: `${size / 2}px` }}
              />
            )}
          </div>
        ) : (
          <Image
            image={avatar}
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
      prevProps.avatar === nextProps.avatar &&
      prevProps.name === nextProps.name &&
      prevProps.isUploading === nextProps.isUploading &&
      prevProps.loading === nextProps.loading &&
      prevProps.isLoaded === nextProps.isLoaded &&
      prevProps.size === nextProps.size &&
      prevProps.className === nextProps.className &&
      prevProps.onClick === nextProps.onClick &&
      prevProps.to === nextProps.to
    );
  },
);

export default Avatar;
export type { AvatarProps };
