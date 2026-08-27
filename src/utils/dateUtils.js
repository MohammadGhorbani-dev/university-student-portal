export const formatSafely = (timestamp) => {
  if (!timestamp) return 'تاریخ نامشخص';
  if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('fa-IR');
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleDateString('fa-IR');
  const d = new Date(timestamp);
  return isNaN(d.getTime()) ? 'تاریخ نامشخص' : d.toLocaleDateString('fa-IR');
};
