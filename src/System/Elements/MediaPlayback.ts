const mediaEvents = new EventTarget();

export const stopOtherMedia = (currentId: string) => {
    mediaEvents.dispatchEvent(new CustomEvent('stop', { detail: currentId }));
};

export const onMediaStop = (id: string, callback: () => void) => {
    const handler = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail !== id) {
            callback();
        }
    };
    mediaEvents.addEventListener('stop', handler);
    return () => mediaEvents.removeEventListener('stop', handler);
};
