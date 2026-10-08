import { authClient } from './neonAuth'

export const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL ?? '')

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers)

  const { data, error } = await authClient.token()
  if (error) {
    throw new Error(`Could not retrieve the Neon Auth access token: ${error.message}`)
  }
  if (!data?.token) {
    throw new Error('No Neon Auth access token is available. Please sign in again.')
  }
  headers.set('Authorization', `Bearer ${data.token}`)

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  })
}
