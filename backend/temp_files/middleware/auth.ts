import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        message: 'Token de acesso requerido',
        error: 'MISSING_TOKEN'
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET não configurado');
      return res.status(500).json({ 
        message: 'Erro de configuração do servidor',
        error: 'MISSING_JWT_SECRET'
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    // Find user and attach to request
    const user = await User.findById(decoded.userId).select('+password');
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        message: 'Usuário não encontrado ou inativo',
        error: 'INVALID_USER'
      });
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Token inválido',
        error: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expirado',
        error: 'EXPIRED_TOKEN'
      });
    }

    console.error('Erro na autenticação:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: 'AUTHENTICATION_ERROR'
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Usuário não autenticado',
        error: 'NOT_AUTHENTICATED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Acesso negado. Permissões insuficientes.',
        error: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continue without user
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    const user = await User.findById(decoded.userId);
    
    if (user && user.isActive) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
};

// Generate JWT token
export const generateToken = (user: IUser): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!jwtSecret) {
    throw new Error('JWT_SECRET não configurado');
  }

  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
};