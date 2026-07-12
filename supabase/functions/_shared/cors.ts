// HE-SYSTEM shared Edge Function helper: CORS
//
// AUDIT FIX (found live, 2026-07-13): every publicly-invoked edge function
// (called via `supabase.functions.invoke(...)` from the browser) needs to
// answer the browser's CORS preflight `OPTIONS` request AND include CORS
// headers on its actual response — without both, the browser's fetch never
// even reaches the function's real logic and fails with a generic "Failed to
// send a request to the Edge Function" error. This was caught by actually
// clicking through the Add Student form in the browser, not just by reading
// the code or checking that the build compiled — auth-register had the exact
// same latent bug (the Register button was never actually click-tested).
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Call first in every Deno.serve handler: returns a response for OPTIONS
 * preflight requests, or null if the request should proceed normally. */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}
