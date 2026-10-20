import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.utils';

// Extend Express Request to include projectKey
declare global {
  namespace Express {
    interface Request {
      projectKey?: string;
    }
  }
}

/**
 * JWT authentication middleware
 * Validates JWT tokens in the Authorization header
 */
export const jwtAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn('Missing Authorization header', {
        path: req.path,
        method: req.method,
      });
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('Invalid Authorization header format', {
        path: req.path,
        method: req.method,
      });
      res.status(401).json({ error: 'Invalid authorization format' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    try {
      const decoded = jwt.verify(token, secret) as {
        iss: string;
        sub: string;
        aud: string;
        exp: number;
        iat: number;
      };

      // Validate claims
      if (decoded.iss !== 'tiktok-integration-router') {
        logger.warn('Invalid token issuer', {
          issuer: decoded.iss,
          path: req.path,
        });
        res.status(401).json({ error: 'Invalid token issuer' });
        return;
      }

      if (decoded.aud !== 'tiktok-integration-router') {
        logger.warn('Invalid token audience', {
          audience: decoded.aud,
          path: req.path,
        });
        res.status(401).json({ error: 'Invalid token audience' });
        return;
      }

      // Attach project key to request for logging and authorization
      req.projectKey = decoded.sub;

      logger.info('Request authenticated successfully', {
        projectKey: decoded.sub,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error: any) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Token expired', {
          path: req.path,
          expiredAt: error.expiredAt,
        });
        res.status(401).json({ error: 'Token expired' });
        return;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid token', {
          path: req.path,
          message: error.message,
        });
        res.status(401).json({ error: 'Invalid token' });
        return;
      }

      throw error; // Re-throw unexpected errors
    }
  } catch (error) {
    logger.error('Unexpected error in JWT middleware', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

