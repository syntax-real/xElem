import { useSelector, useDispatch } from 'react-redux';
import { removeNotification } from '../Store/slices/notifications';
import Notification from '../Pages/Notifications/Components/Notification';
import { Button } from '../UIKit';
import { deviceType } from 'react-device-detect';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import useSettingsStore from '../Store/settingsStore';

export const ToastNotifications = () => {
    const { notificationsToast } = useSettingsStore();
    const notifications = useSelector((state: any) => state.notifications.list);
    const dispatch = useDispatch();
    const [isHovered, setIsHovered] = useState(false);
    const [fading, setFading] = useState(false);

    const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const removeTimeoutRef = useRef<NodeJS.Timeout | null>(null);


    const variants = {
        hidden: {
            opacity: 0,
            y: 100
        },
        visible: {
            opacity: 1,
            y: 0
        },
        fading: {
            opacity: 0.2,
            y: 0,
            transition: { duration: 0.8 }
        }
    };

    const clearTimers = () => {
        if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
        if (removeTimeoutRef.current) clearTimeout(removeTimeoutRef.current);
        fadeTimeoutRef.current = null;
        removeTimeoutRef.current = null;
    };

    const startTimers = () => {
        clearTimers();
        if (isHovered || notifications.length === 0) return;

        fadeTimeoutRef.current = setTimeout(() => {
            if (!isHovered) {
                setFading(true);

                removeTimeoutRef.current = setTimeout(() => {
                    if (!isHovered) {
                        notifications.forEach(n => dispatch(removeNotification(n.id)));
                    }
                    setFading(false);
                }, 800);
            }
        }, 10000);
    };

    useEffect(() => {
        setFading(false);
        startTimers();
        return clearTimers;
    }, [notifications?.length, isHovered]);

    const removeNotifications = () => {
        notifications.forEach(n => dispatch(removeNotification(n.id)));
    }

    if (!notificationsToast) return null;
    if (deviceType === 'mobile') return null;
    if (notifications.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="ToastNotifications"
                initial="hidden"
                animate={fading ? "fading" : "visible"}
                exit="hidden"
                variants={variants}
                onMouseEnter={() => {
                    setIsHovered(true);
                    setFading(false);
                    clearTimers();
                }}
                onMouseLeave={() => {
                    setIsHovered(false);
                    startTimers();
                }}
            >
                {notifications.length > 0 && (
                    <Button
                        className="ToastNotifications-Close"
                        title="Скрыть все"
                        onClick={removeNotifications}
                    />
                )}

                {notifications.map(n => (
                    <motion.div
                        key={n.id}
                        layout
                        variants={variants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <Notification
                            notification={n}
                            className="UI-ToastNotification"
                        />
                    </motion.div>
                ))}

            </motion.div>
        </AnimatePresence>
    );
};