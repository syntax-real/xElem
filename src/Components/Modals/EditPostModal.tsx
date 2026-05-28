import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebSocket } from '../../System/Context/WebSocket';
import { useModalsStore } from '../../Store/modalsStore';
import { useDispatch } from 'react-redux';
import { updatePost } from '../../Store/slices/posts';
import SocialInput from '../../UIKit/Components/Inputs/SocialInput';
import { Block, Button } from '../../UIKit';

interface EditPostModalProps {
    post: any;
    onClose?: () => void;
}

const EditPostModal = ({ post, onClose }: EditPostModalProps) => {
    const { t } = useTranslation();
    const { wsClient } = useWebSocket();
    const { openModal } = useModalsStore() as any;
    const dispatch = useDispatch();
    const [text, setText] = useState(post.text || '');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<any>(null);
    const loadingRef = useRef(false);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus?.(), 50);
    }, []);

    const hasChanges = text.trim() !== (post.text || '').trim();

    const handleSave = () => {
        if (!hasChanges || loadingRef.current) return;
        if (!text.trim()) return;

        loadingRef.current = true;
        setLoading(true);

        wsClient.send({
            type: 'social',
            action: 'posts/edit',
            payload: { post_id: post.id, text }
        }).then((res: any) => {
            loadingRef.current = false;
            setLoading(false);
            if (res.status === 'success') {
                dispatch(updatePost({
                    id: post.id,
                    text,
                    edited_at: new Date().toISOString()
                } as any));
                onClose?.();
            } else {
                openModal({
                    type: 'alert',
                    props: { title: t('error'), message: res.message }
                });
            }
        }).catch(() => {
            loadingRef.current = false;
            setLoading(false);
        });
    };

    return (
        <Block style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '320px' }}>
            <SocialInput
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={30000}
                placeholder={t('post_text_placeholder')}
                onEnter={handleSave}
                style={{ width: '100%' }}
            />
            <Button
                title={t('save') || 'Сохранить'}
                onClick={handleSave}
                isLoading={loading}
                className={!hasChanges || !text.trim() ? 'Disabled' : ''}
            />
        </Block>
    );
};

export default EditPostModal;
