/**
 * Shared, plain (non-"use server") types/values used by
 * features/onboarding/onboarding-actions.ts, and by the Client Components
 * that drive them via useActionState.
 *
 * These must NOT live inside a "use server" file: a file with a top-level
 * 'use server' directive may only export async functions (every export
 * becomes a server reference). A plain constant or a synchronous helper
 * exported from such a file breaks the Server Actions build transform.
 */

export type ProfileActionState = { status: 'idle' } | { status: 'error'; message: string };
