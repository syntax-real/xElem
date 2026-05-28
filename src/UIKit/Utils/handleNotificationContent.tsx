const LikeIcon = (
    <img className="Icon" src="/static_sys/Images/Ntf/Like.png" alt="Heart" draggable={false} />
)
const DislikeIcon = (
    <img className="Icon" src="/static_sys/Images/Ntf/Dislike.png" alt="Broken heart" draggable={false} />
)
const BubleIcon = (
    <img className="Icon" src="/static_sys/Images/Ntf/Bubble.png" alt="Bubble" draggable={false} />
)
const PlusIcon = (
    <img className="Icon" src="/static_sys/Images/Ntf/Plus.png" alt="Plus" draggable={false} />
)
const MinusIcon = (
    <img className="Icon" src="/static_sys/Images/Ntf/Minus.png" alt="Minus" draggable={false} />
)

const notificationConfig = {
    PostLike: (_, t) => ({
        title: t('notifications.like'),
        text: t('notifications.like_body'),
        icon: LikeIcon
    }),

    PostDislike: (_, t) => ({
        title: t('notifications.dislike'),
        text: t('notifications.dislike_body'),
        icon: DislikeIcon
    }),

    PostComment: (notification, t) => ({
        title: t('notifications.comment'),
        text: `${t('notifications.comment_body', {
            author_name: notification.author.name,
            text: notification.content?.comment?.text?.length > 0 ? `«${notification.content.comment.text}»` : ''
        })}`,
        icon: BubleIcon
    }),

    ReplyComment: (notification, t) => ({
        title: t('notifications.reply'),
        text: `${t('notifications.reply_body', {
            author_name: notification.author.name,
            text: notification.content?.comment?.text?.length > 0 ? `«${notification.content.comment.text}»` : ''
        })}`,
        icon: BubleIcon
    }),
    Message: (notification) => ({
        title: notification.author.name,
        text: notification.content?.message?.text,
        icon: BubleIcon
    }),

    ProfileSubscribe: (notification, t) => ({
        title: t('notifications.subscribe'),
        text: t('notifications.subscribe_body', {
            author_name: notification.author.name
        }),
        icon: PlusIcon
    }),

    ProfileUnsubscribe: (notification, t) => ({
        title: t('notifications.unsubscribe'),
        text: t('notifications.unsubscribe_body', {
            author_name: notification.author.name
        }),
        icon: MinusIcon
    }),
    ReferralRewardInviter: (notification, t) => ({
        title: t('notifications.referral_inviter'),
        text: t('notifications.referral_inviter_body', {
            amount: Number(notification.content?.amount || 0).toFixed(3)
        }),
        icon: PlusIcon
    }),
    ReferralRewardInvited: (notification, t) => ({
        title: t('notifications.referral_invited'),
        text: t('notifications.referral_invited_body', {
            amount: Number(notification.content?.amount || 0).toFixed(3)
        }),
        icon: PlusIcon
    }),
    NewPost: (notification, t) => ({
        title: t('notifications.new_post', {
            author_name: notification.content.author?.name
        }),
        text: notification?.content?.post?.text || '',
        icon: BubleIcon
    }),
    NewWallPost: (notification, t) => ({
        title: t('notifications.new_wall_post', {
            author_name: notification.content.author?.name
        }),
        text: notification?.content?.post?.text || '',
        icon: BubleIcon
    })
};

const handleNotificationContent = (notification, t) => {
    if (notification.action === 'notification' && notification.content?.subtype) {
        const handler = notificationConfig[notification.content.subtype];
        if (handler) return handler(notification, t);
    }

    const handler = notificationConfig[notification.action];
    if (handler) return handler(notification, t);

    return {
        title: t('notifications.unknown'),
        body: notification.content?.message || '',
        icon: null
    };
};

export default handleNotificationContent;
