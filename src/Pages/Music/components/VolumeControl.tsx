import { useState } from 'react';
import Slider from '../../../UIKit/Components/Player/Slider.tsx';
import { VolumeControlButton } from '../../../System/Elements/MusicPlayer.tsx';
import { I_VOLUME_MINUS, I_VOLUME_PLUS } from '../../../System/UI/IconPack.js';
import { AnimatePresence, motion } from "framer-motion";
import { useClickAway } from '@uidotdev/usehooks';
import { usePlayerStore } from '../../../Store/playerStore.ts';

export const VolumeControl = () => {
    const volume = usePlayerStore((state) => state.volume);
    const setVolume = usePlayerStore((state) => state.setVolume);
    const [volumeControlVisibility, setVolumeControlVisibility] = useState(false);
    const sliderRef = useClickAway(() => setVolumeControlVisibility(false));

    const selectVolume = (newVolume: number) => {
        setVolume(newVolume);
    };

    return (
        <div className='UI-VolumeControl'>
            <AnimatePresence>
                {volumeControlVisibility && (
                    <motion.div
                        className='UI-VolumeControl__slider'
                        initial={{ opacity: 0, scale: 0.5, y: 60 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: 60 }}
                        ref={sliderRef}
                    >
                        <button onClick={() => selectVolume(Math.min(volume + 0.1, 1))} className='UI-VolumeControl__button'>
                            <I_VOLUME_PLUS />
                        </button>

                        <Slider
                            value={volume}
                            onChange={selectVolume}
                            vertical={true}
                            min={0}
                            max={1}
                            step={0.01}
                        />

                        <button onClick={() => selectVolume(Math.max(volume - 0.1, 0))} className='UI-VolumeControl__button'>
                            <I_VOLUME_MINUS />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
            <VolumeControlButton
                onClick={() => setVolumeControlVisibility((prev) => !prev)}
            />
        </div>
    );
};
