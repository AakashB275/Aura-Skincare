import jwt from 'jsonwebtoken';
import userModel from '../models/user.js';

// Cross-domain deployments send the token in the Authorization header
// (cookies with sameSite=none require HTTPS on both ends and a custom domain —
export default async function(req: Request, res : Response, next) {
  let token = req.cookies.token;

  // Authorization header takes precedence when present
  // (used by cross-origin frontend where cookies may be blocked)
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No authentication token provided. Please login first.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const user = await userModel.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found. Please login again.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid token. Please login again.'
    });
  }
}