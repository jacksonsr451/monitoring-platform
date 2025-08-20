import mongoose from 'mongoose';

interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('Database already connected');
      return;
    }

    try {
      const config = this.getConfig();
      
      await mongoose.connect(config.uri, config.options);
      
      this.isConnected = true;
      console.log('✅ Connected to MongoDB successfully');
      
      // Set up connection event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('✅ Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      if (!this.isConnected) {
        return {
          status: 'disconnected',
          details: { readyState: mongoose.connection.readyState }
        };
      }

      // Test the connection with a simple operation
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        details: {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          name: mongoose.connection.name
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private getConfig(): DatabaseConfig {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/monitoring-platform';
    
    const options: mongoose.ConnectOptions = {
      // Connection options
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
      
      // Retry options
      retryWrites: true,
      retryReads: true,
      
      // Compression
      compressors: ['zlib'],
      
      // Authentication (if needed)
      // authSource: 'admin',
      
      // SSL/TLS (for production)
      // ssl: process.env.NODE_ENV === 'production',
      // sslValidate: process.env.NODE_ENV === 'production',
    };

    return {
      uri: mongoUri,
      options
    };
  }

  private setupEventListeners(): void {
    const connection = mongoose.connection;

    connection.on('connected', () => {
      console.log('🔗 Mongoose connected to MongoDB');
    });

    connection.on('error', (error) => {
      console.error('❌ Mongoose connection error:', error);
    });

    connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    connection.on('reconnected', () => {
      console.log('🔄 Mongoose reconnected to MongoDB');
      this.isConnected = true;
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT. Gracefully shutting down...');
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM. Gracefully shutting down...');
      await this.disconnect();
      process.exit(0);
    });
  }

  // Database utilities
  public async createIndexes(): Promise<void> {
    try {
      console.log('📊 Creating database indexes...');
      
      // User indexes
      await mongoose.connection.collection('users').createIndex({ email: 1 }, { unique: true });
      await mongoose.connection.collection('users').createIndex({ createdAt: 1 });
      
      // Project indexes
      await mongoose.connection.collection('projects').createIndex({ owner: 1 });
      await mongoose.connection.collection('projects').createIndex({ collaborators: 1 });
      await mongoose.connection.collection('projects').createIndex({ status: 1 });
      await mongoose.connection.collection('projects').createIndex({ createdAt: 1 });
      await mongoose.connection.collection('projects').createIndex({ keywords: 1 });
      await mongoose.connection.collection('projects').createIndex({ hashtags: 1 });
      
      // MonitoringData indexes
      await mongoose.connection.collection('monitoringdatas').createIndex({ project: 1 });
      await mongoose.connection.collection('monitoringdatas').createIndex({ source: 1 });
      await mongoose.connection.collection('monitoringdatas').createIndex({ contentType: 1 });
      await mongoose.connection.collection('monitoringdatas').createIndex({ 'metadata.publishedAt': -1 });
      await mongoose.connection.collection('monitoringdatas').createIndex({ 'sentiment.label': 1 });
      await mongoose.connection.collection('monitoringdatas').createIndex({ matchedKeywords: 1 });
      await mongoose.connection.collection('monitoringdatas').createIndex({ matchedHashtags: 1 });
      await mongoose.connection.collection('monitoringdatas').createIndex({ 'author.username': 1 });
      await mongoose.connection.collection('monitoringdatas').createIndex({ createdAt: 1 });
      
      // Compound indexes for common queries
      await mongoose.connection.collection('monitoringdatas').createIndex({ 
        project: 1, 
        source: 1, 
        'metadata.publishedAt': -1 
      });
      await mongoose.connection.collection('monitoringdatas').createIndex({ 
        project: 1, 
        'sentiment.label': 1, 
        'metadata.publishedAt': -1 
      });
      
      // InstagramProfile indexes
      await mongoose.connection.collection('instagramprofiles').createIndex({ username: 1 }, { unique: true });
      await mongoose.connection.collection('instagramprofiles').createIndex({ projects: 1 });
      await mongoose.connection.collection('instagramprofiles').createIndex({ 'interactions.totalLikes': -1 });
      await mongoose.connection.collection('instagramprofiles').createIndex({ 'interactions.totalComments': -1 });
      await mongoose.connection.collection('instagramprofiles').createIndex({ followersCount: -1 });
      await mongoose.connection.collection('instagramprofiles').createIndex({ engagementRate: -1 });
      await mongoose.connection.collection('instagramprofiles').createIndex({ lastUpdated: 1 });
      
      // Text indexes for search
      await mongoose.connection.collection('monitoringdatas').createIndex({ 
        text: 'text',
        'metadata.title': 'text'
      });
      await mongoose.connection.collection('projects').createIndex({ 
        name: 'text',
        description: 'text'
      });
      
      console.log('✅ Database indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating database indexes:', error);
      throw error;
    }
  }

  public async dropDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot drop database in production environment');
    }
    
    try {
      await mongoose.connection.dropDatabase();
      console.log('🗑️ Database dropped successfully');
    } catch (error) {
      console.error('❌ Error dropping database:', error);
      throw error;
    }
  }

  public async getStats(): Promise<any> {
    try {
      const stats = await mongoose.connection.db.stats();
      return {
        database: stats.db,
        collections: stats.collections,
        objects: stats.objects,
        avgObjSize: stats.avgObjSize,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize
      };
    } catch (error) {
      console.error('❌ Error getting database stats:', error);
      throw error;
    }
  }

  // Backup utilities
  public async createBackup(backupName?: string): Promise<string> {
    if (!backupName) {
      backupName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    }
    
    try {
      // This would typically use mongodump or a similar tool
      // For now, we'll just return the backup name
      console.log(`📦 Creating backup: ${backupName}`);
      
      // In a real implementation, you would:
      // 1. Use child_process to run mongodump
      // 2. Store the backup in a secure location (S3, etc.)
      // 3. Return the backup location/identifier
      
      return backupName;
    } catch (error) {
      console.error('❌ Error creating backup:', error);
      throw error;
    }
  }

  // Migration utilities
  public async runMigrations(): Promise<void> {
    try {
      console.log('🔄 Running database migrations...');
      
      // Check if migrations collection exists
      const collections = await mongoose.connection.db.listCollections().toArray();
      const migrationsExists = collections.some(col => col.name === 'migrations');
      
      if (!migrationsExists) {
        await mongoose.connection.db.createCollection('migrations');
        console.log('📝 Created migrations collection');
      }
      
      // Here you would implement your migration logic
      // For example:
      // - Check which migrations have been run
      // - Run pending migrations
      // - Update migration status
      
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.error('❌ Error running migrations:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default Database.getInstance();

// Export connection utility functions
export const connectDB = async (): Promise<void> => {
  const db = Database.getInstance();
  await db.connect();
  await db.createIndexes();
};

export const disconnectDB = async (): Promise<void> => {
  const db = Database.getInstance();
  await db.disconnect();
};

export const getDBHealth = async (): Promise<{ status: string; details: any }> => {
  const db = Database.getInstance();
  return await db.healthCheck();
};

export const getDBStats = async (): Promise<any> => {
  const db = Database.getInstance();
  return await db.getStats();
};