import { createSelector } from '@reduxjs/toolkit';

const selectProfileInfo = (state, username) => state.profiles.byUsername[username] || null;
const selectByTypeBranch = (state) => state.profiles.byType;

export const selectProfileIdAndType = createSelector(
  [selectProfileInfo],
  (profileInfo) => {
    if (!profileInfo) {
      return { id: null, type: null };
    }
    return { id: profileInfo.id, type: profileInfo.type };
  }
);

export const selectProfileByUsername = createSelector(
  [
    (state, username) => state.profiles.byUsername[username] || null,
    (state) => state.profiles.byType
  ],
  (profileInfo, byType) => {
    if (!profileInfo) return null;
    const { id, type } = profileInfo;
    return byType[type]?.byId[id] || null;
  }
);

export const selectProfileSectionMeta = createSelector(
  [
    selectProfileInfo,
    selectByTypeBranch,
    (_: any, __: string, section: any) => section
  ],
  (profileInfo, byType, section): any | null => {
    if (!profileInfo) return null;

    const { id, type } = profileInfo;

    const sectionMeta = byType[type]?.meta?.[id]?.[section];

    if (!sectionMeta) {
      return {
        loaded: false,
        loading: false,
        allLoaded: false,
        start_index: 0,
        lastFetched: 0
      };
    }

    return {
      loaded: sectionMeta.loaded ?? false,
      loading: sectionMeta.loading ?? false,
      allLoaded: sectionMeta.allLoaded ?? false,
      start_index: sectionMeta.start_index ?? 0,
      lastFetched: sectionMeta.lastFetched ?? 0
    };
  }
);

export const makeSelectProfileSectionPosts = () =>
  createSelector(
    [
      (state) => state.profiles.byType,
      (state) => state.posts.byId,
      (_, profileType: 0 | 1) => profileType,
      (_, __, profileId: string) => profileId,
      (_, __, ___, section: 'posts' | 'wall' | 'archive' | 'trash_bin') => section
    ],
    (byType, postsById, profileType, profileId, section) => {
      const typeState = byType?.[profileType];
      if (!typeState) return [];

      const ids = typeState[section]?.[profileId];
      if (!ids) return [];

      return ids
        .map(id => postsById[id])
        .filter(Boolean)
        .sort((a, b) => new Date(b.create_date).getTime() - new Date(a.create_date).getTime()); // сортировка
    }
  );