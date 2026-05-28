import { create } from 'zustand';

type DownloadStatus =
    | 'idle'
    | 'downloading'
    | 'paused'
    | 'completed'
    | 'error';

export type DownloadItem = {
    id: string;
    hash_sha256: string;
    path: string;
    size: number;
    mime?: string,
    variants?: any;
    downloadType?: string;
    downloadContent?: string;
    downloaded: number;
    status: DownloadStatus;
    downloadDate: number;
};

type DownloadStore = {
    downloads: Record<string, DownloadItem>;

    createDownload: (
        id: string,
        variant: string,
        hash_sha256: string,
        path: string,
        size: number,
        mime?: string,
        downloadType?: string,
        downloadContent?: string
    ) => void;

    updateDownload: (id: string, downloaded: number) => void;

    completeDownload: (id: string) => void;

    pauseDownload: (id: string) => void;

    removeDownload: (id: string) => void;
};

export const useDownloadStore = create<DownloadStore>((set, get) => ({
    downloads: {},

    createDownload: (id, variant, hash_sha256, path, size, mime, downloadType, downloadContent) => {
        set((state) => ({
            downloads: {
                ...state.downloads,
                [id]: {
                    id,
                    variant,
                    hash_sha256,
                    path,
                    size,
                    downloaded: 0,
                    status: 'downloading',
                    mime,
                    downloadType,
                    downloadContent,
                    downloadDate: Date.now(),
                },
            },
        }));
    },

    updateDownload: (id, downloaded) => {
        const file = get().downloads[id];
        if (!file) return;

        set((state) => ({
            downloads: {
                ...state.downloads,
                [id]: {
                    ...file,
                    downloaded
                },
            },
        }));
    },

    completeDownload: (id) => {
        const file = get().downloads[id];
        if (!file) return;

        set((state) => ({
            downloads: {
                ...state.downloads,
                [id]: {
                    ...file,
                    downloaded: file.size,
                    status: 'completed',
                },
            },
        }));
    },

    pauseDownload: (id) => {
        const file = get().downloads[id];
        if (!file) return;

        set((state) => ({
            downloads: {
                ...state.downloads,
                [id]: {
                    ...file,
                    status: 'paused',
                },
            },
        }));
    },

    removeDownload: (id) => {
        set((state) => {
            const downloads = { ...state.downloads };
            delete downloads[id];

            return { downloads };
        });
    },
}));
