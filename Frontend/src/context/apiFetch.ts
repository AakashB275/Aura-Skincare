import { getNeonAccessToken } from './neonAuth'

export const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '')

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers)

  const token = await getNeonAccessToken()
  if (!token) {
    throw new Error('No Neon Auth access token is available. Please sign in again.')
  }
  headers.set('Authorization', `Bearer ${token}`)

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  })
}
