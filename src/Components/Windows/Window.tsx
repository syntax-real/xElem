import { useRef, useEffect } from 'react';
import { useWindowsStore, IWindow } from '../../Store/windowsStore';
import styles from './Window.module.scss';
import { I_CLOSE } from '../../System/UI/IconPack';

interface WindowProps {
    win: IWindow;
    title: string;
}

const Window: React.FC<WindowProps> = ({ title, win }) => {
    const { bringToFront, updateWindow, closeWindow } = useWindowsStore();
    const windowRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef(false);
    const offsetRef = useRef({ x: 0, y: 0 });

    const onMouseDown = (e: React.MouseEvent) => {
        bringToFront(win.id);

        draggingRef.current = true;
        offsetRef.current = { x: e.clientX - win.x, y: e.clientY - win.y };
    };

    const onMouseMove = (e: MouseEvent) => {
        if (!draggingRef.current) return;

        let newX = e.clientX - offsetRef.current.x;
        let newY = e.clientY - offsetRef.current.y;

        const minX = 0;
        const minY = 0;
        const maxX = globalThis.window.innerWidth - win.width;
        const maxY = globalThis.window.innerHeight - win.height;

        newX = Math.max(minX, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));

        updateWindow(win.id, { x: newX, y: newY });
    };

    const onMouseUp = () => {
        draggingRef.current = false;
    };

    useEffect(() => {
        globalThis.window.addEventListener('mousemove', onMouseMove);
        globalThis.window.addEventListener('mouseup', onMouseUp);

        return () => {
            globalThis.window.removeEventListener('mousemove', onMouseMove);
            globalThis.window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    return (
        <div
            ref={windowRef}
            className={styles.window}
            style={{
                position: 'absolute',
                top: win.y,
                left: win.x,
                width: win.width,
                height: win.height,
                zIndex: win.zIndex,
                display: win.minimized ? 'none' : 'flex'
            }}
        >
            <div
                className={styles.header}
                onMouseDown={onMouseDown}
            >
                <span className={styles.title}>{title || 'Window'}</span>
                <button className={styles.close} onClick={() => closeWindow(win.id)}>
                    <I_CLOSE />
                </button>
            </div>
            <div className={styles.content}>
                {win.component}
            </div>
        </div>
    );
};

export default Window;
