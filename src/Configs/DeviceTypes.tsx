import { I_ANDROID, I_ANONYMOUS, I_APPLE, I_SAFARI, I_WINDOWS } from '@/System/UI/IconPack';
import { t } from 'i18next';

export const DeviceTypes = {
    0: {
        name: t('sessions_anon'),
        color: '#64748b',
        icon: <I_ANONYMOUS />
    },
    1: {
        name: t('sessions_browser'),
        color: 'var(--ACCENT_COLOR)',
        icon: <I_SAFARI />
    },
    2: {
        name: 'Android',
        color: '#10b981',
        icon: <I_ANDROID />
    },
    3: {
        name: 'iOS',
        color: '#000000',
        icon: <I_APPLE />
    },
    4: {
        name: 'Windows',
        color: '#3554f0',
        icon: <I_WINDOWS />
    },
    5: {
        name: 'MacOS',
        color: '#515256',
        icon: <I_APPLE />
    },
    6: {
        name: 'Linux',
        color: '#ff9e02',
        icon: <I_ANONYMOUS />
    },
};