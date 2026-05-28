import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../System/Hooks/useAuth";
import { Block, Button } from "../../UIKit";
import { useWebSocket } from "../../System/Context/WebSocket";
import CommentComponent from "./Components/Comment";
import clsx from "clsx";
import { useModalsStore } from "../../Store/modalsStore";
import SubmitAppealModal from "../../Pages/Settings/pages/SubmitAppealModal";
import AddPost from "../../UIKit/Components/Layout/AddPost";
import { Loader } from "@/UIKit/Components/Base/Loader";

interface CommentsProps {
  postID: number;
  className?: string;
  isInModal?: boolean;
  onClose?: () => void;
}

const Comments: React.FC<CommentsProps> = ({
  postID,
  className,
  isInModal,
  onClose,
}: CommentsProps) => {
  const { t } = useTranslation();
  const { wsClient } = useWebSocket();
  const { accountData } = useAuth();
  const { openModal } = useModalsStore();
  const [commentsLoaded, setCommentsLoaded] = useState<Boolean>(false);
  const [comments, setComments] = useState<any>([]);
  const [commentReply, setCommentReply] = useState<any>(null);

  const loadComments = async () => {
    if (postID) {
      const res = await wsClient.send({
        type: "social",
        action: "comments/load",
        payload: {
          post_id: postID,
        },
      });

      return res.comments;
    }
  };

  useEffect(() => {
    console.log("commentsLoaded", commentsLoaded);
  }, [commentsLoaded]);

  const getComments = async () => {
    loadComments().then((com) => {
      setCommentsLoaded(true);
      setComments(com);
    });
  };

  useEffect(() => {
    if (commentsLoaded) {
      setCommentsLoaded(false);
    }
    getComments();
  }, [postID]);

  const handleReplyClick = (data) => {
    setCommentReply(data);
  };

  return (
    <>
      {accountData?.id ? (
        <>
          <div className={clsx("UI-PartitionName", className)}>
            {t("comments")}
          </div>
          {!accountData?.permissions?.Comments ? (
            <Block className="AddPost-Restricted">
              <div className="AddPost-RestrictedMessage">
                <div className="AddPost-RestrictedText">
                  <div className="AddPost-RestrictedTitle">
                    Написание комментариев ограничено
                  </div>
                  <div className="AddPost-RestrictedDesc">
                    У вас нет прав на создание комментариев
                  </div>
                </div>
                <Button
                  title="Подать апелляцию"
                  className="SubmitAppealButton"
                  buttonStyle="action"
                  onClick={() => {
                    openModal({
                      type: "routed",
                      props: {
                        title: "Подача апелляции",
                        children: (
                          <SubmitAppealModal restrictionType="comments" />
                        ),
                      },
                    });
                  }}
                />
              </div>
            </Block>
          ) : (
            <AddPost
              inputPlaceholder={t("comment_input")}
              canSelectChannel={false}
              isComments={true}
              commentReply={commentReply}
              setCommentReply={setCommentReply}
              postID={postID}
              onSend={getComments}
            />
          )}
          <div>
            {accountData?.id ? (
              commentsLoaded ? (
                /* comments */
                Array.isArray(comments) && comments.length > 0 ? (
                  comments.map((comment: any) => (
                    <CommentComponent
                      key={comment.id}
                      comment={comment}
                      onReplyClick={handleReplyClick}
                      onDelete={getComments}
                      isInModal={isInModal}
                      onClose={onClose}
                    />
                  ))
                ) : (
                  <div className="UI-ErrorMessage">{t("comments_none")}</div>
                )
              ) : (
                <Loader />
              )
            ) : (
              <div className="UI-ErrorMessage">
                {t("comments_account_warn")}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="UI-B_FIRST" style={{ height: "1px" }}></div>
          <div className="UI-ErrorMessage">{t("comments_account_warn")}</div>
        </>
      )}
    </>
  );
};

export default Comments;
