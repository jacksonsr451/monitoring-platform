import dotenv from 'dotenv';
import path from 'path';
import App from './app';
import logger from './config/logger';

// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(__dirname, '..', envFile) });

// Validate required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Set default values for optional environment variables
process.env.PORT = process.env.PORT || '5000';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Initialize and start the application
const startServer = async (): Promise<void> => {
  try {
    const app = new App();
    const port = parseInt(process.env.PORT!, 10);
    
    app.listen(port);
    
    logger.info('🎯 Monitoring Platform Backend Started Successfully');
    logger.info(`📍 Port: ${port}`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
    logger.info(`🗄️  Database: ${process.env.MONGODB_URI?.replace(/\/\/.*@/, '//***:***@')}`);
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack
  });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
});

// Start the server
startServer();

// Export for testing purposes
export default startServer;