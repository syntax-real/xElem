import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useWebSocket } from "../../System/Context/WebSocket";
import { useModalsStore } from "../../Store/modalsStore";
import {
  AvatarInput,
  Button,
  CoverInput,
  QuestionModal,
  Textarea,
  TextInput,
} from "../../UIKit";
import { I_UPLOAD_IMAGE } from "../../System/UI/IconPack";

interface ChannelManagerProps {
  channel?: any;
  isEdit?: boolean;
  updateData?: () => void;
}

const ChannelManager = ({
  channel,
  isEdit = false,
  updateData,
}: ChannelManagerProps) => {
  const { t } = useTranslation();
  const { wsClient } = useWebSocket();
  const { openModal } = useModalsStore() as any;
  const [isLoading, setIsLoading] = useState(false);
  const [cover, setCover] = useState<any>(null);
  const [avatar, setAvatar] = useState<any>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [username, setUsername] = useState(isEdit ? channel?.username : "");
  const [name, setName] = useState(isEdit ? channel?.name : "");
  const [description, setDescription] = useState(
    isEdit ? channel?.description : "",
  );

  const [avatarIsUploading, setAvatarIsUploading] = useState<boolean>(false);
  const [coverIsUploading, setCoverIsUploading] = useState<boolean>(false);

  const create = async () => {
    setIsLoading(true);

    let data: any = {
      type: "social",
      action: "channels/create",
      payload: {
        name: name,
        username: username,
      },
    };

    if (cover) {
      data.payload.cover = new Uint8Array(await cover.arrayBuffer());
    }
    if (avatar) {
      data.payload.avatar = new Uint8Array(await avatar.arrayBuffer());
    }
    if (description) {
      data.payload.description = description;
    }

    wsClient.send(data).then((res) => {
      setIsLoading(false);

      if (res.status === "success") {
        openModal({
          type: "alert",
          props: {
            title: t("success"),
            message: "Канал создан",
          },
        });
      } else if (res.status === "error") {
        openModal({
          type: "alert",
          props: {
            title: t("error"),
            message: res.message,
          },
        });
      }
    });
  };

  const showError = (res) => {
    openModal({
      type: "alert",
      props: {
        title: t("error"),
        message: res.message,
      },
    });
  };

  const handleChangeFile = async (
    type: any,
    e: React.ChangeEvent<HTMLInputElement>,
    setUploading: any,
  ) => {
    setUploading(true);
    const file = e.target.files?.[0] ?? null;

    if (!file) {
      setUploading(false);
      openModal({
        type: "alert",
        props: {
          title: t("error"),
          message: t("file_not_selected"),
        },
      });
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    wsClient
      .send({
        type: "social",
        action: `channels/change/${type}/upload`,
        payload: {
          channel_id: channel.id,
          file: new Uint8Array(arrayBuffer),
        },
      })
      .then((res) => {
        if (res.status === "success") {
          setUploading(false);
          updateData?.();
        } else {
          setUploading(false);
          showError(res);
        }
      });
  };

  const handleFile = (
    type: "avatar" | "cover",
    e: React.ChangeEvent<HTMLInputElement>,
    setUploading: (v: boolean) => void,
    setPreview: (url: string) => void,
    setFile: (file: File | null) => void,
  ) => {
    if (isEdit) {
      handleChangeFile(type, e, setUploading);
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    setPreview(url);
    setFile(file);
  };

  const handleCover = (e: React.ChangeEvent<HTMLInputElement>) =>
    handleFile("cover", e, setCoverIsUploading, setCoverPreview, setCover);

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) =>
    handleFile("avatar", e, setAvatarIsUploading, setAvatarPreview, setAvatar);

  const changeName = () => {
    wsClient
      .send({
        type: "social",
        action: "channels/change/name",
        payload: {
          channel_id: channel.id,
          name: name,
        },
      })
      .then((res) => {
        if (res.status === "success") {
          updateData?.();
        } else {
          showError(res);
        }
      });
  };

  const changeUsername = () => {
    wsClient
      .send({
        type: "social",
        action: "channels/change/username",
        payload: {
          channel_id: channel.id,
          username: username,
        },
      })
      .then((res) => {
        if (res.status === "success") {
          updateData?.();
        } else {
          showError(res);
        }
      });
  };

  const changeDescription = () => {
    wsClient
      .send({
        type: "social",
        action: "channels/change/description",
        payload: {
          channel_id: channel.id,
          description: description,
        },
      })
      .then((res) => {
        if (res.status === "success") {
          updateData?.();
        } else {
          showError(res);
        }
      });
  };

  return (
    <>
      {isEdit ? (
        <>
          <CoverInput
            cover={isEdit ? channel.cover : null}
            onChange={handleCover}
            isUploading={coverIsUploading}
          />
          <AvatarInput
            avatar={isEdit ? channel.avatar : null}
            name={isEdit ? channel.name : ""}
            onChange={handleAvatar}
            isUploading={avatarIsUploading}
          />
        </>
      ) : (
        <>
          <div className="UI-Cover">
            <input
              type="file"
              accept="image/*"
              onChange={(e: any) => {
                setCover(e.target.files[0]);
                handleCover(e);
              }}
            />
            {coverPreview ? (
              <img src={coverPreview} alt="фыр" />
            ) : (
              <I_UPLOAD_IMAGE />
            )}
          </div>
          <div className="Avatar" style={{ width: 70, height: 70 }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e: any) => {
                setAvatar(e.target.files[0]);
                handleAvatar(e);
              }}
            />
            {avatarPreview ? (
              <img src={avatarPreview} alt="фыр" />
            ) : (
              <I_UPLOAD_IMAGE />
            )}
          </div>
        </>
      )}

      <div className="Inputs">
        <div className="ChangeContainer">
          <div className="InputContainer">
            @
            <TextInput
              placeholder="уникальное_имя"
              value={username}
              maxLength={60}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          {isEdit && (
            <QuestionModal
              input={username}
              target={channel.username}
              set={setUsername}
              onApply={changeUsername}
            />
          )}
        </div>

        <div className="ChangeContainer">
          <TextInput
            placeholder="Введите название"
            value={name}
            type="text"
            maxLength={30}
            onChange={(e) => setName(e.target.value)}
          />
          {isEdit && (
            <QuestionModal
              input={name}
              target={channel.name}
              set={setName}
              onApply={changeName}
            />
          )}
        </div>

        <div className="ChangeContainer">
          <Textarea
            placeholder="Введите описание"
            value={description}
            maxLength={100}
            onChange={(e) => setDescription(e.target.value)}
          />
          {isEdit && (
            <QuestionModal
              input={description}
              target={channel.description}
              set={setDescription}
              onApply={changeDescription}
            />
          )}
        </div>
      </div>
      {!isEdit && (
        <Button
          title={t("create")}
          onClick={create}
          isLoading={isLoading}
          buttonStyle="action"
        />
      )}
    </>
  );
};

export default ChannelManager;
