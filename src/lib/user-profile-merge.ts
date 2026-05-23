interface DuplicatePhoneProfile {
  authUserId: string | null;
  role: string | null;
}

export function canMergeDuplicatePhoneProfile(profile: DuplicatePhoneProfile) {
  return !profile.authUserId && profile.role === "partner";
}
