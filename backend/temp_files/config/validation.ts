import { body, param, query, ValidationChain } from 'express-validator';

// Common validation rules
export const commonValidations = {
  // MongoDB ObjectId validation
  mongoId: (field: string = 'id') => 
    param(field)
      .isMongoId()
      .withMessage(`${field} must be a valid MongoDB ObjectId`),

  // Email validation
  email: (field: string = 'email') =>
    body(field)
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),

  // Password validation
  password: (field: string = 'password') =>
    body(field)
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),

  // Name validation
  name: (field: string = 'name') =>
    body(field)
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage(`${field} must be between 2 and 100 characters`)
      .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
      .withMessage(`${field} can only contain letters and spaces`),

  // Required string validation
  requiredString: (field: string, minLength: number = 1, maxLength: number = 500) =>
    body(field)
      .trim()
      .isLength({ min: minLength, max: maxLength })
      .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`),

  // Optional string validation
  optionalString: (field: string, maxLength: number = 500) =>
    body(field)
      .optional()
      .trim()
      .isLength({ max: maxLength })
      .withMessage(`${field} must not exceed ${maxLength} characters`),

  // Array validation
  arrayField: (field: string, minItems: number = 0, maxItems: number = 100) =>
    body(field)
      .optional()
      .isArray({ min: minItems, max: maxItems })
      .withMessage(`${field} must be an array with ${minItems} to ${maxItems} items`),

  // Boolean validation
  boolean: (field: string) =>
    body(field)
      .optional()
      .isBoolean()
      .withMessage(`${field} must be a boolean value`),

  // Number validation
  number: (field: string, min?: number, max?: number) => {
    let validation = body(field).isNumeric().withMessage(`${field} must be a number`);
    if (min !== undefined) {
      validation = validation.custom(value => {
        if (parseFloat(value) < min) {
          throw new Error(`${field} must be at least ${min}`);
        }
        return true;
      });
    }
    if (max !== undefined) {
      validation = validation.custom(value => {
        if (parseFloat(value) > max) {
          throw new Error(`${field} must not exceed ${max}`);
        }
        return true;
      });
    }
    return validation;
  },

  // Date validation
  date: (field: string) =>
    body(field)
      .optional()
      .isISO8601()
      .withMessage(`${field} must be a valid ISO 8601 date`),

  // URL validation
  url: (field: string) =>
    body(field)
      .optional()
      .isURL()
      .withMessage(`${field} must be a valid URL`),

  // Enum validation
  enum: (field: string, allowedValues: string[]) =>
    body(field)
      .isIn(allowedValues)
      .withMessage(`${field} must be one of: ${allowedValues.join(', ')}`),

  // Pagination validation
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sort')
      .optional()
      .isString()
      .withMessage('Sort must be a string'),
    query('order')
      .optional()
      .isIn(['asc', 'desc', '1', '-1'])
      .withMessage('Order must be asc, desc, 1, or -1')
  ]
};

// User validation rules
export const userValidations = {
  register: [
    commonValidations.name('name'),
    commonValidations.email('email'),
    commonValidations.password('password'),
    body('role')
      .optional()
      .isIn(['admin', 'user'])
      .withMessage('Role must be either admin or user')
  ],

  login: [
    commonValidations.email('email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  updateProfile: [
    commonValidations.optionalString('name', 100),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address')
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    commonValidations.password('newPassword')
  ]
};

// Project validation rules
export const projectValidations = {
  create: [
    commonValidations.requiredString('name', 2, 100),
    commonValidations.optionalString('description', 1000),
    body('keywords')
      .isArray({ min: 1, max: 50 })
      .withMessage('Keywords must be an array with 1 to 50 items')
      .custom((keywords: string[]) => {
        if (!keywords.every(keyword => typeof keyword === 'string' && keyword.trim().length > 0)) {
          throw new Error('All keywords must be non-empty strings');
        }
        return true;
      }),
    body('hashtags')
      .optional()
      .isArray({ max: 50 })
      .withMessage('Hashtags must be an array with maximum 50 items')
      .custom((hashtags: string[]) => {
        if (hashtags && !hashtags.every(hashtag => typeof hashtag === 'string' && hashtag.trim().length > 0)) {
          throw new Error('All hashtags must be non-empty strings');
        }
        return true;
      }),
    body('collaborators')
      .optional()
      .isArray({ max: 20 })
      .withMessage('Collaborators must be an array with maximum 20 items')
      .custom((collaborators: string[]) => {
        if (collaborators && !collaborators.every(id => typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/))) {
          throw new Error('All collaborator IDs must be valid MongoDB ObjectIds');
        }
        return true;
      }),
    body('sources')
      .optional()
      .isObject()
      .withMessage('Sources must be an object'),
    body('sources.instagram')
      .optional()
      .isBoolean()
      .withMessage('Instagram source must be a boolean'),
    body('sources.websites')
      .optional()
      .isBoolean()
      .withMessage('Websites source must be a boolean'),
    body('sources.news')
      .optional()
      .isBoolean()
      .withMessage('News source must be a boolean'),
    body('sources.blogs')
      .optional()
      .isBoolean()
      .withMessage('Blogs source must be a boolean'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object'),
    body('settings.monitoringFrequency')
      .optional()
      .isIn(['realtime', 'hourly', 'daily', 'weekly'])
      .withMessage('Monitoring frequency must be realtime, hourly, daily, or weekly'),
    body('settings.sentimentAnalysis')
      .optional()
      .isBoolean()
      .withMessage('Sentiment analysis must be a boolean'),
    body('settings.realtimeAlerts')
      .optional()
      .isBoolean()
      .withMessage('Realtime alerts must be a boolean'),
    body('settings.maxResults')
      .optional()
      .isInt({ min: 10, max: 10000 })
      .withMessage('Max results must be between 10 and 10000')
  ],

  update: [
    commonValidations.mongoId('id'),
    commonValidations.optionalString('name', 100),
    commonValidations.optionalString('description', 1000),
    body('keywords')
      .optional()
      .isArray({ min: 1, max: 50 })
      .withMessage('Keywords must be an array with 1 to 50 items'),
    body('hashtags')
      .optional()
      .isArray({ max: 50 })
      .withMessage('Hashtags must be an array with maximum 50 items'),
    body('collaborators')
      .optional()
      .isArray({ max: 20 })
      .withMessage('Collaborators must be an array with maximum 20 items'),
    body('sources')
      .optional()
      .isObject()
      .withMessage('Sources must be an object'),
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object'),
    body('status')
      .optional()
      .isIn(['active', 'paused', 'completed'])
      .withMessage('Status must be active, paused, or completed')
  ],

  getById: [
    commonValidations.mongoId('id')
  ],

  delete: [
    commonValidations.mongoId('id')
  ],

  list: [
    ...commonValidations.pagination(),
    query('status')
      .optional()
      .isIn(['active', 'paused', 'completed'])
      .withMessage('Status must be active, paused, or completed'),
    query('search')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Search query must not exceed 100 characters')
  ]
};

// Monitoring validation rules
export const monitoringValidations = {
  getData: [
    commonValidations.mongoId('projectId'),
    ...commonValidations.pagination(),
    query('source')
      .optional()
      .isIn(['instagram', 'website', 'news', 'blog'])
      .withMessage('Source must be instagram, website, news, or blog'),
    query('contentType')
      .optional()
      .isIn(['post', 'reel', 'comment', 'article', 'blog_post'])
      .withMessage('Content type must be post, reel, comment, article, or blog_post'),
    query('sentiment')
      .optional()
      .isIn(['positive', 'negative', 'neutral'])
      .withMessage('Sentiment must be positive, negative, or neutral'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('keyword')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Keyword must not exceed 100 characters'),
    query('hashtag')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Hashtag must not exceed 100 characters')
  ],

  getStats: [
    commonValidations.mongoId('projectId'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('groupBy')
      .optional()
      .isIn(['day', 'week', 'month'])
      .withMessage('Group by must be day, week, or month')
  ],

  getRankings: [
    commonValidations.mongoId('projectId'),
    query('period')
      .optional()
      .isIn(['daily', 'weekly', 'monthly', 'yearly'])
      .withMessage('Period must be daily, weekly, monthly, or yearly'),
    query('metric')
      .optional()
      .isIn(['likes', 'comments', 'shares', 'engagement'])
      .withMessage('Metric must be likes, comments, shares, or engagement'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],

  startMonitoring: [
    commonValidations.mongoId('projectId')
  ],

  stopMonitoring: [
    commonValidations.mongoId('projectId')
  ]
};

// Report validation rules
export const reportValidations = {
  generate: [
    commonValidations.mongoId('projectId'),
    body('period')
      .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'])
      .withMessage('Period must be daily, weekly, monthly, quarterly, yearly, or custom'),
    body('startDate')
      .if(body('period').equals('custom'))
      .notEmpty()
      .isISO8601()
      .withMessage('Start date is required for custom period and must be a valid ISO 8601 date'),
    body('endDate')
      .if(body('period').equals('custom'))
      .notEmpty()
      .isISO8601()
      .withMessage('End date is required for custom period and must be a valid ISO 8601 date'),
    body('includeCharts')
      .optional()
      .isBoolean()
      .withMessage('Include charts must be a boolean'),
    body('includeSentiment')
      .optional()
      .isBoolean()
      .withMessage('Include sentiment must be a boolean'),
    body('includeRankings')
      .optional()
      .isBoolean()
      .withMessage('Include rankings must be a boolean'),
    body('format')
      .optional()
      .isIn(['pdf', 'excel', 'json'])
      .withMessage('Format must be pdf, excel, or json'),
    body('customLogo')
      .optional()
      .isURL()
      .withMessage('Custom logo must be a valid URL')
  ],

  socialMedia: [
    commonValidations.mongoId('projectId'),
    body('period')
      .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'])
      .withMessage('Period must be daily, weekly, monthly, quarterly, yearly, or custom'),
    body('platforms')
      .optional()
      .isArray()
      .withMessage('Platforms must be an array')
      .custom((platforms: string[]) => {
        const validPlatforms = ['instagram'];
        if (platforms && !platforms.every(platform => validPlatforms.includes(platform))) {
          throw new Error('All platforms must be valid (instagram)');
        }
        return true;
      })
  ],

  webNews: [
    commonValidations.mongoId('projectId'),
    body('period')
      .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'])
      .withMessage('Period must be daily, weekly, monthly, quarterly, yearly, or custom'),
    body('sources')
      .optional()
      .isArray()
      .withMessage('Sources must be an array')
      .custom((sources: string[]) => {
        const validSources = ['website', 'news', 'blog'];
        if (sources && !sources.every(source => validSources.includes(source))) {
          throw new Error('All sources must be valid (website, news, blog)');
        }
        return true;
      })
  ],

  saveConfig: [
    commonValidations.mongoId('projectId'),
    body('name')
      .notEmpty()
      .isLength({ min: 2, max: 100 })
      .withMessage('Config name must be between 2 and 100 characters'),
    body('config')
      .isObject()
      .withMessage('Config must be an object'),
    body('isDefault')
      .optional()
      .isBoolean()
      .withMessage('Is default must be a boolean')
  ]
};

// Custom validation helpers
export const customValidations = {
  // Validate that end date is after start date
  dateRange: (startDateField: string = 'startDate', endDateField: string = 'endDate') =>
    body(endDateField)
      .custom((endDate, { req }) => {
        const startDate = req.body[startDateField];
        if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),

  // Validate that at least one source is enabled
  atLeastOneSource: () =>
    body('sources')
      .custom((sources) => {
        if (sources && typeof sources === 'object') {
          const hasEnabledSource = Object.values(sources).some(value => value === true);
          if (!hasEnabledSource) {
            throw new Error('At least one monitoring source must be enabled');
          }
        }
        return true;
      }),

  // Validate hashtag format (must start with #)
  hashtagFormat: (field: string) =>
    body(field)
      .custom((hashtags: string[]) => {
        if (hashtags && Array.isArray(hashtags)) {
          const invalidHashtags = hashtags.filter(hashtag => !hashtag.startsWith('#'));
          if (invalidHashtags.length > 0) {
            throw new Error('All hashtags must start with #');
          }
        }
        return true;
      }),

  // Validate unique array items
  uniqueArrayItems: (field: string) =>
    body(field)
      .custom((items: any[]) => {
        if (items && Array.isArray(items)) {
          const uniqueItems = [...new Set(items)];
          if (uniqueItems.length !== items.length) {
            throw new Error(`${field} must contain unique items`);
          }
        }
        return true;
      }),

  // Validate file upload
  fileUpload: (field: string, allowedTypes: string[], maxSize: number) =>
    body(field)
      .custom((file) => {
        if (file) {
          // Check file type
          if (!allowedTypes.includes(file.mimetype)) {
            throw new Error(`File type must be one of: ${allowedTypes.join(', ')}`);
          }
          
          // Check file size
          if (file.size > maxSize) {
            throw new Error(`File size must not exceed ${maxSize} bytes`);
          }
        }
        return true;
      })
};

// Sanitization helpers
export const sanitizers = {
  // Remove HTML tags and trim whitespace
  cleanText: (field: string) =>
    body(field)
      .customSanitizer((value) => {
        if (typeof value === 'string') {
          return value.replace(/<[^>]*>/g, '').trim();
        }
        return value;
      }),

  // Convert to lowercase and trim
  lowercase: (field: string) =>
    body(field)
      .customSanitizer((value) => {
        if (typeof value === 'string') {
          return value.toLowerCase().trim();
        }
        return value;
      }),

  // Normalize hashtags (ensure they start with #)
  normalizeHashtags: (field: string) =>
    body(field)
      .customSanitizer((hashtags) => {
        if (Array.isArray(hashtags)) {
          return hashtags.map(hashtag => {
            if (typeof hashtag === 'string') {
              const cleaned = hashtag.trim().toLowerCase();
              return cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
            }
            return hashtag;
          });
        }
        return hashtags;
      }),

  // Remove duplicates from array
  removeDuplicates: (field: string) =>
    body(field)
      .customSanitizer((items) => {
        if (Array.isArray(items)) {
          return [...new Set(items)];
        }
        return items;
      })
};

// Export all validation chains as a single object for easy import
export const validations = {
  common: commonValidations,
  user: userValidations,
  project: projectValidations,
  monitoring: monitoringValidations,
  report: reportValidations,
  custom: customValidations,
  sanitizers
};

export default validations;