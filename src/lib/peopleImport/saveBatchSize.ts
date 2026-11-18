/**
 * Rows per save request. Clerk allows 100 Backend API requests per 10 seconds
 * on a development instance and 1000 on production, and a new row makes up to
 * three (username check, student, parent). Ten rows stay under 30 requests.
 * Kept apart from saveBatch.ts so the browser can import it.
 * Source: https://clerk.com/docs/guides/how-clerk-works/system-limits
 */
export const SAVE_BATCH_SIZE = 10;
