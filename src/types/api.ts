/**
 * Most JSON error responses from this app's API routes.
 * Prefer reading via {@link getErrorMessageFromResponse} when `!res.ok`.
 */
export type ApiErrorBody = { error?: string; message?: string }
