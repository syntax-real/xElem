import { NavButton } from '@/Components/Navigate';

const SettingsIcon = ({ iconBackground, children }) => {
    return (
        <div style={{ background: iconBackground }} className="Icon">
            {children}
        </div>
    );
};

const SettingsButton: React.FC<{
    btn: any;
    t: any;
    handlePartitionClick: any;
}> = ({ btn, t, handlePartitionClick }) => {
    const content = (
        <>
            <SettingsIcon iconBackground={btn.color}>{btn.icon}</SettingsIcon>
            {t(btn.label)}
        </>
    );

    if (btn.to) {
        return <NavButton to={btn.to}>{content}</NavButton>;
    }

    return (
        <button
            onClick={() =>
                handlePartitionClick({ type: btn.type, title: t(btn.label) })
            }
        >
            {content}
        </button>
    );
};

export default SettingsButton;