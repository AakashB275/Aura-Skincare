import { createAuthClient } from '@neondatabase/auth'
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters'

const authUrl = import.meta.env.VITE_NEON_AUTH_URL

if (!authUrl) {
  throw new Error('VITE_NEON_AUTH_URL must be set to the Neon Auth base URL.')
}

export const authClient = createAuthClient(authUrl, {
  adapter: BetterAuthReactAdapter({
    fetchOptions: { credentials: 'include' },
  }),
})

export async function getNeonAccessToken(): Promise<string | null> {
  const result = await authClient.getSession()
  if (result.error) {
    throw new Error(`Could not retrieve the Neon Auth session: ${result.error.message}`)
  }

  if (!result.data?.user || !result.data.session) {
    return null
  }

  const token = result.data.session.token
  if (!token) {
    throw new Error('Neon Auth returned an active session without an API JWT. Check that this Auth branch is issuing JWTs.')
  }

  return token
}
