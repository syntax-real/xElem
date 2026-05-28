import { useTranslation } from 'react-i18next';
import { Block, Button, Switch } from '@/UIKit';
import { useState } from 'react';
import { useWebSocket } from '@/System/Context/WebSocket';
import { useModalsStore } from '@/Store/modalsStore';
import { useAuth } from '@/System/Hooks/useAuth';

const DeleteAccount = () => {
    const { t } = useTranslation();
    const { accountData, deleteAccount, setSocketAuthorized } = useAuth();
    const { wsClient } = useWebSocket();
    const { openModal } = useModalsStore();
    const [isLoading, setIsLoading] = useState(false);
    const [deletePostsWithAccount, setDeletePostsWithAccount] = useState(false);

    const startDeleteProcess = (password?: string) => {
        setIsLoading(true);
        wsClient.send({
            type: 'social',
            action: 'account/delete',
            payload: {
                delete_posts: deletePostsWithAccount,
                password
            }
        }).then(res => {
            setIsLoading(false);
            if (res.status === 'confirm_code') {
                // Показываем ввод кода с почты
                openModal({
                    type: 'input',
                    props: {
                        title: 'Код подтверждения',
                        message: 'Введите код, отправленный на вашу почту',
                        onConfirm: (code) => {
                            setIsLoading(true);
                            wsClient.send({
                                type: 'social',
                                action: 'account/delete_confirm',
                                payload: {
                                    code,
                                    delete_posts: deletePostsWithAccount
                                }
                            }).then(confirmRes => {
                                setIsLoading(false);
                                if (confirmRes.status === 'success') {
                                    deleteAccount(accountData.id);
                                    setSocketAuthorized(false);
                                    window.location.reload();
                                } else {
                                    openModal({
                                        type: 'alert',
                                        props: {
                                            title: t('error'),
                                            message: confirmRes.message
                                        }
                                    });
                                }
                            });
                        }
                    }
                });
            } else if (res.status === 'success') {
                deleteAccount(accountData.id);
                setSocketAuthorized(false);
                window.location.reload();
            } else {
                openModal({
                    type: 'alert',
                    props: {
                        title: t('error'),
                        message: res.message
                    }
                });
            }
        });
    }

    const handleDeleteAccount = () => {
        openModal({
            type: 'input',
            props: {
                title: t('confirm_delete'),
                message: t('confirm_delete_desc'),
                onConfirm: (inputValue) => {
                    if (inputValue !== accountData.email) {
                        openModal({
                            type: 'alert',
                            props: {
                                title: t('error'),
                                message: t('wrong_email')
                            }
                        })
                    } else {
                        openModal({
                            type: 'input',
                            props: {
                                title: t('input_password'),
                                message: t('confirm_delete_desc_2'),
                                onConfirm: (inputValue) => {
                                    startDeleteProcess(inputValue);
                                }
                            }
                        })
                    }
                }
            }
        })
    }


    return (
        <>
            <Block>
                <div className="UI-Title">{t('delete_account')}</div>
                <div className="UI-B_CONTENT">
                    {t('d_a_p1')}
                    <p />
                    {t('d_a_p2')}
                    <p />
                    {t('d_a_p3')}
                    <p />
                    {t('d_a_p4')}
                </div>
            </Block>
            <Block className="Settings-Advanced">
                <div className="UI-Parameter">
                    {t('delete_posts')}
                    <Switch
                        checked={deletePostsWithAccount}
                        onChange={(e) => setDeletePostsWithAccount(e.target.checked)}
                    />
                </div>
            </Block>
            <Block>
                <Button
                    title={t('accept_delete')}
                    isLoading={isLoading}
                    onClick={handleDeleteAccount}
                />
            </Block>
        </>
    )
}

export default DeleteAccount;