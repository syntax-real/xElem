import { createContext, useContext } from 'react';
import Dexie, { Table } from 'dexie';

export interface Download {
    mid: string;
    file: {
        name: string;
        file_map: number[];
        downloaded: { id: number; binary: ArrayBuffer }[];
        encrypted_key: string;
        encrypted_iv: string;
    };
}

export interface File {
    mid: string;
    name: string;
    blob: Blob;
}

export interface ImageCache {
    path: string;
    aura: string;
    file: string;
    simple: string;
    file_blob?: Blob | null;
    simple_blob: Blob;
}

export interface FilesCache {
    path: string;
    file: string;
    file_blob?: Blob;
}

export interface FilesChunk {
    id: string;
    path: string;
    file: string;
    offset: number;
    binary: Uint8Array;
}

export interface FileCacheV2 {
    file_id: number;
    hash_sha256: string;
    variant: string;
    path: string;
    mime: string;
    size: number;
    file_blob?: Blob;
    is_hash_verified?: boolean;
    download_date: number;
}

export interface FilesChunkV2 {
    file_id: number;
    variant: string;
    offset: number;
    binary: Uint8Array;
}

export class MyDatabase extends Dexie {
    downloads!: Table<Download, string>;
    files!: Table<File, string>;
    image_cache!: Table<ImageCache, string>
    files_cache!: Table<FilesCache, string>
    files_chunks!: Table<FilesChunk, string>
    file_cacheV2!: Table<FileCacheV2, string>
    files_chunksV2!: Table<FilesChunkV2, string>

    constructor() {
        super('Element_v2');
        this.version(5).stores({
            files: 'mid',
            downloads: 'mid',
            image_cache: '[path+file]',
            files_cache: '[path+file]',
            files_chunks: 'id, file, offset',
            file_cacheV2: '[file_id+variant], file_id, variant, path',
            files_chunksV2: '[file_id+variant+offset], [file_id+variant], file_id, offset'
        });
    }
}

export const db = new MyDatabase();

const DatabaseContext = createContext<MyDatabase | null>(null);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <DatabaseContext.Provider value={db}>
            {children}
        </DatabaseContext.Provider>
    );
};

export const useDatabase = (): MyDatabase => {
    const context = useContext(DatabaseContext);
    if (!context) {
        throw new Error('useDatabase must be used within a DatabaseProvider');
    }
    return context;
};

export default DatabaseContext;