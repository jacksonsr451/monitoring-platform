import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { connectDatabase, checkDatabaseHealth } from './config/database';
import logger, { logHttpRequest, logError } from './config/logger';
import { 
  errorHandler, 
  notFoundHandler, 
  handleDatabaseErrors,
  gracefulShutdown,
  timeoutHandler
} from './middleware/errorHandler';
import { securityConfig } from './config/security';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import projectRoutes from './routes/projects';
import monitoringRoutes from './routes/monitoring';
import reportRoutes from './routes/reports';

// Import middleware
import { authenticateToken, optionalAuth } from './middleware/auth';

class App {
  public app: Application;
  private server: any;

  constructor() {
    this.app = express();
    this.initializeDatabase();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeHealthCheck();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await connectDatabase();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      process.exit(1);
    }
  }

  private initializeMiddlewares(): void {
    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);

    // Security middlewares
    this.app.use(helmet(securityConfig.helmet));
    this.app.use(cors(securityConfig.cors));
    
    // Request timeout
    this.app.use(timeoutHandler(30000)); // 30 seconds

    // Rate limiting
    this.app.use('/api/auth', securityConfig.rateLimiters.auth);
    this.app.use('/api/monitoring', securityConfig.rateLimiters.monitoring);
    this.app.use('/api/reports', securityConfig.rateLimiters.report);
    this.app.use('/api/upload', securityConfig.rateLimiters.upload);
    this.app.use('/api', securityConfig.rateLimiters.general);
    
    // Speed limiting
    this.app.use(securityConfig.speedLimiters.general);

    // Request sanitization
    this.app.use(securityConfig.inputSanitizer);

    // Body parsing
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));
    
    // Cookie parsing
    this.app.use(cookieParser());
    
    // Compression
    this.app.use(compression());

    // Logging
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined', {
        stream: {
          write: (message: string) => {
            logger.info(message.trim());
          }
        }
      }));
    }

    // Custom HTTP request logging
    this.app.use(logHttpRequest);
    
    // Security event logging
    this.app.use(securityConfig.securityLogger);

    // Static files (if needed)
    this.app.use('/uploads', express.static('uploads'));
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', authenticateToken, userRoutes);
    this.app.use('/api/projects', authenticateToken, projectRoutes);
    this.app.use('/api/monitoring', authenticateToken, monitoringRoutes);
    this.app.use('/api/reports', authenticateToken, reportRoutes);

    // Root route
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        message: 'Monitoring Platform API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // API documentation route
    this.app.get('/api', (req: Request, res: Response) => {
      res.json({
        message: 'Monitoring Platform API v1.0.0',
        endpoints: {
          auth: {
            'POST /api/auth/register': 'Register new user',
            'POST /api/auth/login': 'User login',
            'POST /api/auth/logout': 'User logout',
            'POST /api/auth/refresh': 'Refresh access token',
            'POST /api/auth/forgot-password': 'Request password reset',
            'POST /api/auth/reset-password': 'Reset password'
          },
          users: {
            'GET /api/users/profile': 'Get user profile',
            'PUT /api/users/profile': 'Update user profile',
            'DELETE /api/users/profile': 'Delete user account',
            'POST /api/users/change-password': 'Change password'
          },
          projects: {
            'GET /api/projects': 'List user projects',
            'POST /api/projects': 'Create new project',
            'GET /api/projects/:id': 'Get project details',
            'PUT /api/projects/:id': 'Update project',
            'DELETE /api/projects/:id': 'Delete project'
          },
          monitoring: {
            'GET /api/monitoring/:projectId/data': 'Get monitoring data',
            'GET /api/monitoring/:projectId/stats': 'Get monitoring statistics',
            'GET /api/monitoring/:projectId/instagram-rankings': 'Get Instagram rankings',
            'POST /api/monitoring/:projectId/start': 'Start monitoring',
            'POST /api/monitoring/:projectId/stop': 'Stop monitoring'
          },
          reports: {
            'POST /api/reports/:projectId/generate': 'Generate project report',
            'POST /api/reports/:projectId/social-media': 'Generate social media report',
            'POST /api/reports/:projectId/web-news': 'Generate web/news report',
            'POST /api/reports/:projectId/save-config': 'Save report configuration'
          }
        },
        documentation: '/api/docs',
        health: '/health'
      });
    });
  }

  private initializeHealthCheck(): void {
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        const dbHealth = await checkDatabaseHealth();
        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();

        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: `${Math.floor(uptime / 60)} minutes`,
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0',
          database: dbHealth,
          memory: {
            used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
            total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
            external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
          },
          cpu: {
            usage: process.cpuUsage()
          }
        };

        res.status(200).json(health);
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Service unavailable'
        });
      }
    });

    // Readiness probe
    this.app.get('/ready', async (req: Request, res: Response) => {
      try {
        await checkDatabaseHealth();
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Liveness probe
    this.app.get('/live', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString()
      });
    });
  }

  private initializeErrorHandling(): void {
    // Handle database errors
    handleDatabaseErrors();

    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public listen(port: number): void {
    this.server = this.app.listen(port, () => {
      logger.info(`🚀 Server running on port ${port}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API URL: http://localhost:${port}/api`);
      logger.info(`❤️  Health Check: http://localhost:${port}/health`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info(`📖 API Documentation: http://localhost:${port}/api`);
      }
    });

    // Graceful shutdown
    gracefulShutdown(this.server);
  }

  public getServer() {
    return this.server;
  }

  public getApp() {
    return this.app;
  }
}

export default App;