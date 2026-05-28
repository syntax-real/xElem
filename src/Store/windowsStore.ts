import { create } from 'zustand';
import { ReactNode } from 'react';

export interface IWindow {
    id: string;
    title: string;
    component: ReactNode;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    minimized?: boolean;
}

interface WindowsStore {
    windows: IWindow[];
    openWindow: (window: Omit<IWindow, 'zIndex'>) => void;
    closeWindow: (id: string) => void;
    bringToFront: (id: string) => void;
    updateWindow: (id: string, props: Partial<Omit<IWindow, 'id' | 'component'>>) => void;
}

export const useWindowsStore = create<WindowsStore>((set, get) => ({
    windows: [],
    openWindow: (window) => {
        const zIndex = get().windows.length ? Math.max(...get().windows.map(w => w.zIndex)) + 1 : 100;
        set({ windows: [...get().windows, { ...window, zIndex }] });
    },
    closeWindow: (id) => {
        set({ windows: get().windows.filter(w => w.id !== id) });
    },
    bringToFront: (id) => {
        const windows = get().windows;
        const maxZ = windows.length ? Math.max(...windows.map(w => w.zIndex)) : 100;

        set({
            windows: windows.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w)
        });
    },
    updateWindow: (id, props) => {
        set({ windows: get().windows.map(w => w.id === id ? { ...w, ...props } : w) });
    }
}));
