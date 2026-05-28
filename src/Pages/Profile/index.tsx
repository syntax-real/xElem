import { useState, useEffect, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { TopBar } from "../../Components/Navigate";
import ErrorPage from "../ErrorPage";
import { useTranslation } from "react-i18next";
import { useWebSocket } from "../../System/Context/WebSocket";
import Header from "./components/Header";
import Info from "./components/Info";
import Posts from "./components/Posts";
import Wall from "./components/Wall";
import { useDispatch, useSelector } from "react-redux";
import { setProfile } from "../../Store/slices/profiles";
import {
  selectProfileByUsername,
  selectProfileSectionMeta,
} from "../../Store/selectors/profilesSelectors";
import Gifts from "./components/Gifts";
import { Tabs } from "../../UIKit";
import "./Profile.scss";
import useSettingsStore from "../../Store/settingsStore";
import { useAuth } from "../../System/Hooks/useAuth";
import Archive from "./components/Archive";
import TrashBin from "./components/TrashBin";

const Profile = () => {
  const { hideProfileAnimation } = useSettingsStore();
  const { wsClient } = useWebSocket();
  const { t } = useTranslation();
  const { accountData } = useAuth();
  const params = useParams();
  const dispatch = useDispatch();
  const username: string | undefined = params.username;
  const postsRef = useRef<HTMLDivElement>(null);
  const selectProfileData = useMemo(
    () => (state) => selectProfileByUsername(state, username),
    [username],
  );
  const profileData = useSelector(selectProfileData);
  const profileMeta: any = useSelector((state) =>
    selectProfileSectionMeta(state, username, "profile"),
  );
  const isProfileLoaded = profileMeta?.loaded ?? false;

  const [profileHidden, setProfileHidden] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState(0);

  const [profileError, setProfileError] = useState<boolean>(false);

  const loadProfile = (username) => {
    wsClient
      .send({
        type: "social",
        action: "get_profile",
        username: username,
      })
      .then((res) => {
        if (res.status === "success") {
          const uid = res.data.id;
          const type = res.data.type === "user" ? 0 : 1;

          if (uid) {
            dispatch(
              setProfile({
                type: type,
                profile: res.data,
              }),
            );
          }
          setProfileError(false);
        } else {
          setProfileError(true);
        }
      });
  };

  const updateProfile = () => {
    loadProfile(params.username);
  };

  const tabs = [
    {
      title: t("profile_posts"),
      content: (
        <Posts profileData={profileData} profileLoaded={isProfileLoaded} />
      ),
    },
    ...(profileData?.gifts_count > 0 && accountData?.id !== undefined
      ? [
          {
            title: `${t("gifts.count")} (${profileData?.gifts_count})`,
            content: <Gifts profileData={profileData} />,
          },
        ]
      : []),
    ...(accountData?.id !== undefined
      ? [
          {
            title: `${t("profile_wall")}${profileData?.wall_count > 0 ? ` (${profileData?.wall_count})` : ""}`,
            content: (
              <Wall profileData={profileData} profileLoaded={isProfileLoaded} />
            ),
          },
        ]
      : []),
    ...(accountData?.id !== undefined && profileData?.archive_posts_count > 0
      ? [
          {
            title: `${t("archive")}${profileData?.archive_posts_count > 0 ? ` (${profileData?.archive_posts_count})` : ""}`,
            content: (
              <Archive
                profileData={profileData}
                profileLoaded={isProfileLoaded}
              />
            ),
          },
        ]
      : []),
    ...(accountData?.id !== undefined && profileData?.trash_bin_posts_count > 0
      ? [
          {
            title: `${t("trash_bin")}${profileData?.trash_bin_posts_count > 0 ? ` (${profileData?.trash_bin_posts_count})` : ""}`,
            content: (
              <TrashBin
                profileData={profileData}
                profileLoaded={isProfileLoaded}
              />
            ),
          },
        ]
      : []),
    ...(accountData?.id !== undefined && !profileData?.deleted
      ? [
          {
            title: t("profile_info"),
            content: (
              <Info profileData={profileData} profileLoaded={isProfileLoaded} />
            ),
          },
        ]
      : []),
  ];

  useEffect(() => {
    setProfileError(false);
    loadProfile(username);
  }, [username]);

  useEffect(() => {
    if (!hideProfileAnimation) return;

    const handleScroll = () => {
      if (postsRef.current && postsRef.current.scrollTop > 250) {
        setProfileHidden(true);
      } else {
        setProfileHidden(false);
      }
    };
    const element = postsRef.current;
    if (element) {
      element.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (element) {
        element.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  return (
    <>
      <TopBar search={true} />
      <div className="Content Profile-Page">
        {profileError || (isProfileLoaded && !profileData?.id) ? (
          <ErrorPage />
        ) : (
          <>
            <Header
              profileData={profileData}
              profileLoaded={profileMeta?.loaded}
              profileHidden={profileHidden}
              updateProfile={updateProfile}
            />
            <div className="UI-C_R Profile-Posts">
              <div ref={postsRef} className="UI-ScrollView">
                <div className="Posts" style={{ marginBottom: 20 }}>
                  <Tabs
                    tabs={tabs}
                    select={setActiveTab}
                    className="UI-B_FIRST UI-Block"
                  />
                  {tabs[activeTab]?.content}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Profile;
