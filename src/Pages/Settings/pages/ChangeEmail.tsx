import { useState } from 'react';
import { useModalsStore } from '@/Store/modalsStore';
import { useTranslation } from 'react-i18next';
import { Block, Button, TextInput } from '@/UIKit';
import { useAuth } from '@/System/Hooks/useAuth';
import { useWebSocket } from '@/System/Context/WebSocket';

const ChangeEmail = () => {
    const { accountData, updateAccount } = useAuth();
    const { wsClient } = useWebSocket();
    const { t } = useTranslation();
    const { openModal } = useModalsStore() as any;
    const [email, setEmail] = useState(accountData.email);
    const [codeStep, setCodeStep] = useState(false);
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const changeEmail = () => {
        if (email === accountData.email) return;
        setIsLoading(true);

        wsClient.send({
            type: 'social',
            action: 'change_profile/email',
            email: email
        }).then((res) => {
            setIsLoading(false);
            if (res.status === 'confirm_code') {
                setCodeStep(true);
            } else if (res.status === 'success') {
                updateAccount({ email: email });
                openModal({ type: 'alert', props: { title: t('success'), message: 'Почта изменена' } });
            } else if (res.status === 'error') {
                openModal({ type: 'alert', props: { title: t('error'), message: res.message } });
            }
        });
    };

    const confirmCode = () => {
        setIsLoading(true);
        wsClient.send({
            type: 'social',
            action: 'change_profile/email',
            email: email,
            code: code
        }).then((res) => {
            setIsLoading(false);
            if (res.status === 'success') {
                updateAccount({ email: email });
                setCodeStep(false);
                setCode('');
                openModal({ type: 'alert', props: { title: t('success'), message: 'Почта изменена' } });
            } else if (res.status === 'error') {
                openModal({ type: 'alert', props: { title: t('error'), message: res.message } });
            }
        });
    };

    return (
        <>
            <img
                src="/static_sys/Images/All/ChangeEmail.svg"
                className="UI-PB_Image"
                alt="фыр"
                draggable={false}
            />
            <div id="S-CP_EmailTitle" className="UI-PB_InputText">
                Текущая: {accountData.email}
            </div>
            <Block
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                }}
            >
                <TextInput
                    placeholder="Введите почту"
                    type="text"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value) }}
                    transparent={true}
                />
                {codeStep && (
                    <TextInput
                        placeholder="Код с почты"
                        type="text"
                        value={code}
                        onChange={(e) => { setCode(e.target.value) }}
                        transparent={true}
                        maxLength={7}
                    />
                )}
                <div style={{ marginTop: 5, display: 'flex' }}>
                    <Button
                        title={codeStep ? 'Подтвердить' : t('change')}
                        onClick={codeStep ? confirmCode : changeEmail}
                        buttonStyle="action"
                        isActive={codeStep ? code.length >= 6 : (email !== accountData.email)}
                        isLoading={isLoading}
                        style={{ flex: 1 }}
                    />
                </div>
            </Block>
        </>
    );
};

export default ChangeEmail;
