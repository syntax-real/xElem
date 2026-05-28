import { useEffect, useRef, useState } from 'react';
import styles from './Console.module.scss';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/System/Hooks/useAuth';
import { websocketClient } from '../../../Services/WebSocketClient';

const Console = () => {
    const { t } = useTranslation();
    const { accountData } = useAuth();

    const [lines, setLines] = useState<string[]>([
        t('console.welcome')
    ]);
    const [input, setInput] = useState<string>("");
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);

    const bodyRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        websocketClient.on('ray_timeout', ({ ray_id, data }) => {
            setLines(prev => [...prev, `${t('console.timeout')} ${ray_id}: ${JSON.stringify(data)}`]);
        });
        websocketClient.on('sending', ({ ray_id, data }) => {
            setLines(prev => [...prev, `${t('console.sending')} ${ray_id}: ${JSON.stringify(data)}`]);
        });
        websocketClient.on('get', ({ ray_id, data }) => {
            setLines(prev => [...prev, `${t('console.get')} ${ray_id}: ${JSON.stringify(data)}`]);
        });
    }, [])

    useEffect(() => {
        if (bodyRef.current) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
    }, [lines]);


    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    /*************  ✨ Windsurf Command ⭐  *************/
    /**
     * Called when the user presses the Enter key in the console input field.
     * If the input field is not empty, it adds the input to the console lines
     * and adds the input to the history. It also resets the input field.
     */
    /*******  a983cfe4-db2b-4f4f-837e-4e03e6d8c5c8  *******/
    const onEnter = () => {
        if (!input.trim()) return;

        setLines(prev => [...prev, `${accountData.name}: ${input}`]);
        setHistory(prev => [...prev, input]);
        setHistoryIndex(-1);
        setInput("");
    };

    const onKeyDown = (e) => {
        if (e.key === "Enter") onEnter();

        if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!history.length) return;

            const idx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
            setHistoryIndex(idx);
            setInput(history[idx]);
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!history.length) return;

            if (historyIndex === -1) return;

            const idx = historyIndex + 1;
            if (idx >= history.length) {
                setHistoryIndex(-1);
                setInput("");
            } else {
                setHistoryIndex(idx);
                setInput(history[idx]);
            }
        }
    };

    return (
        <div className={styles.console} onClick={() => inputRef.current?.focus()}>
            <div className={styles.body} ref={bodyRef}>
                {lines.map((line, i) => {
                    let colorClass = '';

                    if (line.includes(t('console.sending'))) colorClass = styles.sending;
                    else if (line.includes(t('console.get'))) colorClass = styles.get;
                    else if (line.includes(t('console.timeout'))) colorClass = styles.timeout;
                    else colorClass = styles.user;

                    return (
                        <div key={i} className={colorClass}>{line}</div>
                    );
                })}

                <div className={styles.inputLine}>
                    <span className={styles.prompt}>{accountData.name}:</span>
                    <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onKeyDown}
                        className={styles.input}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </div>
            </div>
        </div>
    );
}

export default Console;