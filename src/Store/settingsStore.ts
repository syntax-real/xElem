import { create } from 'zustand';

type ThemeID =
    | 'LIGHT'
    | 'GOLD'
    | 'DARK'
    | 'GOLD-DARK'
    | 'AMOLED'
    | 'AMOLED-GOLD';

interface Settings {
    theme: ThemeID;
    showOnlineUsers: boolean;
    showNewUpdate: boolean;
    showDownloads: boolean;
    autoVideoDownload: boolean;
    doubleClickLike: boolean;
    hideProfileAnimation: boolean;
    notificationsToast: boolean;
    notificationsSound: boolean;
}

const DEFAULT_SETTINGS: Settings = {
    theme: 'LIGHT',
    showOnlineUsers: true,
    showNewUpdate: true,
    showDownloads: false,
    autoVideoDownload: false,
    doubleClickLike: true,
    hideProfileAnimation: true,
    notificationsToast: true,
    notificationsSound: true
};

function loadSettings(): Settings {
    const json = localStorage.getItem('Settings');
    if (!json) return DEFAULT_SETTINGS;
    try {
        const parsed = JSON.parse(json) as Partial<Settings>;
        return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

function saveSettings(settings: Settings) {
    localStorage.setItem('Settings', JSON.stringify(settings));
}

interface SettingsStore extends Settings {
    setTheme: (theme: ThemeID) => void;
    setShowOnlineUsers: (value: boolean) => void;
    setShowNewUpdate: (value: boolean) => void;
    setShowDownloads: (value: boolean) => void;
    setAutoDownload: (value: boolean) => void;
    setDoubleClickLike: (value: boolean) => void;
    setHideProfileAnimation: (value: boolean) => void;
    setNotificationsToast: (value: boolean) => void;
    setNotificationsSound: (value: boolean) => void;
}

const useSettingsStore = create<SettingsStore>((set) => {
    const initialSettings = loadSettings();

    const updateAndSave = (updates: Partial<Settings>) => {
        set((state) => {
            const newState = { ...state, ...updates };
            saveSettings(newState);
            return newState;
        });
    };

    return {
        ...initialSettings,
        setTheme: (theme) => updateAndSave({ theme }),
        setShowOnlineUsers: (value) => updateAndSave({ showOnlineUsers: value }),
        setShowNewUpdate: (value) => updateAndSave({ showNewUpdate: value }),
        setShowDownloads: (value) => updateAndSave({ showDownloads: value }),
        setAutoDownload: (value) => updateAndSave({ autoVideoDownload: value }),
        setDoubleClickLike: (value) => updateAndSave({ doubleClickLike: value }),
        setHideProfileAnimation: (value) => updateAndSave({ hideProfileAnimation: value }),
        setNotificationsToast: (value) => updateAndSave({ notificationsToast: value }),
        setNotificationsSound: (value) => updateAndSave({ notificationsSound: value }),
    };
});

export default useSettingsStore;