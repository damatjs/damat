/**
 * Generate a timestamp string for migration filenames.
 *
 * @param date - Date to generate timestamp from
 * @returns Timestamp string in format YYYYMMDDHHMMSS
 */
export const generateTimestamp = (date: Date): string => {
  return date
    .toISOString()
    .replace(/[-:T]/g, "")
    .replace(/\..+/, "")
    .slice(0, 14);
}
