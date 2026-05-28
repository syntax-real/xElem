import { useWebSocket } from '../System/Context/WebSocket';
import { useAuth } from '../System/Hooks/useAuth';
import { useEffect, useState } from 'react';
import BaseConfig from '../Configs/Base';

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    if (!base64String) {
        console.error('Пустая строка base64String передана в urlBase64ToUint8Array');
        throw new Error('Неверный VAPID ключ: пустая строка');
    }

    try {
        let base64 = base64String.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4 !== 0) {
            base64 += '=';
        }
        const binaryStr = window.atob(base64);
        const outputArray = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            outputArray[i] = binaryStr.charCodeAt(i);
        }
        return outputArray;
    } catch (error) {
        console.error('Ошибка конвертации VAPID ключа:', error);
        throw error;
    }
}

async function checkNotificationSupport(): Promise<boolean> {
    if (!('Notification' in window)) {
        console.warn('Этот браузер не поддерживает уведомления');
        return false;
    }

    if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker не поддерживается в этом браузере');
        return false;
    }

    if (!('PushManager' in window)) {
        console.warn('Push API не поддерживается в этом браузере');
        return false;
    }

    if (isIOS && !isSafari) {
        console.warn('Push-уведомления на iOS поддерживаются только в Safari');
        return false;
    }

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        console.warn('Push-уведомления требуют HTTPS соединения');
        return false;
    }

    return true;
}

async function subscribeUser({ wsClient }): Promise<PushSubscription | null> {
    try {
        const isSupported = await checkNotificationSupport();
        if (!isSupported) {
            return null;
        }



        const registration = await navigator.serviceWorker.ready;
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
            console.log('Найдена существующая подписка');
            return existingSub;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Разрешение на уведомления отклонено');
            return null;
        }

        const applicationKey = urlBase64ToUint8Array(BaseConfig.vapid.public_key);

        const newSub: any = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationKey,
        });

        try {
            const res: any = await wsClient.send({
                type: 'social',
                action: 'notify/push_sub',
                payload: {
                    endpoint: newSub.endpoint,
                    expirationTime: newSub.expirationTime,
                    keys: {
                        p256dh: btoa(String.fromCharCode(...new Uint8Array(newSub.getKey('p256dh')))),
                        auth: btoa(String.fromCharCode(...new Uint8Array(newSub.getKey('auth'))))
                    }
                }
            })

            if (res.status !== 'success') {
                throw new Error('Не удалось отправить подписку на сервер');
            }

            console.log('Подписка успешно отправлена на сервер');
            return newSub;
        } catch (error) {
            console.error('Ошибка отправки подписки на сервер:', error);
            await newSub.unsubscribe();
            return null;
        }
    } catch (error) {
        console.error('Ошибка в subscribeUser:', error);
        return null;
    }
}

const Notifications = () => {
    const { wsClient } = useWebSocket();
    const { isSocketAuthorized } = useAuth();
    const [isSupported, setIsSupported] = useState<boolean>(true);

    useEffect(() => {
        checkNotificationSupport().then(setIsSupported);
    }, []);

    useEffect(() => {
        if (isSocketAuthorized && isSupported) {
            subscribeUser({ wsClient });
        }
    }, [isSocketAuthorized, isSupported]);

    return null;
};

export default Notifications;