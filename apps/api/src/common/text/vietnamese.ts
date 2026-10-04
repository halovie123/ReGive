/**
 * Removes Vietnamese tone and vowel marks and maps đ to d, so text typed
 * with or without accents (or with old and new tone placement, "hoá" vs
 * "hóa") reduces to the same letters. Lower-cases nothing; callers decide.
 */
export function stripAccents(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * The form both stored listing text and search queries are reduced to:
 * lower case, accent-free, punctuation as word breaks, single spaces. Done
 * in the API rather than with Postgres's unaccent extension, which is
 * installed into different schemas on different hosts.
 */
export function toSearchText(text: string): string {
  return stripAccents(text.normalize('NFC').toLowerCase())
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
