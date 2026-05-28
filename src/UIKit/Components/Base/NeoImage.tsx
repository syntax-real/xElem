import { useEffect, useState, useMemo, useRef, memo } from "react";
import { useWebSocket } from "@/System/Context/WebSocket";
import { useDatabase } from "../../../System/Context/Database";
import clsx from "clsx";
import { isEqual } from "@/Utils/isEqual";

interface NeoImageProps {
  image: any;
  lossless?: boolean;
  draggable?: boolean;
  style?: any;
  className?: any;
  onClick?: any;
  onError?: any;
  onLoaded?: any;
  gradientBackground?: boolean;
}

const imageUrlCache = new Map<string, Blob | null>();

const getFileExtension = (fileName?: string): string => {
  if (typeof fileName !== "string" || !fileName.trim()) {
    return "";
  }

  const cleanName = fileName.split("?")[0].split("#")[0];
  const dotIndex = cleanName.lastIndexOf(".");
  if (dotIndex < 0) {
    return "";
  }

  return cleanName.slice(dotIndex + 1).toLowerCase();
};

const NeoImage = ({
  image,
  lossless = false,
  draggable = false,
  style,
  className,
  onClick,
  onError,
  onLoaded,
  gradientBackground = true,
}: NeoImageProps) => {
  const db = useDatabase();
  const { wsClient } = useWebSocket();

  const [loaded, setLoaded] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [inView, setInView] = useState(false);

  const isAvatarGif = useMemo(() => {
    const isAvatarPath =
      image?.path === "avatars" || image?.path === "messenger/avatars";
    return isAvatarPath && getFileExtension(image?.file) === "gif";
  }, [image?.path, image?.file]);

  const shouldUseLossless = useMemo(() => {
    return lossless || isAvatarGif;
  }, [lossless, isAvatarGif]);

  const imageId = useMemo(() => {
    if (!image) return null;
    return `${image.path}_${image.file}_${shouldUseLossless ? "lossless" : "simple"}`;
  }, [image?.path, image?.file, shouldUseLossless]);

  const containerRef = useRef<HTMLDivElement>(null);
  const createdUrlRef = useRef<string | null>(null);

  const createAndSetObjectUrl = (blob: Blob | null) => {
    if (createdUrlRef.current) {
      try {
        URL.revokeObjectURL(createdUrlRef.current);
      } catch (e) {}
      createdUrlRef.current = null;
    }

    if (!blob) {
      setBlobUrl(null);
      return;
    }

    const url = URL.createObjectURL(blob);
    createdUrlRef.current = url;
    setBlobUrl(url);
  };

  const containerStyle = useMemo<React.CSSProperties>(
    () => ({
      background: gradientBackground
        ? `linear-gradient(20deg, ${image?.aura}, rgb(161 157 177))`
        : "none",
      ...style,
    }),
    [image?.aura, style, gradientBackground],
  );

  const downloadImage = async () => {
    if (!image || !imageId) return;

    if (imageUrlCache.has(imageId)) {
      const cachedBlob = imageUrlCache.get(imageId) as Blob | null;
      createAndSetObjectUrl(cachedBlob);
      setLoaded(!!cachedBlob);
      onLoaded?.();
      return;
    }

    try {
      const res = await wsClient.send({
        type: "download",
        action: "image",
        image: {
          path: image.path,
          file: image.file,
          simple: image.simple,
        },
        lossless: shouldUseLossless,
      });

      if (res.status === 200) {
        const fileBlob = res.file
          ? new Blob([res.file.buffer], { type: `image/${res.file.ext}` })
          : null;
        let simpleBlob: any = null;

        if (res?.simple) {
          simpleBlob = new Blob([res.simple.buffer], {
            type: `image/${res.simple.ext}`,
          });
        }

        try {
          await db.image_cache.put({
            file: image.file,
            aura: image.aura,
            path: image.path,
            simple: image.simple,
            file_blob: fileBlob,
            simple_blob: simpleBlob,
          });
        } catch (dbError) {
          console.error("Ошибка при сохранении в кэш:", dbError);
        }

        const objectBlob =
          shouldUseLossless && fileBlob ? fileBlob : simpleBlob;
        imageUrlCache.set(imageId, objectBlob ?? null);
        createAndSetObjectUrl(objectBlob ?? null);
        setLoaded(!!objectBlob);
        onLoaded?.();
      } else {
        if (onError) {
          onError();
        }
      }
    } catch (error) {
      console.error("Ошибка при загрузке изображения:", error);
    }
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
      if (isAvatarGif) {
        return downloadImage();
      }

      const cached = await db.image_cache.get([image.path, image.file]);

      if (!cached) {
        return downloadImage();
      }

      if (shouldUseLossless && !cached.file_blob) {
        return downloadImage();
      }

      const objectBlob =
        shouldUseLossless && cached.file_blob
          ? cached.file_blob
          : cached.simple_blob;
      if (objectBlob) {
        imageUrlCache.set(imageId, objectBlob);
        createAndSetObjectUrl(objectBlob);
        setLoaded(true);
        onLoaded?.();
      } else {
        downloadImage();
      }
    } catch (error) {
      console.error("Ошибка при работе с кешом:", error);
      downloadImage();
    }
  };

  useEffect(() => {
    if (!inView || !imageId) return;

    if (!loaded || !blobUrl || !imageUrlCache.has(imageId)) {
      loadImage();
    }
  }, [inView, imageId, loaded]);

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
    setLoaded(false);
    setBlobUrl(null);
  }, [image?.path, image?.file, shouldUseLossless]);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      ref={containerRef}
      className={clsx("UI-Neoimage", className)}
      style={containerStyle}
      onClick={handleClick}
    >
      {loaded && blobUrl && (
        <img
          src={blobUrl}
          draggable={draggable}
          alt="NeoImage"
          loading="lazy"
        />
      )}
    </div>
  );
};

export default memo(
  NeoImage,
  (a, b) =>
    a.image?.path === b.image?.path &&
    a.image?.file === b.image?.file &&
    a.lossless === b.lossless &&
    a.draggable === b.draggable &&
    a.className === b.className &&
    isEqual(a.style, b.style),
);
