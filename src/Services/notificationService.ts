import useSettingsStore from '../Store/settingsStore';
import { updateOrCreateAccount } from '../Store/slices/auth';
import { addMessage, updateChat } from '../Store/slices/messenger';
import { addNotification } from '../Store/slices/notifications';
import store from '../Store/store';
import { websocketClient } from './WebSocketClient';

class NotificationService {
    constructor() {
        this.init();
    }

    init() {
        websocketClient.onMessage('social', this.handleNotification);
    }

    handleNewMessage = (data) => {
        const newMessage = {
            mid: data.mid,
            uid: data.uid,
            decrypted: JSON.parse(data.message),
            is_decrypted: true,
            date: data.date
        };

        store.dispatch(addMessage({
            chat_id: data.target.id,
            chat_type: data.target.type,
            message: newMessage
        }));

        let lastMessageText = newMessage.decrypted?.text;
        if (newMessage.decrypted?.type === 'voice') {
            lastMessageText = 'Голосовое сообщение';
        } else if (newMessage.decrypted?.type === 'video') {
            lastMessageText = 'Видео сообщение';
        } else if (newMessage.decrypted?.type === 'image') {
            lastMessageText = 'Фото';
        } else if (newMessage.decrypted?.type === 'file') {
            lastMessageText = 'Файл';
        }

        store.dispatch(updateChat({
            chat_id: data.target.id,
            chat_type: data.target.type,
            newData: {
                last_message: lastMessageText,
                last_message_date: new Date().toISOString()
            },
            notificationsDelta: 1
        }));

        this.addNotification();
    };

    addNotification = () => {
        const state = store.getState();

        if (state.auth?.accountData && state.auth?.accountData?.id !== null) {
            store.dispatch(updateOrCreateAccount({
                id: state.auth.accountData.id,
                notificationsDelta: 1
            }));
        }

        const settings = useSettingsStore.getState();

        if (!settings?.notificationsSound) return;

        const audio = new Audio('/static_sys/Notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
            console.warn('Не удалось воспроизвести звук уведомления');
        });
    };

    handleNewNotification = (data) => {
        this.addNotification();
        store.dispatch(
            addNotification(data.notification)
        )
    };

    handleNotification = (data) => {
        switch (data?.action) {
            case 'new_message':
                this.handleNewMessage(data);
                break;
            case 'notify':
                this.handleNewNotification(data);
                break;
        }
    };
}

export const notificationService = new NotificationService();