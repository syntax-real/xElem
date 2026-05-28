import { useEffect, useState, useMemo, useRef, memo } from "react";
import { useDatabase } from "../../../System/Context/Database";
import clsx from "clsx";
import { downloadService } from "../../../Services/downloadService";
import BlurHash from "./BlurHash";
import { useDownloadStore } from "../../../Store/downloadStore";
import { isEqual } from "@/Utils/isEqual";

interface ImageProps {
  image: any;
  variant?: string;
  lossless?: boolean;
  draggable?: boolean;
  style?: any;
  className?: any;
  onClick?: any;
  onError?: any;
  onLoaded?: any;
}

const imageUrlCache = new Map<string, Blob | null>();

const Image = ({
  image,
  variant = "original",
  draggable = false,
  style,
  className,
  onClick,
  onError,
  onLoaded,
}: ImageProps) => {
  const db = useDatabase();
  const unsubRef = useRef<null | (() => void)>(null);
  const [inView, setInView] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const createdUrlRef = useRef<string | null>(null);

  const imageId = useMemo(() => {
    if (!image) return null;
    return `${image.file_id}:${variant}`;
  }, [image?.file_id, variant]);

  const createAndSetObjectUrl = (blob: Blob | null) => {
    if (createdUrlRef.current) {
      try {
        URL.revokeObjectURL(createdUrlRef.current);
      } catch (e) {}
      createdUrlRef.current = null;
    }

    if (!blob) {
      setSrc(null);
      return;
    }

    const url = URL.createObjectURL(blob);
    createdUrlRef.current = url;
    setSrc(url);
  };

  const downloadImage = () => {
    if (!imageId) return;

    downloadService.startDownload({
      fileId: image.file_id,
      downloadType: "image",
      downloadContent: image,
      variant,
    });

    unsubRef.current?.();
    unsubRef.current = useDownloadStore.subscribe(async (state) => {
      const download = state.downloads[`${image.file_id}:${variant}`];

      if (download?.status === "completed") {
        const file = await downloadService.getFile(image.file_id, variant);

        if (file?.file_blob) {
          createAndSetObjectUrl(file.file_blob);
          setLoaded(true);
          onLoaded?.();
        }

        unsubRef.current?.();
        unsubRef.current = null;
      }
    });
  };

  const loadImage = async () => {
    if (!image || !imageId) return;

    if (imageUrlCache.has(imageId)) {
      const cachedBlob = imageUrlCache.get(imageId) as Blob | null;
      createAndSetObjectUrl(cachedBlob);
      setLoaded(!!cachedBlob);
      onLoaded?.();
      return;
    }

    try {
      const cached = await db.file_cacheV2.get([image.file_id, variant]);

      if (!cached?.file_blob) {
        return downloadImage();
      }

      imageUrlCache.set(imageId, cached.file_blob);
      createAndSetObjectUrl(cached.file_blob);
      setLoaded(true);
      onLoaded?.();
    } catch (error) {
      console.error("Ошибка при работе с кешом:", error);
      downloadImage();
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    const el = containerRef.current;
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !imageId) return;

    if (!loaded || !src || !imageUrlCache.has(imageId)) {
      loadImage();
    }
  }, [inView, imageId, loaded]);

  useEffect(() => {
    setSrc(null);
    setLoaded(false);
  }, [imageId]);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const onImgError = () => {
    setSrc(null);
    setLoaded(false);
    onError?.();
  };

  return (
    <div
      ref={containerRef}
      className={clsx("UI-Neoimage", className)}
      onClick={handleClick}
      style={{
        ...style,
        background: image.dominant_color,
      }}
    >
      <BlurHash
        image={image}
        style={{
          position: "absolute",
          zIndex: 0,
          opacity: loaded ? 0 : 1,
          transition: "opacity 150ms ease",
        }}
      />
      {src && (
        <img
          src={src}
          onError={onImgError}
          style={{
            width: "100%",
            height: "100%",
            opacity: loaded ? 1 : 0,
            transition: "opacity 150ms ease",
          }}
          draggable={draggable}
        />
      )}
    </div>
  );
};

export default memo(
  Image,
  (a, b) =>
    a.image?.file_id === b.image?.file_id &&
    a.variant === b.variant &&
    a.draggable === b.draggable &&
    a.className === b.className &&
    isEqual(a.style, b.style),
);
