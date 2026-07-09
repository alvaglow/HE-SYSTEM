// HE-SYSTEM shared Edge Function helper: durability primitives
//
// PILOT-LAUNCH HARDENING: today's launch checklist calls for real secrets
// (Stripe, Resend, Firebase, Twilio, ZaloPay, MoMo, VNPay, Zalo OA) that
// won't all be set on day one. Without this file, a missing secret meant a
// function would either throw an unhandled exception (bare 500, no useful
// message) or — worse — silently no-op (e.g. notify-send's FCM/SMS/email
// branches already skip quietly if a token is missing, which is fine for
// "channel not configured" but not for "gateway not configured, payment
// silently did nothing"). These helpers make "not configured" a first-class,
// visible outcome instead of a crash or a silent no-op.
//
// Import with: import { requireSecrets, fetchWithTimeout, retry } from '../_shared/resilience.ts'

export class ConfigError extends Error {
  missing: string[]
  constructor(missing: string[]) {
    super(`Service not configured: missing ${missing.join(', ')}`)
    this.missing = missing
  }
}

export class ValidationError extends Error {
  fields: string[]
  constructor(message: string, fields: string[] = []) {
    super(message)
    this.fields = fields
  }
}

/** Checks that every named env var is present and non-empty. Throws
 * ConfigError (caught by the caller and turned into a 503) if any are
 * missing, so a function fails loudly and specifically instead of throwing
 * `Cannot read properties of undefined` deep inside a gateway call. */
export function requireSecrets(names: string[]): void {
  const missing = names.filter((n) => !Deno.env.get(n))
  if (missing.length > 0) throw new ConfigError(missing)
}

/** Standard response shape for a function that can't run because a secret
 * is missing. 503 (not 500) — this is an environment/config problem, not a
 * bug, and it's meaningful for a client to distinguish "retry later" from
 * "this request is broken." */
export function configErrorResponse(err: ConfigError): Response {
  return new Response(
    JSON.stringify({ error: 'Service not configured', missing: err.missing }),
    { status: 503, headers: { 'Content-Type': 'application/json' } },
  )
}

export function validationErrorResponse(err: ValidationError): Response {
  return new Response(
    JSON.stringify({ error: err.message, fields: err.fields }),
    { status: 400, headers: { 'Content-Type': 'application/json' } },
  )
}

/** Throws ValidationError listing every missing/empty field, so callers get
 * one descriptive 400 instead of a generic crash on the first undefined
 * access. Pass the parsed body and the list of required top-level keys. */
export function requireFields(body: Record<string, unknown>, fields: string[]): void {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '')
  if (missing.length > 0) {
    throw new ValidationError(`Missing required field(s): ${missing.join(', ')}`, missing)
  }
}

/** Wraps `fetch` with an AbortController-based timeout (default 10s) so a
 * slow/hanging gateway or DB call can't tie up the edge function's own
 * execution budget indefinitely. Rejects with a plain Error on timeout so
 * callers can catch it alongside real network errors. */
export async function fetchWithTimeout(input: string | URL, init: RequestInit = {}, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${typeof input === 'string' ? input : input.toString()}`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/** Retries an idempotent async operation up to `attempts` times with a short
 * fixed backoff. Intended for genuinely idempotent calls only (e.g. sending
 * an email through Resend, or a read-only status query) — never wrap a
 * non-idempotent write (like a raw payment "create") in this without an
 * idempotency key, since a retried write could double-submit. Every
 * payment-* function's 'create' action already uses `idempotency_key` +
 * an `existing` short-circuit for exactly this reason, so retrying those is
 * safe too. */
export async function retry<T>(fn: () => Promise<T>, attempts = 2, delayMs = 300): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs * (i + 1)))
    }
  }
  throw lastErr
}

/** True if a caught error is a ConfigError (missing secrets). Lets callers
 * write a single `catch` block that dispatches to the right response shape:
 *   catch (err) {
 *     if (isConfigError(err)) return configErrorResponse(err)
 *     if (isValidationError(err)) return validationErrorResponse(err)
 *     ...
 *   }
 */
export function isConfigError(err: unknown): err is ConfigError {
  return err instanceof ConfigError
}
export function isValidationError(err: unknown): err is ValidationError {
  return err instanceof ValidationError
}

/** Simple circuit-breaker style guard for a Supabase DB call: races the
 * given promise against a timeout and returns a 503-friendly result instead
 * of hanging the whole function if the database is unresponsive. */
export async function withDbTimeout<T>(promise: Promise<T>, timeoutMs = 10000): Promise<T> {
  let timer: number | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Database call timed out after ${timeoutMs}ms`)), timeoutMs) as unknown as number
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
