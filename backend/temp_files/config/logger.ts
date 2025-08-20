import { createLogger, format, transports, Logger } from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.colorize(),
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Custom format for file output
const fileFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.json()
);

// Create the main logger
const logger: Logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: {
    service: 'monitoring-platform-backend',
    version: process.env.API_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport for development
    new transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
    }),
    
    // File transport for all logs
    new transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // File transport for error logs only
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // File transport for access logs
    new transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 3
    })
  ]
});

// Create specialized loggers for different components
export const authLogger = logger.child({ component: 'auth' });
export const dbLogger = logger.child({ component: 'database' });
export const apiLogger = logger.child({ component: 'api' });
export const monitoringLogger = logger.child({ component: 'monitoring' });
export const securityLogger = logger.child({ component: 'security' });
export const performanceLogger = logger.child({ component: 'performance' });

// HTTP request logger middleware
export const httpLogger = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const { method, originalUrl, ip, headers } = req;
  const userAgent = headers['user-agent'] || 'Unknown';
  
  // Log request start
  logger.http('HTTP Request Started', {
    method,
    url: originalUrl,
    ip,
    userAgent,
    timestamp: new Date().toISOString()
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding: any) {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    const contentLength = res.get('content-length') || 0;
    
    // Log response
    logger.http('HTTP Request Completed', {
      method,
      url: originalUrl,
      ip,
      userAgent,
      statusCode,
      duration,
      contentLength,
      timestamp: new Date().toISOString()
    });
    
    // Log slow requests
    if (duration > 1000) {
      performanceLogger.warn('Slow HTTP Request', {
        method,
        url: originalUrl,
        duration,
        statusCode
      });
    }
    
    // Log error responses
    if (statusCode >= 400) {
      logger.warn('HTTP Error Response', {
        method,
        url: originalUrl,
        ip,
        statusCode,
        duration
      });
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Database operation logger
export const logDatabaseOperation = (operation: string, collection: string, duration: number, error?: Error) => {
  const logData = {
    operation,
    collection,
    duration,
    timestamp: new Date().toISOString()
  };
  
  if (error) {
    dbLogger.error('Database Operation Failed', {
      ...logData,
      error: error.message,
      stack: error.stack
    });
  } else {
    dbLogger.info('Database Operation Completed', logData);
    
    // Log slow database operations
    if (duration > 1000) {
      performanceLogger.warn('Slow Database Operation', logData);
    }
  }
};

// Authentication logger
export const logAuthEvent = (event: string, userId?: string, ip?: string, details?: any) => {
  authLogger.info('Authentication Event', {
    event,
    userId,
    ip,
    details,
    timestamp: new Date().toISOString()
  });
};

// Security event logger
export const logSecurityEvent = (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any) => {
  const logData = {
    event,
    severity,
    details,
    timestamp: new Date().toISOString()
  };
  
  switch (severity) {
    case 'critical':
      securityLogger.error('Critical Security Event', logData);
      break;
    case 'high':
      securityLogger.error('High Severity Security Event', logData);
      break;
    case 'medium':
      securityLogger.warn('Medium Severity Security Event', logData);
      break;
    case 'low':
    default:
      securityLogger.info('Security Event', logData);
      break;
  }
};

// Monitoring operation logger
export const logMonitoringEvent = (event: string, projectId: string, source: string, details?: any) => {
  monitoringLogger.info('Monitoring Event', {
    event,
    projectId,
    source,
    details,
    timestamp: new Date().toISOString()
  });
};

// Performance metrics logger
export const logPerformanceMetric = (metric: string, value: number, unit: string, context?: any) => {
  performanceLogger.info('Performance Metric', {
    metric,
    value,
    unit,
    context,
    timestamp: new Date().toISOString()
  });
};

// Error logger with context
export const logError = (error: Error, context?: any) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

// Business logic logger
export const logBusinessEvent = (event: string, details: any) => {
  logger.info('Business Event', {
    event,
    details,
    timestamp: new Date().toISOString()
  });
};

// System health logger
export const logSystemHealth = (component: string, status: 'healthy' | 'degraded' | 'unhealthy', metrics?: any) => {
  const logData = {
    component,
    status,
    metrics,
    timestamp: new Date().toISOString()
  };
  
  switch (status) {
    case 'unhealthy':
      logger.error('System Component Unhealthy', logData);
      break;
    case 'degraded':
      logger.warn('System Component Degraded', logData);
      break;
    case 'healthy':
    default:
      logger.info('System Component Healthy', logData);
      break;
  }
};

// Log rotation and cleanup
export const cleanupOldLogs = () => {
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  const now = Date.now();
  
  try {
    const files = fs.readdirSync(logsDir);
    
    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        logger.info('Old log file deleted', { file });
      }
    });
  } catch (error) {
    logger.error('Error cleaning up old logs', { error: (error as Error).message });
  }
};

// Schedule log cleanup (run daily)
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

// Export the main logger as default
export default logger;

// Export logger configuration for testing
export const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  logsDir,
  transports: logger.transports
};

// Graceful shutdown handler
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  logger.end();
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  logger.end();
});