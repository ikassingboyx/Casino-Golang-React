// Where to go after logging in. Social login leaves the app and comes back
// to /auth/callback, so the page the user wanted is kept in sessionStorage.
const KEY = 'casino-return-path'

export function rememberReturnPath(path: string) {
  try {
    if (path !== '/' && path !== '/lobby') sessionStorage.setItem(KEY, path)
  } catch {
    // Storage unavailable: the user lands in the lobby instead.
  }
}

export function takeReturnPath(): string | null {
  try {
    const path = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return path?.startsWith('/') && !path.startsWith('//') ? path : null
  } catch {
    return null
  }
}
