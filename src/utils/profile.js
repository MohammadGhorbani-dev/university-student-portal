export function normalizeProfile(profile) {
  return {
    ...profile,
    studentId: profile.studentId ?? profile.studentNumber ?? '',
    nationalCode: profile.nationalCode ?? profile.nationalId ?? '',
  };
}
