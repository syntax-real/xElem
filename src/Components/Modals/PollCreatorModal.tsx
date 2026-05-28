import { useState, useRef, useEffect } from 'react';
import { I_CLOSE } from '../../System/UI/IconPack';
import { Block, PartitionName, Switch, Button, TextInput } from '../../UIKit';
import styles from './PollCreatorModal.module.scss';

export interface PollCreatorData {
    question: string;
    options: string[];
    is_anonymous: boolean;
    multiple_choice: boolean;
}

interface Props {
    initialData?: PollCreatorData | null;
    onSave: (data: PollCreatorData) => void;
    onClose: () => void;
}

const PollCreatorModal = ({ initialData, onSave, onClose }: Props) => {
    const [question, setQuestion] = useState(initialData?.question || '');
    const [options, setOptions] = useState<string[]>(
        initialData?.options?.length ? [...initialData.options, '', ''].slice(0, Math.max(initialData.options.length, 2)) : ['', '']
    );
    const [isAnonymous, setIsAnonymous] = useState(initialData?.is_anonymous ?? true);
    const [isMultiple, setIsMultiple] = useState(initialData?.multiple_choice ?? false);
    const questionRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        questionRef.current?.focus();
    }, []);

    const validOptions = options.map(o => o.trim()).filter(Boolean);
    const canSave = validOptions.length >= 2;

    const handleSave = () => {
        if (!canSave) return;
        onSave({
            question: question.trim(),
            options: validOptions,
            is_anonymous: isAnonymous,
            multiple_choice: isMultiple
        });
    };

    const updateOption = (idx: number, value: string) => {
        const next = [...options];
        next[idx] = value;
        setOptions(next);
    };

    const removeOption = (idx: number) => {
        setOptions(options.filter((_, i) => i !== idx));
    };

    const addOption = () => {
        if (options.length < 10) setOptions([...options, '']);
    };

    const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (idx === options.length - 1 && options.length < 10) {
                addOption();
            }
        }
    };

    return (
        <div className={styles.pollCreator}>
            <PartitionName name='Вопрос' />
            <Block>
                <TextInput
                    ref={questionRef}
                    placeholder='О чём хотите спросить? (необязательно)'
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    maxLength={200}
                />
            </Block>

            <PartitionName name={`Варианты ответа · ${validOptions.length}/10`} />
            <Block className={styles.optionsBlock}>
                {options.map((opt, i) => (
                    <div key={i} className={styles.optionRow}>
                        <TextInput
                            placeholder={`Вариант ${i + 1}`}
                            value={opt}
                            onChange={e => updateOption(i, e.target.value)}
                            onKeyDown={e => handleKeyDown(e, i)}
                            maxLength={100}
                        />
                        {options.length > 2 && (
                            <button className={styles.removeBtn} onClick={() => removeOption(i)}>
                                <I_CLOSE />
                            </button>
                        )}
                    </div>
                ))}
                {options.length < 10 && (
                    <Button
                        title='Добавить вариант'
                        onClick={addOption}
                        buttonStyle='action'
                    />
                )}
                {!canSave && (
                    <div className={styles.hint}>Минимум 2 заполненных варианта</div>
                )}
            </Block>

            <PartitionName name='Настройки' />
            <Block className={styles.settingsBlock}>
                <div className="UI-Parameter">
                    Анонимный опрос
                    <Switch
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                    />
                </div>
                <div className="UI-Parameter">
                    Несколько вариантов ответа
                    <Switch
                        checked={isMultiple}
                        onChange={(e) => setIsMultiple(e.target.checked)}
                    />
                </div>
            </Block>

            <Block>
                <Button
                    title='Сохранить'
                    onClick={handleSave}
                    isActive={canSave}
                    buttonStyle='action'
                />
            </Block>
        </div>
    );
};

export default PollCreatorModal;
