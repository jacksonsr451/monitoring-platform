// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to the monitoring-platform database
db = db.getSiblingDB('monitoring-platform');

// Create application user
db.createUser({
  user: 'monitoring-user',
  pwd: 'monitoring-password',
  roles: [
    {
      role: 'readWrite',
      db: 'monitoring-platform'
    }
  ]
});

// Create collections with validation
db.createCollection('websites', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'url', 'isActive'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'Website name is required and must be a string'
        },
        url: {
          bsonType: 'string',
          description: 'Website URL is required and must be a string'
        },
        isActive: {
          bsonType: 'bool',
          description: 'Active status is required and must be a boolean'
        },
        checkInterval: {
          bsonType: 'number',
          minimum: 30,
          description: 'Check interval must be at least 30 seconds'
        }
      }
    }
  }
});

db.createCollection('monitoringlogs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['websiteId', 'status', 'responseTime', 'timestamp'],
      properties: {
        websiteId: {
          bsonType: 'objectId',
          description: 'Website ID is required'
        },
        status: {
          bsonType: 'string',
          enum: ['up', 'down', 'error'],
          description: 'Status must be up, down, or error'
        },
        responseTime: {
          bsonType: 'number',
          minimum: 0,
          description: 'Response time must be a positive number'
        },
        timestamp: {
          bsonType: 'date',
          description: 'Timestamp is required'
        }
      }
    }
  }
});

db.createCollection('apikeys', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'key', 'permissions', 'isActive'],
      properties: {
        name: {
          bsonType: 'string',
          description: 'API key name is required'
        },
        key: {
          bsonType: 'string',
          description: 'API key is required'
        },
        permissions: {
          bsonType: 'array',
          items: {
            bsonType: 'string'
          },
          description: 'Permissions must be an array of strings'
        },
        isActive: {
          bsonType: 'bool',
          description: 'Active status is required'
        }
      }
    }
  }
});

db.createCollection('systemsettings', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['key', 'value'],
      properties: {
        key: {
          bsonType: 'string',
          description: 'Setting key is required'
        },
        value: {
          description: 'Setting value is required'
        }
      }
    }
  }
});

// Create indexes for better performance
db.websites.createIndex({ 'url': 1 }, { unique: true });
db.websites.createIndex({ 'isActive': 1 });
db.websites.createIndex({ 'createdAt': 1 });

db.monitoringlogs.createIndex({ 'websiteId': 1 });
db.monitoringlogs.createIndex({ 'timestamp': -1 });
db.monitoringlogs.createIndex({ 'websiteId': 1, 'timestamp': -1 });
db.monitoringlogs.createIndex({ 'status': 1 });

db.apikeys.createIndex({ 'key': 1 }, { unique: true });
db.apikeys.createIndex({ 'isActive': 1 });
db.apikeys.createIndex({ 'createdAt': 1 });

db.systemsettings.createIndex({ 'key': 1 }, { unique: true });

// Insert default system settings
db.systemsettings.insertMany([
  {
    key: 'email.enabled',
    value: false,
    description: 'Enable email notifications',
    type: 'boolean'
  },
  {
    key: 'email.smtp.host',
    value: 'smtp.gmail.com',
    description: 'SMTP server host',
    type: 'string'
  },
  {
    key: 'email.smtp.port',
    value: 587,
    description: 'SMTP server port',
    type: 'number'
  },
  {
    key: 'webhook.enabled',
    value: false,
    description: 'Enable webhook notifications',
    type: 'boolean'
  },
  {
    key: 'monitoring.defaultInterval',
    value: 300,
    description: 'Default monitoring interval in seconds',
    type: 'number'
  },
  {
    key: 'monitoring.timeout',
    value: 30,
    description: 'Request timeout in seconds',
    type: 'number'
  },
  {
    key: 'monitoring.retries',
    value: 3,
    description: 'Number of retries before marking as down',
    type: 'number'
  }
]);

print('MongoDB initialization completed successfully!');
print('Database: monitoring-platform');
print('User: monitoring-user created');
print('Collections created with validation rules');
print('Indexes created for performance optimization');
print('Default system settings inserted');