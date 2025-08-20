import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import cors from 'cors';
import { Request, Response } from 'express';

// Rate limiting configurations
export const rateLimiters = {
  // General API rate limiter
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 900)
      });
    }
  }),

  // Strict rate limiter for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per windowMs
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    },
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Authentication rate limit exceeded',
        message: 'Too many authentication attempts from this IP, please try again later.',
        retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 900)
      });
    }
  }),

  // Rate limiter for password reset
  passwordReset: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset requests per hour
    message: {
      error: 'Too many password reset attempts, please try again later.',
      retryAfter: '1 hour'
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Password reset rate limit exceeded',
        message: 'Too many password reset attempts from this IP, please try again later.',
        retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 3600)
      });
    }
  }),

  // Rate limiter for monitoring operations
  monitoring: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // Limit each IP to 50 monitoring requests per 5 minutes
    message: {
      error: 'Too many monitoring requests, please try again later.',
      retryAfter: '5 minutes'
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Monitoring rate limit exceeded',
        message: 'Too many monitoring requests from this IP, please try again later.',
        retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 300)
      });
    }
  }),

  // Rate limiter for report generation
  reports: rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // Limit each IP to 10 report requests per 10 minutes
    message: {
      error: 'Too many report generation requests, please try again later.',
      retryAfter: '10 minutes'
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Report generation rate limit exceeded',
        message: 'Too many report generation requests from this IP, please try again later.',
        retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 600)
      });
    }
  }),

  // Rate limiter for file uploads
  upload: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 upload requests per 15 minutes
    message: {
      error: 'Too many upload requests, please try again later.',
      retryAfter: '15 minutes'
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Upload rate limit exceeded',
        message: 'Too many upload requests from this IP, please try again later.',
        retryAfter: Math.ceil(req.rateLimit?.resetTime ? (req.rateLimit.resetTime - Date.now()) / 1000 : 900)
      });
    }
  })
};

// Speed limiting (slow down) configurations
export const speedLimiters = {
  // General speed limiter
  general: slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests per 15 minutes at full speed
    delayMs: 500, // Add 500ms delay per request after delayAfter
    maxDelayMs: 20000, // Maximum delay of 20 seconds
  }),

  // Speed limiter for authentication
  auth: slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 2, // Allow 2 requests per 15 minutes at full speed
    delayMs: 1000, // Add 1 second delay per request after delayAfter
    maxDelayMs: 10000, // Maximum delay of 10 seconds
  })
};

// Helmet security configuration
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.instagram.com', 'https://graph.instagram.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  
  // Cross Origin Embedder Policy
  crossOriginEmbedderPolicy: false,
  
  // Cross Origin Resource Policy
  crossOriginResourcePolicy: {
    policy: 'cross-origin'
  },
  
  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false
  },
  
  // Frame Options
  frameguard: {
    action: 'deny'
  },
  
  // Hide Powered By
  hidePoweredBy: true,
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // IE No Open
  ieNoOpen: true,
  
  // No Sniff
  noSniff: true,
  
  // Origin Agent Cluster
  originAgentCluster: true,
  
  // Permitted Cross Domain Policies
  permittedCrossDomainPolicies: false,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'no-referrer'
  },
  
  // X-XSS-Protection
  xssFilter: true
});

// CORS configuration
export const corsConfig = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];
    
    // In production, be more restrictive
    if (process.env.NODE_ENV === 'production') {
      const productionOrigins = [
        process.env.FRONTEND_URL,
        process.env.ADMIN_URL
      ].filter(Boolean);
      
      if (productionOrigins.length > 0) {
        if (productionOrigins.includes(origin)) {
          return callback(null, true);
        } else {
          return callback(new Error('Not allowed by CORS'));
        }
      }
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-API-Key'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page',
    'X-Per-Page',
    'Link'
  ],
  maxAge: 86400 // 24 hours
});

// Security middleware for API keys
export const apiKeyAuth = (req: Request, res: Response, next: Function) => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKeys = process.env.API_KEYS?.split(',') || [];
  
  if (req.path.startsWith('/api/webhook') || req.path.startsWith('/api/public')) {
    // Check if API key is required for webhooks and public endpoints
    if (validApiKeys.length > 0 && !validApiKeys.includes(apiKey)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        message: 'A valid API key is required to access this endpoint'
      });
    }
  }
  
  next();
};

// IP whitelist middleware
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        error: 'IP not allowed',
        message: 'Your IP address is not authorized to access this resource'
      });
    }
    
    next();
  };
};

// Request size limiter
export const requestSizeLimiter = {
  // General request size limit
  general: '10mb',
  
  // File upload size limit
  upload: '50mb',
  
  // JSON payload size limit
  json: '1mb',
  
  // URL encoded payload size limit
  urlencoded: '1mb'
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: Function) => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Add API version header
  res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0');
  
  next();
};

// Request logging middleware for security monitoring
export const securityLogger = (req: Request, res: Response, next: Function) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  const method = req.method;
  const url = req.originalUrl;
  const timestamp = new Date().toISOString();
  
  // Log suspicious activities
  const suspiciousPatterns = [
    /\.\.\//, // Directory traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript injection
    /eval\(/i, // Code injection
    /exec\(/i, // Command injection
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(url) || pattern.test(JSON.stringify(req.body))
  );
  
  if (isSuspicious) {
    console.warn(`🚨 SUSPICIOUS REQUEST: ${timestamp} - ${clientIP} - ${method} ${url} - ${userAgent}`);
  }
  
  // Log failed authentication attempts
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn(`🔒 AUTH FAILURE: ${timestamp} - ${clientIP} - ${method} ${url} - ${res.statusCode} - ${duration}ms`);
    }
    
    // Log slow requests (potential DoS)
    if (duration > 5000) {
      console.warn(`🐌 SLOW REQUEST: ${timestamp} - ${clientIP} - ${method} ${url} - ${duration}ms`);
    }
  });
  
  next();
};

// Input sanitization middleware
export const inputSanitizer = (req: Request, res: Response, next: Function) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

// Helper function to sanitize objects
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeValue(key);
    sanitized[sanitizedKey] = sanitizeObject(value);
  }
  
  return sanitized;
}

// Helper function to sanitize individual values
function sanitizeValue(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Remove potentially dangerous characters and patterns
  return value
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/\0/g, '') // Remove null bytes
    .trim();
}

// Export all security configurations
export const securityConfig = {
  rateLimiters,
  speedLimiters,
  helmet: helmetConfig,
  cors: corsConfig,
  apiKeyAuth,
  ipWhitelist,
  requestSizeLimiter,
  securityHeaders,
  securityLogger,
  inputSanitizer
};

export default securityConfig;