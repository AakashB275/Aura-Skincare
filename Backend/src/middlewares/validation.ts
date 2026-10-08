import { validationResult } from 'express-validator';

/**
 * Middleware to run validations created with express-validator.
 * Usage: pass an array of validator chains in the route and then this middleware.
 */
export function validateRequest(req:Request, res:Response, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
}

export default validateRequest;
