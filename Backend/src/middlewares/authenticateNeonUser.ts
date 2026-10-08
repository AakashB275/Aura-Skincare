import { createRemoteJWKSet, errors, jwtVerify } from 'jose';
import type { RequestHandler } from 'express';

declare global {
  namespace Express {
    interface Request {
      authUserId?: string;
    }
  }
}

let configuredJwksUrl: string | undefined;
let remoteJwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getVerificationKey() {
  const authBaseUrl = process.env.NEON_AUTH_BASE_URL;
  const currentJwksUrl = process.env.NEON_AUTH_JWKS_URL;
  if (!authBaseUrl || !currentJwksUrl) {
    throw new Error('NEON_AUTH_BASE_URL and NEON_AUTH_JWKS_URL are required to verify Neon Auth tokens.');
  }

  const issuer = new URL(authBaseUrl).origin;
  if (!remoteJwks || configuredJwksUrl !== currentJwksUrl) {
    configuredJwksUrl = currentJwksUrl;
    remoteJwks = createRemoteJWKSet(new URL(currentJwksUrl));
  }

  return { key: remoteJwks, issuer };
}

export const authenticateNeonUser: RequestHandler = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication is required.' });
    return;
  }

  try {
    const { key, issuer } = getVerificationKey();
    const { payload } = await jwtVerify(token, key, { issuer, audience: issuer });
    const userId = payload.sub;

    if (typeof userId !== 'string' || !userId) {
      res.status(401).json({ success: false, error: 'The access token has no user identity.' });
      return;
    }

    req.authUserId = userId;
    next();
  } catch (error) {
    if (error instanceof errors.JOSEError) {
      console.warn('Neon access token verification failed:', error.code);
      res.status(401).json({ success: false, error: 'The access token is invalid or expired.' });
      return;
    }
    next(error);
  }
};

export default authenticateNeonUser;
