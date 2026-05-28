import { useCallback, useEffect, useState } from "react";
import { PreloadPosts } from "../../System/UI/Preload";
import { useInView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";
import Update from "@/Widgets/Update";
import { DefaultBanner } from "../../Components/Ad";
import OnlineUsers from "./Components/OnlineUsers";
import { useAuth } from "../../System/Hooks/useAuth";
import AddPost from "../../UIKit/Components/Layout/AddPost";
import { useSelector } from "react-redux";
import clsx from "clsx";
import useSettingsStore from "../../Store/settingsStore";
import { Ring } from "ldrs/react";
import { postService } from "../../Services/postService";
import CachedPost from "../../Components/CachedPost";
import {
  selectCategoryMeta,
  selectPostsForCategory,
} from "../../Store/slices/posts";
import { Block } from "../../UIKit";
import MyChannels from "@/Widgets/MyChannels";

const Home = () => {
  const { showOnlineUsers, showNewUpdate } = useSettingsStore();
  const { t } = useTranslation();
  const { isSocketAuthorized } = useAuth();
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [postsCategory, setPostsCategory] = useState<
    "last" | "rec" | "subscribe"
  >(
    (localStorage.getItem("S-PostsType") as "last" | "rec" | "subscribe") ||
      "last",
  );
  const categoryState = useSelector((state: any) =>
    selectCategoryMeta(state, postsCategory),
  );
  const { si, loaded, hasMore } = categoryState;

  const posts = useSelector((state: any) =>
    selectPostsForCategory(state, postsCategory),
  );

  const { ref: postsEndRef, inView: postsEndIsView } = useInView({
    threshold: 0,
  });

  const loadPosts = useCallback((type, startIndex: number) => {
    setIsMoreLoading(true);
    postService
      .load({ postsType: type, startIndex })
      .finally(() => setIsMoreLoading(false));
  }, []);

  useEffect(() => {
    if (!isSocketAuthorized) return;
    loadPosts(postsCategory, 0);
  }, [isSocketAuthorized, postsCategory]);

  useEffect(() => {
    if (postsEndIsView && !isMoreLoading && hasMore && isSocketAuthorized) {
      setIsMoreLoading(true);
      loadPosts(postsCategory, si);
    }
  }, [
    postsEndIsView,
    isMoreLoading,
    hasMore,
    si,
    postsCategory,
    isSocketAuthorized,
  ]);

  const onSend = () => {
    selectPostsCategory("last");
    loadPosts(postsCategory, 0);
  };

  const selectPostsCategory = (category: "last" | "rec" | "subscribe") => {
    if (postsCategory !== category) {
      setPostsCategory(category);
    }
  };

  return (
    <>
      <div className="UI-C_L">
        <div className="UI-ScrollView">
          {showOnlineUsers && <OnlineUsers />}
          <AddPost
            onSend={onSend}
            inputPlaceholder={t("post_text_input")}
            className={!showOnlineUsers ? "UI-B_FIRST" : ""}
          />
          <Block className="UI-Tabs">
            <button
              onClick={() => selectPostsCategory("last")}
              className={clsx("Tab", {
                ActiveTab: postsCategory === "last",
              })}
            >
              {t("category_last")}
            </button>

            <button
              onClick={() => selectPostsCategory("rec")}
              className={clsx("Tab", {
                ActiveTab: postsCategory === "rec",
              })}
            >
              {t("category_recommended")}
            </button>

            <button
              onClick={() => selectPostsCategory("subscribe")}
              className={clsx("Tab", {
                ActiveTab: postsCategory === "subscribe",
              })}
            >
              {t("category_subscriptions")}
            </button>
          </Block>
          <div className="Posts">
            {!loaded ? (
              <PreloadPosts />
            ) : posts.length > 0 ? (
              <>
                {posts.map((post) => (
                  <CachedPost key={`PID-${post.id}`} postId={post.id} />
                ))}
                {hasMore && !isMoreLoading && <span ref={postsEndRef} />}
                {isMoreLoading && (
                  <div className="UI-Loading">
                    <Ring
                      size="30"
                      stroke="3"
                      bgOpacity="0"
                      speed="2"
                      color="var(--TEXT_COLOR)"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="UI-ErrorMessage">{t("ups")}</div>
            )}
          </div>
        </div>
      </div>
      <div className="UI-C_R">
        <div className="UI-ScrollView">
          <Update />
          <div className={clsx({ "UI-B_FIRST": !showNewUpdate })}>
            <MyChannels />
          </div>
          <DefaultBanner />
        </div>
      </div>
    </>
  );
};

export default Home;
