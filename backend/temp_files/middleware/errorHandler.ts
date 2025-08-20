import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'express-validator';
import mongoose from 'mongoose';
import logger, { logError } from '../config/logger';
import { errorResponse } from '../utils/helpers';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, true, 'RATE_LIMIT_ERROR');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 500, true, 'DATABASE_ERROR', details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: any) {
    super(`${service} service error: ${message}`, 502, true, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

// Error handler middleware
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let err = error;

  // Convert known errors to AppError
  if (!(err instanceof AppError)) {
    err = convertToAppError(err);
  }

  const appError = err as AppError;

  // Log error
  logError(appError, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Send error response
  const response = errorResponse(
    appError.code || 'INTERNAL_SERVER_ERROR',
    appError.message
  );

  // Add details in development mode
  if (process.env.NODE_ENV === 'development') {
    (response as any).stack = appError.stack;
    (response as any).details = appError.details;
  }

  res.status(appError.statusCode).json(response);
};

// Convert various error types to AppError
const convertToAppError = (error: Error): AppError => {
  // Mongoose validation error
  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));
    return new ValidationError('Validation failed', errors);
  }

  // Mongoose duplicate key error
  if ((error as any).code === 11000) {
    const field = Object.keys((error as any).keyValue)[0];
    return new ConflictError(`${field} already exists`);
  }

  // Mongoose cast error (invalid ObjectId)
  if (error instanceof mongoose.Error.CastError) {
    return new ValidationError(`Invalid ${error.path}: ${error.value}`);
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }

  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }

  // Multer errors (file upload)
  if (error.name === 'MulterError') {
    const multerError = error as any;
    switch (multerError.code) {
      case 'LIMIT_FILE_SIZE':
        return new ValidationError('File too large');
      case 'LIMIT_FILE_COUNT':
        return new ValidationError('Too many files');
      case 'LIMIT_UNEXPECTED_FILE':
        return new ValidationError('Unexpected file field');
      default:
        return new ValidationError('File upload error');
    }
  }

  // Express validator errors
  if (error.name === 'ValidationError' && (error as any).array) {
    const validationErrors = (error as any).array();
    return new ValidationError('Validation failed', validationErrors);
  }

  // Default to internal server error
  return new AppError(
    process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message,
    500,
    false
  );
};

// Async error wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

// Validation error handler for express-validator
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map((error: ValidationError) => ({
      field: error.param || error.type,
      message: error.msg,
      value: error.value
    }));
    
    const error = new ValidationError('Validation failed', validationErrors);
    return next(error);
  }
  
  next();
};

// Database connection error handler
export const handleDatabaseErrors = () => {
  // Handle MongoDB connection errors
  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error:', error);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise
    });
    
    // Close server gracefully
    process.exit(1);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', {
      message: error.message,
      stack: error.stack
    });
    
    // Close server gracefully
    process.exit(1);
  });
};

// Rate limit error handler
export const handleRateLimitError = (req: Request, res: Response) => {
  const error = new RateLimitError('Too many requests, please try again later');
  
  logError(error, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  const response = errorResponse(
    error.code || 'RATE_LIMIT_ERROR',
    error.message
  );
  
  res.status(error.statusCode).json(response);
};

// CORS error handler
export const handleCorsError = (req: Request, res: Response) => {
  const error = new AuthorizationError('CORS policy violation');
  
  logError(error, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    origin: req.get('Origin'),
    userAgent: req.get('User-Agent')
  });
  
  const response = errorResponse(
    error.code || 'CORS_ERROR',
    error.message
  );
  
  res.status(error.statusCode).json(response);
};

// Request timeout handler
export const timeoutHandler = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      const error = new AppError('Request timeout', 408, true, 'REQUEST_TIMEOUT');
      next(error);
    }, timeout);
    
    res.on('finish', () => {
      clearTimeout(timer);
    });
    
    res.on('close', () => {
      clearTimeout(timer);
    });
    
    next();
  };
};

// Health check error handler
export const healthCheckErrorHandler = (error: Error) => {
  logger.error('Health check failed:', {
    message: error.message,
    stack: error.stack
  });
  
  return {
    status: 'unhealthy',
    error: error.message,
    timestamp: new Date().toISOString()
  };
};

// Graceful shutdown handler
export const gracefulShutdown = (server: any) => {
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    
    server.close(() => {
      logger.info('HTTP server closed');
      
      // Close database connection
      mongoose.connection.close(false, () => {
        logger.info('MongoDB connection closed');
        process.exit(0);
      });
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// Error monitoring and alerting
export const monitorErrors = () => {
  const errorCounts = new Map<string, number>();
  const errorThreshold = 10; // Alert after 10 errors of the same type
  const timeWindow = 5 * 60 * 1000; // 5 minutes
  
  return (error: AppError, req: Request) => {
    const errorKey = `${error.code}_${error.statusCode}`;
    const currentCount = errorCounts.get(errorKey) || 0;
    
    errorCounts.set(errorKey, currentCount + 1);
    
    // Clear count after time window
    setTimeout(() => {
      errorCounts.delete(errorKey);
    }, timeWindow);
    
    // Send alert if threshold exceeded
    if (currentCount >= errorThreshold) {
      logger.error('Error threshold exceeded', {
        errorType: error.code,
        statusCode: error.statusCode,
        count: currentCount,
        url: req.originalUrl,
        method: req.method
      });
      
      // Here you could integrate with alerting services like:
      // - Slack notifications
      // - Email alerts
      // - SMS alerts
      // - PagerDuty
      // - Sentry
    }
  };
};

// Export error monitoring instance
export const errorMonitor = monitorErrors();

// Export all error classes and handlers
export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  handleValidationErrors,
  handleDatabaseErrors,
  handleRateLimitError,
  handleCorsError,
  timeoutHandler,
  healthCheckErrorHandler,
  gracefulShutdown,
  errorMonitor
};