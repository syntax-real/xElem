import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { I_CHECK_MARK, I_DROPDOWN } from '../../../System/UI/IconPack';
import { createPortal } from 'react-dom';
import { useClickAway } from '@uidotdev/usehooks';

interface IDropdownSelect {
    list: any[];
    setSelected: (index: number) => void;
    selected?: number;
}

const DropdownSelect = ({ list, setSelected, selected }: IDropdownSelect) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeSelect, setActiveSelect] = useState<any>(selected ?? 0);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useClickAway(() => {
        setIsOpen(false);
    }) as React.RefObject<HTMLDivElement> | any;

    const variants = {
        hidden: {
            opacity: 0,
            scale: 0.5,
            y: '-30%',
            boxShadow: '0px 0px 0px 0px var(--AIR_CONTEXT_SHADOW_COLOR_START)',
            transition: { duration: 0.15 },
        },
        visible: {
            opacity: 1,
            scale: 1,
            y: '0%',
            boxShadow: '0px 1px 10px 1px var(--AIR_CONTEXT_SHADOW_COLOR_END)',
            transition: { duration: 0.15 },
        },
    }

    useEffect(() => {
        if (selected !== undefined) {
            setActiveSelect(selected);
        }
    }, [selected]);

    useEffect(() => {
        if (!isOpen) return;

        let frame;

        const update = () => {
            if (!buttonRef.current) return;

            const rect = buttonRef.current.getBoundingClientRect();

            setCoords({
                top: rect.bottom,
                left: rect.left,
                width: rect.width,
            });
        };

        const handle = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(update);
        };

        window.addEventListener('scroll', handle, true);
        window.addEventListener('resize', handle);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('scroll', handle, true);
            window.removeEventListener('resize', handle);
        };
    }, [isOpen]);


    const toggleOpen = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();

            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }

        setIsOpen(prev => !prev);
    };

    const handleSelect = (i) => {
        setSelected(i);
        setActiveSelect(i);
    };

    return (
        <>
            <button
                ref={buttonRef}
                className="UI-DropdownSelect"
                onClick={toggleOpen}
            >
                {list?.[activeSelect]?.title} <I_DROPDOWN />
            </button>
            {isOpen &&
                createPortal(
                    <AnimatePresence>
                        <motion.div
                            className="UI-LG_Block UI-GovernButtons"
                            style={{
                                position: 'fixed',
                                top: coords.top,
                                left: coords.left,
                                minWidth: coords.width,
                                zIndex: 9999
                            }}
                            variants={variants}
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            ref={menuRef}
                        >
                            <div className="Container">
                                {list.map((item, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSelect(i)}
                                        style={{
                                            background: i === activeSelect ? 'var(--LG_AIR_BLOCK_COLOR)' : undefined
                                        }}
                                    >
                                        {
                                            i === activeSelect && (
                                                <I_CHECK_MARK />
                                            )
                                        }
                                        {item.title}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>,
                    document.body
                )
            }
        </>
    );
};

export default DropdownSelect;