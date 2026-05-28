import { EventEmitter } from "events";
import {
  rsaEncrypt,
  rsaDecrypt,
  aesEncrypt,
  aesDecrypt,
  arrayBufferToPem,
  generateAESKey,
  blobToArrayBuffer,
} from "../System/Modules/Crypto";
import BaseConfig from "../Configs/Base";
import { decode, encode } from "@msgpack/msgpack";
import { errorReporter } from "../System/Services/ErrorReporter.js";

class WebSocketClient extends EventEmitter {
  urls: any;
  urlIndex: number;
  socket: WebSocket | null;
  isConnected: boolean;

  rsaPublic: ArrayBuffer | null;
  rsaPrivate: ArrayBuffer | null;
  rsaPublicServer: string | null;
  aesKey: ArrayBuffer | null;
  aesServerKey: ArrayBuffer | null;
  keysReady: boolean;
  socketReady: boolean;

  eventListeners: { [key: string]: Array<(data: any) => void> };
  eventQueue: { [key: string]: any[] };
  messageQueue: any[];
  pendingRays: {
    [ray_id: string]: {
      resolve: (data: any) => void;
      reject: (err?: any) => void;
    };
  };

  processingMessages: boolean;
  mesCount: number;
  reconnectTimeout: number | null;
  reconnectAttempts: number;
  readonly baseReconnectDelay: number;
  readonly maxReconnectDelay: number;
  autoReconnectEnabled: boolean;

  constructor(urls: any) {
    super();

    this.urls = urls;
    this.urlIndex = 0;
    this.socket = null;
    this.isConnected = false;

    this.rsaPublic = null;
    this.rsaPrivate = null;
    this.rsaPublicServer = null;
    this.aesKey = null;
    this.aesServerKey = null;
    this.keysReady = false;
    this.socketReady = false;

    this.eventListeners = {};
    this.eventQueue = {};
    this.messageQueue = [];
    this.pendingRays = {};
    this.processingMessages = false;
    this.mesCount = 0;
    this.reconnectTimeout = null;
    this.reconnectAttempts = 0;
    this.baseReconnectDelay = 1500;
    this.maxReconnectDelay = 30000;
    this.autoReconnectEnabled = true;
  }

  async generateKeys(): Promise<boolean> {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: { name: "SHA-256" },
      },
      true,
      ["encrypt", "decrypt"],
    );
    this.rsaPublic = await window.crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey,
    );
    this.rsaPrivate = await window.crypto.subtle.exportKey(
      "pkcs8",
      keyPair.privateKey,
    );
    this.keysReady = true;
    return true;
  }

  connect(): void {
    this.autoReconnectEnabled = true;

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    console.log("Пытаюсь соединится");
    const url = this.getCurrentURL();
    this.socket = new WebSocket(url);

    this.socket.onopen = async () => {
      console.log("Соединение установлено");
      this.emit("socket_connect");
      this.reconnectAttempts = 0;
      if (!this.keysReady) {
        await this.generateKeys();
      }
      const publicKeyPem = arrayBufferToPem(
        this.rsaPublic as ArrayBuffer,
        "PUBLIC KEY",
      );

      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(
          JSON.stringify({
            type: "key_exchange",
            key: publicKeyPem,
          }),
        );
        this.isConnected = true;
        this.processQueue();
      }
    };

    this.socket.onmessage = async (event: MessageEvent) => {
      const rawData = event.data;

      if (this.rsaPublicServer) {
        if (this.aesServerKey) {
          if (!this.aesKey) return;
          const arrayBuffer = await blobToArrayBuffer(rawData);
          const decryptedAes = await aesDecrypt(arrayBuffer, this.aesKey);
          const decryptedData: any = decode(decryptedAes);

          console.log("Данные расшифрованы", decryptedData);

          this.handleIncoming(decryptedData);
        } else {
          try {
            if (!this.rsaPrivate) {
              console.error("RSA private key не готов");
              return;
            }

            const arrayBuffer = await blobToArrayBuffer(rawData);
            const decryptedRsa = await rsaDecrypt(arrayBuffer, this.rsaPrivate);
            const decryptedData: any = decode(decryptedRsa);

            if (decryptedData.type && decryptedData.type === "aes_key") {
              this.aesServerKey = this.base64ToBytes(decryptedData.key);
              this.socketReady = true;

              this.emit("socket_ready");
              console.log("Сокет полностью готов");
              errorReporter.setWebSocketClient(this);
              this.processQueue();
            }
          } catch (error) {
            console.error("Ошибка обработки RSA сообщения:", error);
            this.disconnect();
          }
        }
      } else {
        const data: any = JSON.parse(rawData);

        if (data.type === "key_exchange") {
          this.rsaPublicServer = data.key;
          let aesKey = generateAESKey();

          const aesKeyPayload: any = encode({
            type: "aes_key",
            key: aesKey,
          });

          this.aesKey = this.base64ToBytes(aesKey);

          const encryptedPayload = await rsaEncrypt(
            aesKeyPayload,
            this.rsaPublicServer as string,
          );
          this.socket?.send(encryptedPayload);
        }
      }
    };

    const scheduleReconnect = (): void => {
      if (this.reconnectTimeout) return;

      this.nextURL();
      const backoff = Math.min(
        this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
        this.maxReconnectDelay,
      );
      const jitter = Math.floor(Math.random() * 800);
      const delay = backoff + jitter;
      this.reconnectAttempts += 1;

      this.reconnectTimeout = window.setTimeout(() => {
        this.reconnectTimeout = null;
        this.connect();
      }, delay);
    };

    this.socket.onclose = (event: CloseEvent) => {
      console.warn("WebSocket закрыт", {
        code: event.code,
        reason: event.reason,
      });
      this.disconnect(false);
      if (this.autoReconnectEnabled) {
        scheduleReconnect();
      }
    };

    this.socket.onerror = () => {
      console.warn("WebSocket ошибка транспорта");
    };
  }

  handleIncoming(decryptedData: any) {
    const listeners = this.eventListeners[decryptedData.type];

    if (listeners && listeners.length > 0) {
      listeners.forEach((cb) => {
        try {
          cb(decryptedData);
        } catch (e) {
          console.error(e);
        }
      });
    } else {
      if (!this.eventQueue[decryptedData.type])
        this.eventQueue[decryptedData.type] = [];
      this.eventQueue[decryptedData.type].push(decryptedData);
    }

    if (decryptedData.ray_id && this.pendingRays[decryptedData.ray_id]) {
      this.pendingRays[decryptedData.ray_id].resolve(decryptedData);
      delete this.pendingRays[decryptedData.ray_id];
    }
  }

  isSocketReadyToSend(): boolean {
    return Boolean(
      this.isConnected &&
      this.socket &&
      this.socket.readyState === WebSocket.OPEN &&
      this.socketReady &&
      this.aesServerKey,
    );
  }

  async sendNow(data): Promise<any> {
    if (!this.isSocketReadyToSend() || !this.socket || !this.aesServerKey) {
      throw new Error("Socket is not ready");
    }

    const ray_id = this.generateRayID();

    const binaryData: any = encode({ ray_id, ...data });
    const encrypted: any = await aesEncrypt(binaryData, this.aesServerKey);
    if (!encrypted) {
      throw new Error("Не удалось зашифровать сообщение");
    }

    this.socket.send(encrypted);
    this.emit("sending", { ray_id, data });

    if (data.type === "ping") return;

    return new Promise((resolve, reject) => {
      this.pendingRays[ray_id] = { resolve, reject };

      setTimeout(() => {
        if (this.pendingRays[ray_id]) {
          this.emit("ray_timeout", { ray_id, data });
          this.pendingRays[ray_id].reject(
            new Error("Ответ не пришел на ray_id " + ray_id),
          );
          delete this.pendingRays[ray_id];
        }
      }, 60000);
    });
  }

  async send(data): Promise<any> {
    if (!this.isSocketReadyToSend()) {
      if (data?.type === "ping") return;

      return new Promise((resolve, reject) => {
        if (this.messageQueue.length > 1000) {
          reject(new Error("Message queue overflow"));
          return;
        }

        console.log("Отправка сообщения отложена до переподключения", data);
        this.messageQueue.push({ data, resolve, reject });
      });
    }

    return this.sendNow(data);
  }

  getCurrentURL(): string {
    return this.urls[this.urlIndex];
  }

  nextURL(): void {
    this.urlIndex = (this.urlIndex + 1) % this.urls.length;
  }

  generateRayID(): string {
    return crypto.randomUUID();
  }

  processQueue(): void {
    if (!this.socketReady || this.processingMessages) return;
    this.processingMessages = true;

    while (this.messageQueue.length > 0 && this.isSocketReadyToSend()) {
      const queued = this.messageQueue.shift();

      if (
        queued &&
        typeof queued === "object" &&
        Object.prototype.hasOwnProperty.call(queued, "data")
      ) {
        this.sendNow(queued.data)
          .then((result) => queued.resolve?.(result))
          .catch((error) => queued.reject?.(error));
        continue;
      }

      this.sendNow(queued).catch((error) => {
        console.error("Ошибка отправки queued сообщения:", error);
      });
    }

    this.processingMessages = false;
  }

  disconnect(
    clearQueue: boolean = false,
    disableReconnect: boolean = false,
  ): void {
    if (disableReconnect) {
      this.autoReconnectEnabled = false;
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    }

    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }
      this.socket = null;
    }

    this.isConnected = false;

    this.rsaPublicServer = null;
    this.aesKey = null;
    this.aesServerKey = null;
    this.socketReady = false;
    if (clearQueue) {
      this.messageQueue = [];
    }

    for (const ray_id in this.pendingRays) {
      this.pendingRays[ray_id].reject(new Error("Disconnected"));
      delete this.pendingRays[ray_id];
    }

    this.emit("socket_disconnect");
    this.emit("socket_not_ready");
  }

  onMessage(type: string, callback: (data: any) => void): void {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }

    if (!this.eventListeners[type].includes(callback)) {
      this.eventListeners[type].push(callback);

      if (this.eventQueue[type]) {
        while (this.eventQueue[type].length > 0) {
          callback(this.eventQueue[type].shift());
        }
      }
    }
  }

  offMessage(type: string, callback: (data: any) => void): void {
    if (this.eventListeners[type]) {
      this.eventListeners[type] = this.eventListeners[type].filter(
        (cb) => cb !== callback,
      );
    }
  }

  getConnectionStatus() {
    return {
      currentIndex: this.urlIndex,
      urls: this.urls,
    };
  }
  base64ToBytes(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(
      [...binaryString].map((char) => char.charCodeAt(0)),
    );
    return bytes.buffer;
  }
}

export const websocketClient = new WebSocketClient(BaseConfig.domains.ws);
