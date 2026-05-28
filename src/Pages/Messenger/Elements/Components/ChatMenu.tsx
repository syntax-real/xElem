import { useTranslation } from 'react-i18next';
import { Avatar, BoxButtons, Cover, MaterialTabs, NavigatedHeader, SavesAvatar } from '../../../../UIKit';
import { useSelector } from 'react-redux';
import { useAuth } from '../../../../System/Hooks/useAuth';
import { I_USERNAME } from '../../../../System/UI/IconPack';
import Invitations from './Invitations';
import GroupMembers from './GroupMembers';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import { HandleUserIcons } from '../../../../System/Elements/Handlers';

const ChatMenu = ({ closeChatMenu }) => {
    const { accountData } = useAuth();
    const { t } = useTranslation();
    const scrollRef = useRef(null);
    const navigate = useNavigate();
    const selectedChat = useSelector((state: any) => state.messenger.selectedChat)

    const boxButtons = selectedChat.type === 0 ? [
        {
            icon: <I_USERNAME />,
            title: t('go_to_profile'),
            onClick: () => {
                navigate(`/e/${selectedChat.user_data.username}`)
            }
        }
    ] : [];

    const tabs = selectedChat.type === 1 ? [
        {
            title: t('members'),
            content: <GroupMembers groupID={selectedChat.id} />
        },
        {
            title: t('invitations'),
            content: <Invitations />
        }
    ] : [];

    return (
        <div ref={scrollRef} className="UI-ScrollView">
            <div className="Chat-Menu">
                <NavigatedHeader
                    onBack={closeChatMenu}
                    scrollRef={scrollRef}
                />
                <div className="Profile-InfoBlock">
                    <Cover
                        cover={selectedChat.user_data.cover}
                        style={{ opacity: !selectedChat?.user_data?.cover ? '0' : '', height: !selectedChat?.user_data?.cover ? '80px' : '' }}
                    />
                    <div style={{ top: !selectedChat?.user_data?.cover ? 28 : '' }} className="AvatarContainer">
                        {
                            accountData.id === selectedChat?.user_data?.id ? (
                                <SavesAvatar
                                    size={100}
                                />
                            ) : (
                                <Avatar
                                    avatar={selectedChat.user_data.avatar}
                                    name={selectedChat.user_data.name}
                                    size={100}
                                />
                            )
                        }
                        {
                            (selectedChat?.user_data?.online) && (
                                <div className="UI-Online"></div>
                            )
                        }
                    </div>
                    <div className="UI-NameBody" style={{ marginTop: 25 }}>
                        <div className="Name">
                            {
                                accountData.id === selectedChat?.user_data?.id ? (
                                    t('chat_fav')
                                ) : (
                                    selectedChat?.user_data?.name
                                )
                            }
                        </div>
                        <HandleUserIcons icons={selectedChat?.user_data?.icons} />
                    </div>
                    {
                        selectedChat?.user_data?.username && (
                            <div className="Username">
                                @{selectedChat.user_data.username}
                            </div>
                        )
                    }
                    <BoxButtons
                        buttons={boxButtons}
                    />
                    {
                        selectedChat?.user_data?.description && (
                            <div className="UI-Description">
                                <div className="Title">{t('description')}</div>
                                <div className="Description">
                                    {selectedChat.user_data.description}
                                </div>
                            </div>
                        )
                    }
                </div>
                <MaterialTabs
                    tabs={tabs}
                />
            </div>
        </div>
    )
}

export default ChatMenu;