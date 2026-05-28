import { useNavigate } from "react-router-dom";
import { useAuth } from "@/System/Hooks/useAuth";
import { Block, Button, User } from "@/UIKit";
import { useTranslation } from "react-i18next";
import { I_SETTINGS } from "@/System/UI/IconPack";
import { useModalsStore } from "@/Store/modalsStore";
import ChannelManager from "@/Components/Modals/ChannelManager";

const MyChannels = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { openModal } = useModalsStore();
  const { accountData } = useAuth();

  const createChannel = () => {
    openModal({
      type: "window",
      props: {
        title: t("create_channel"),
        childrenClassName: "MultiForm",
        children: <ChannelManager />,
      },
    });
  };

  const editChannel = (channel) => {
    openModal({
      type: "window",
      props: {
        title: t("edit_channel"),
        childrenClassName: "MultiForm",
        children: <ChannelManager channel={channel} isEdit />,
      },
    });
  };

  const goToChannel = (channel) => {
    navigate(`/e/${channel.username}`);
  };

  return (
    <Block className="UI-Channels">
      <div className="UI-Title">{t("my_channels")}</div>
      {accountData?.channels?.length > 0 &&
        accountData.channels.map((channel) => (
          <div className="Channel">
            <User user={channel} onClick={() => goToChannel(channel)} />
            <Button
              onClick={() => {
                editChannel(channel);
              }}
              className="Settings"
            >
              <I_SETTINGS />
            </Button>
          </div>
        ))}
      <Button
        buttonStyle="action"
        onClick={createChannel}
        style={{ marginTop: 10 }}
      >
        {t("create")}
      </Button>
    </Block>
  );
};

export default MyChannels;
