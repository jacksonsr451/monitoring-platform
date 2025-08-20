import jwt from 'jsonwebtoken';
import User from '../models/User';

// Estender a interface Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Interface para o payload do JWT
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

// Middleware de autenticação
export const authenticate = async (req: any, res: any, next: any) => {
  try {
    // Extrair token do header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de acesso não fornecido'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verificar e decodificar o token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as JWTPayload;

    // Buscar usuário no banco de dados
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        error: 'Usuário não encontrado'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: 'Conta desativada'
      });
    }

    // Adicionar usuário ao request
    req.user = user;
    next();
  } catch (error: any) {
    console.error('Erro na autenticação:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado'
      });
    }
    
    return res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

// Middleware de autorização por role
export const authorize = (...roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuário não autenticado'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acesso negado. Permissões insuficientes'
      });
    }

    next();
  };
};

// Middleware opcional de autenticação (não falha se não houver token)
export const optionalAuth = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continua sem usuário
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as JWTPayload;

    const user = await User.findById(decoded.userId);
    
    if (user && user.isActive) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Em caso de erro, continua sem usuário
    next();
  }
};

// Middleware para verificar se é o próprio usuário ou admin
export const authorizeOwnerOrAdmin = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Usuário não autenticado'
    });
  }

  const targetUserId = req.params.userId || req.params.id;
  const isOwner = req.user._id.toString() === targetUserId;
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({
      error: 'Acesso negado. Você só pode acessar seus próprios dados'
    });
  }

  next();
};

// Middleware para exigir role de admin
export const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Usuário não autenticado'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso negado. Apenas administradores podem acessar este recurso'
    });
  }

  next();
};