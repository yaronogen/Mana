import { create } from 'zustand';
import { getSetting, setSetting } from '../data/database';
import { EMPTY_PROFILE, parseProfile, type Profile } from '../domain/profile';

type ProfileState = {
  profile: Profile;
  hydrate: () => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
};

/** The user's taste profile, kept on the device only. */
export const useProfile = create<ProfileState>((set) => ({
  profile: EMPTY_PROFILE,
  hydrate: async () => {
    try {
      set({ profile: parseProfile(await getSetting('profile')) });
    } catch {
      set({ profile: EMPTY_PROFILE });
    }
  },
  saveProfile: async (profile) => {
    const clean = parseProfile(JSON.stringify(profile));
    await setSetting('profile', JSON.stringify(clean));
    set({ profile: clean });
  },
}));
