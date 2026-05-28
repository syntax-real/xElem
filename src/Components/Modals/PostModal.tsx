import { useEffect, useState } from "react";
import { useWebSocket } from "../../System/Context/WebSocket";
import HandlePost from "../Post";
import { PreloadPost } from "../../System/UI/Preload";
import Comments from "../Comments";
import { useTranslation } from "react-i18next";
import { Loader } from "@/UIKit/Components/Base/Loader";

interface PostModalProps {
  postID: string;
  onClose?: () => void;
}

const PostModal = ({ postID, onClose }: PostModalProps) => {
  const { t } = useTranslation();
  const { wsClient } = useWebSocket();
  const [postLoaded, setPostLoaded] = useState<boolean>(false);
  const [post, setPost] = useState<any>("");

  useEffect(() => {
    if (!postID) return;

    wsClient
      .send({
        type: "social",
        action: "load_post",
        pid: postID,
      })
      .then((res: any) => {
        if (res.status === "success") {
          const post = res.post;
          if (post?.id) {
            setPost(post);
          }
        }
        setPostLoaded(true);
      });
  }, [postID]);

  useEffect(() => {
    if (postLoaded) {
      setPostLoaded(false);
    }
  }, [postID]);

  return (
    <>
      {postLoaded && !post.id ? (
        <div className="PostModal-Error">{t("error")}</div>
      ) : (
        <>
          {postLoaded ? (
            <HandlePost post={post} isInModal={true} />
          ) : (
            <Loader />
          )}
          <div className="PostModal-Comments">
            <Comments postID={post.id} onClose={onClose} isInModal={true} />
          </div>
        </>
      )}
    </>
  );
};

export default PostModal;
