import { useRef } from 'react';
import { I_COPY } from '../../../System/UI/IconPack';
import TextInput from './TextInput';

interface CopyInputProps {
    value: string | null;
    buttons?: any;
}

const CopyInput = ({ value, buttons }: CopyInputProps) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const copy = () => {
        if (inputRef.current) {
            inputRef.current.select();
            navigator.clipboard.writeText(inputRef.current.value);
        }
    };

    return (
        <div className="UI-CopyInput">
            <TextInput
                placeholder="Пусто"
                value={value ?? ''}
                type="text"
                ref={inputRef}
                readOnly
            />
            <button onClick={copy}>
                <I_COPY />
            </button>
            {
                buttons?.length > 0 && (
                    buttons.map((button, i) => (
                        <button
                            key={i}
                            onClick={button.onClick}
                        >
                            {button.icon}
                        </button>
                    ))
                )
            }
        </div>
    )
}

export default CopyInput;