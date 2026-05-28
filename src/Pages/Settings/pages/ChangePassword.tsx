import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useModalsStore } from '@/Store/modalsStore';
import { Button, TextInput } from '@/UIKit';
import { useWebSocket } from '@/System/Context/WebSocket';

const ChangePassword = () => {
    const { t } = useTranslation();
    const { wsClient } = useWebSocket();
    const { openModal } = useModalsStore() as any;
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [codeStep, setCodeStep] = useState(false);
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const changePassword = () => {
        setIsLoading(true);
        wsClient.send({
            type: 'social',
            action: 'change_profile/password',
            old_password: oldPassword,
            new_password: newPassword,
        }).then((res) => {
            setIsLoading(false);
            if (res.status === 'confirm_code') {
                setCodeStep(true);
            } else if (res.status === 'success') {
                openModal({ type: 'alert', props: { title: t('success'), message: 'Пароль изменён' } });
            } else if (res.status === 'error') {
                openModal({ type: 'alert', props: { title: t('error'), message: res.message } });
            }
        });
    };

    const confirmCode = () => {
        setIsLoading(true);
        wsClient.send({
            type: 'social',
            action: 'change_profile/password',
            old_password: oldPassword,
            new_password: newPassword,
            code: code,
        }).then((res) => {
            setIsLoading(false);
            if (res.status === 'success') {
                setCodeStep(false);
                setCode('');
                setOldPassword('');
                setNewPassword('');
                openModal({ type: 'alert', props: { title: t('success'), message: 'Пароль изменён' } });
            } else if (res.status === 'error') {
                openModal({ type: 'alert', props: { title: t('error'), message: res.message } });
            }
        });
    };

    return (
        <>
            <img
                src="/static_sys/Images/All/ChangePassword.svg"
                className="UI-PB_Image"
                alt="фыр"
                draggable={false}
            />
            <div className="UI-PB_InputText">
                Запомните или запишите пароль, если вы его забудете, вы не сможете войти
                в аккаунт.
            </div>
            <div
                className="UI-Block"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                }}
            >
                <TextInput
                    placeholder={t('old_password')}
                    type="text"
                    value={oldPassword}
                    onChange={(e) => { setOldPassword(e.target.value) }}
                    transparent={true}
                />
                <TextInput
                    placeholder={t('new_password')}
                    type="text"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value) }}
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
                        onClick={codeStep ? confirmCode : changePassword}
                        buttonStyle="action"
                        isActive={codeStep ? code.length >= 6 : (oldPassword !== '' && newPassword !== '')}
                        isLoading={isLoading}
                        style={{ flex: 1 }}
                    />
                </div>
            </div>
        </>
    );
};

export default ChangePassword;
