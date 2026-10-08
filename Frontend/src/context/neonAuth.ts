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
