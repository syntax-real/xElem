import {
    useRef,
    useEffect,
    useState,
    forwardRef,
    useImperativeHandle,
    ChangeEvent,
    KeyboardEvent,
    useLayoutEffect,
    ClipboardEvent,
    useCallback,
    memo,
} from 'react';
import handleSmartInput from '../../Utils/handleSmartInput';
import { isMobile } from 'react-device-detect';
import '../../../System/UI/SocialInput.scss';

interface SocialInputProps {
    placeholder?: string;
    value: string;
    onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
    onEnter?: () => void;
    onPaste?: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
    maxLength?: number;
    simple?: boolean;
    style?: React.CSSProperties;
}

const SocialInput = forwardRef<HTMLTextAreaElement, SocialInputProps>(
    (
        {
            placeholder = '',
            value,
            onChange,
            onEnter,
            onPaste,
            maxLength,
            simple = false,
            style
        },
        ref,
    ) => {
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const pendingCursor = useRef<number | null>(null);
        const [radius, setRadius] = useState<number>(100);
        const [internalValue, setInternalValue] = useState<string>(value);
        const mousePosition = useRef({ x: 0, y: 0 });

        useLayoutEffect(() => {
            setInternalValue(value);
        }, [value]);

        useImperativeHandle(
            ref,
            () => textareaRef.current as HTMLTextAreaElement,
            [],
        );

        const trackMousePosition = useCallback((e: MouseEvent) => {
            mousePosition.current = { x: e.clientX, y: e.clientY };
        }, []);

        useEffect(() => {
            document.addEventListener('mousemove', trackMousePosition);

            return () => {
                document.removeEventListener('mousemove', trackMousePosition);
            };
        }, [trackMousePosition]);

        const resize = () => {
            const el = textareaRef.current;
            if (!el) return;
            const container = el.parentElement;
            const containerHeight = container
                ? container.offsetHeight
                : el.scrollHeight;
            const lineHeight =
                parseFloat(getComputedStyle(el).lineHeight || '20') || 20;
            const rows = Math.max(5, Math.floor(containerHeight / lineHeight));
            const newRadius = Math.max(10, 100 - (rows - 1) * 20);
            setRadius(newRadius);
        };

        const autoResize = () => {
            const el = textareaRef.current;
            if (!el) return;

            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        };

        useLayoutEffect(() => {
            if (value !== internalValue) {
                setInternalValue(value);
            }
        }, [value]);

        useEffect(() => {
            resize();
        }, [value]);

        useLayoutEffect(() => {
            autoResize();
            resize();

            const textarea = textareaRef.current;
            if (!textarea) return;

            if (pendingCursor.current !== null) {
                const pos = pendingCursor.current;
                pendingCursor.current = null;

                textarea.setSelectionRange(pos, pos);
            }
        }, [internalValue]);

        const saveCursor = () => {
            const el = textareaRef.current;
            if (!el) return;
            pendingCursor.current = el.selectionStart;
        };

        const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
            saveCursor();

            handleSmartInput(e, (newValue: string) => {
                setInternalValue(newValue);

                if (onChange) {
                    const syntheticEvent = {
                        ...e,
                        target: { ...e.target, value: newValue },
                    } as ChangeEvent<HTMLTextAreaElement>;

                    onChange(syntheticEvent);
                }
            });
        };

        const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter') {
                if (e.shiftKey || isMobile) {
                    e.preventDefault();
                    const el = textareaRef.current;
                    if (!el) return;

                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                    const cursor = el.selectionStart;

                    const newValue =
                        internalValue.slice(0, cursor) +
                        '\n' +
                        internalValue.slice(cursor);

                    pendingCursor.current = cursor + 1;

                    if (onChange) {
                        const syntheticEvent = {
                            ...e,
                            target: { ...el, value: newValue },
                        } as unknown as ChangeEvent<HTMLTextAreaElement>;
                        onChange(syntheticEvent);
                    }

                    setInternalValue(newValue);
                } else {
                    e.preventDefault();
                    if (!isMobile) {
                        onEnter?.();
                    }
                }
            }
        };

        const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
            if (onPaste) {
                onPaste(e);
            }
        };

        return (
            <div className="SocialInput-container">
                <textarea
                    className="UI-Input"
                    ref={textareaRef}
                    value={internalValue}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    rows={1}
                    style={{
                        ...style,
                        overflow: 'hidden',
                        resize: 'none',
                        transition: 'border-radius 0.2s ease',
                        borderRadius: simple ? '12px' : `${radius}px`
                    }}
                />
            </div>
        );
    },
);

export default memo(SocialInput);
