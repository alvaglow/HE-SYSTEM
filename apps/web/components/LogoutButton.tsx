/**
 * AUDIT FIX: only the student layout had a logout control, and even that one
 * posted to a route that didn't exist (see app/auth/signout/route.ts).
 * Shared here so every role layout gets a real, working logout link.
 */
export default function LogoutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button className="text-sm text-white/60 hover:text-white w-full text-left px-3 py-2">
        Log out
      </button>
    </form>
  )
}
