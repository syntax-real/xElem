import { useDownloadStore } from "../Store/downloadStore";
import { db } from "../System/Context/Database";
import { createLogger } from "../Utils/Logger";
import { websocketClient } from "./WebSocketClient";

const logger = createLogger("DownloadService");

class DownloadService {
  constructor() {
    this.init();
  }

  init() {
    websocketClient.onMessage("storage", this.handleDownload);
  }

  async validateFile(file_id, variant) {
    const file = await db.file_cacheV2.get([file_id, variant]);
    if (!file) return false;
    if (!file.is_hash_verified) return false;
    return file;
  }

  async startDownload({
    fileId,
    variant = "original",
    downloadType,
    downloadContent,
  }: {
    fileId: number;
    variant?: string;
    downloadType?: string;
    downloadContent?: any;
  }) {
    const file = await this.validateFile(fileId, variant);

    if (file) {
      return file;
    }

    const res = await websocketClient
      .send({
        type: "storage",
        action: "get_file_data",
        payload: {
          file_id: Number(fileId),
          variant,
        },
      })
      .then(async (res) => {
        if (res.status !== 200) return;
        if (res?.variant_status === "processing") return;

        const fileData =
          variant === "original"
            ? res.file_data
            : res.file_data.variants[variant];

        useDownloadStore
          .getState()
          .createDownload(
            `${res.file_data.id}:${variant}`,
            variant,
            fileData.hash_sha256,
            fileData.path,
            fileData.size,
            fileData.mime,
            downloadType,
            downloadContent,
          );

        await db.file_cacheV2.put({
          file_id: res.file_data.id,
          variant: variant,
          hash_sha256: fileData.hash_sha256,
          path: fileData.path,
          size: fileData.size,
          mime: fileData.mime,
          is_hash_verified: false,
          download_date: Date.now(),
        });
        this.downloadPart(res.file_data.id, variant);
        return fileData;
      });

    return {
      file_id: res.id,
      hash_sha256: res.hash_sha256,
      path: res.path,
      size: res.size,
      mime: res.mime,
      is_hash_verified: false,
    };
  }

  async getFile(file_id, variant) {
    return await db.file_cacheV2.get([file_id, variant]);
  }

  downloadPart(file_id, variant, offset = 0) {
    websocketClient.send({
      type: "storage",
      action: "download",
      payload: { file_id, variant, offset },
    });
  }

  async getSha256(arrayBuffer: ArrayBuffer) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async handlePart(data) {
    const { file_id, variant = "original", buffer, offset } = data;
    const newOffset = offset + buffer.byteLength;

    await db.files_chunksV2.put({
      file_id,
      variant,
      offset,
      binary: buffer,
    });

    logger.info("Получено часть файла:", `${file_id}:${variant}`);
    useDownloadStore
      .getState()
      .updateDownload(`${file_id}:${variant}`, newOffset);

    const downloadState =
      useDownloadStore.getState().downloads[`${file_id}:${variant}`];
    const fileHash = downloadState.hash_sha256;
    const fileSize = downloadState.size;
    const fileMime = downloadState.mime;

    if (newOffset >= fileSize) {
      const chunks = await db.files_chunksV2
        .where("[file_id+variant]")
        .equals([file_id, variant])
        .sortBy("offset");

      const buffers: any = chunks.map((c) => c.binary);
      const blob = new Blob(buffers, { type: fileMime });
      const arrayBuffer = await blob.arrayBuffer();
      const hash = await this.getSha256(arrayBuffer);

      if (hash === fileHash) {
        logger.info("Файл загружен корректно:", `${file_id}:${variant}`);
        const file = await db.file_cacheV2.get([file_id, variant]);

        if (file) {
          await db.file_cacheV2.put({
            ...file,
            file_blob: blob,
            is_hash_verified: true,
          });
        }
        useDownloadStore.getState().completeDownload(`${file_id}:${variant}`);
      } else {
        console.error("Хэш не совпадает!");
      }

      return;
    }

    this.downloadPart(file_id, variant, newOffset);
  }

  handleDownload = (data) => {
    switch (data.action) {
      case "download":
        this.handlePart(data);
        break;
    }
  };
}

export const downloadService = new DownloadService();
