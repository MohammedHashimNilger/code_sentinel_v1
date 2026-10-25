// Maps a 0-100 health score to a color. The thresholds are deliberately
// coarse (three bands) so the color reads as a quick "fine / watch it /
// act now" signal instead of a gradient nobody can interpret precisely.
export const getScoreColor = (score) => {
  if (score === null || score === undefined) return "#9AA1AC"; // muted - no score yet
  if (score >= 80) return "#3FB97F"; // healthy
  if (score >= 50) return "#E8C547"; // medium
  return "#E5484D"; // critical
};

export const formatDate = (dateString) => new Date(dateString).toLocaleString();

// Pulls a readable message out of an axios error. The backend's error
// middleware always responds with { message }, so prefer that over
// axios's generic "Request failed with status code 500".
export const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || "Something went wrong";
