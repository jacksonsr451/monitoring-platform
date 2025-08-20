import crypto from 'crypto';
import { Request } from 'express';
import mongoose from 'mongoose';

// Type definitions
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc' | '1' | '-1';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: PaginationResult<T>['pagination'];
}

// Pagination helper
export const paginate = async <T>(
  model: mongoose.Model<T>,
  filter: any = {},
  options: PaginationOptions = {},
  populate?: string | string[]
): Promise<PaginationResult<T>> => {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 10));
  const skip = (page - 1) * limit;
  
  // Build sort object
  let sort: any = {};
  if (options.sort) {
    const order = options.order === 'desc' || options.order === '-1' ? -1 : 1;
    sort[options.sort] = order;
  } else {
    sort = { createdAt: -1 }; // Default sort by creation date
  }
  
  // Execute queries in parallel
  const [data, totalItems] = await Promise.all([
    model
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate(populate || '')
      .lean(),
    model.countDocuments(filter)
  ]);
  
  const totalPages = Math.ceil(totalItems / limit);
  
  return {
    data: data as T[],
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

// API response helpers
export const successResponse = <T>(
  data?: T,
  message?: string,
  pagination?: PaginationResult<T>['pagination']
): ApiResponse<T> => {
  return {
    success: true,
    data,
    message,
    pagination
  };
};

export const errorResponse = (
  error: string,
  message?: string
): ApiResponse => {
  return {
    success: false,
    error,
    message
  };
};

// Validation helpers
export const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isValidHashtag = (hashtag: string): boolean => {
  const hashtagRegex = /^#[a-zA-Z0-9_]+$/;
  return hashtagRegex.test(hashtag);
};

// String utilities
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

export const truncate = (text: string, maxLength: number, suffix: string = '...'): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
};

export const capitalizeFirst = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const capitalizeWords = (text: string): string => {
  return text.replace(/\b\w/g, char => char.toUpperCase());
};

export const removeHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

export const extractHashtags = (text: string): string[] => {
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  return text.match(hashtagRegex) || [];
};

export const extractMentions = (text: string): string[] => {
  const mentionRegex = /@[a-zA-Z0-9_]+/g;
  return text.match(mentionRegex) || [];
};

// Array utilities
export const removeDuplicates = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const shuffle = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Date utilities
export const formatDate = (date: Date, format: string = 'YYYY-MM-DD'): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year.toString())
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

export const getDateRange = (period: string): { startDate: Date; endDate: Date } => {
  const now = new Date();
  const endDate = new Date(now);
  let startDate: Date;
  
  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'weekly':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarterly':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days
  }
  
  return { startDate, endDate };
};

export const isDateInRange = (date: Date, startDate: Date, endDate: Date): boolean => {
  return date >= startDate && date <= endDate;
};

// Crypto utilities
export const generateRandomString = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

export const generateApiKey = (): string => {
  return `mk_${generateRandomString(32)}`;
};

export const hashString = (text: string, algorithm: string = 'sha256'): string => {
  return crypto.createHash(algorithm).update(text).digest('hex');
};

export const generateUUID = (): string => {
  return crypto.randomUUID();
};

// Request utilities
export const getClientIP = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

export const getUserAgent = (req: Request): string => {
  return req.headers['user-agent'] || 'unknown';
};

export const parseUserAgent = (userAgent: string) => {
  // Simple user agent parsing (you might want to use a library like 'ua-parser-js' for more detailed parsing)
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  const isBot = /bot|crawler|spider|scraper/i.test(userAgent);
  
  let browser = 'unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  return {
    isMobile,
    isBot,
    browser,
    raw: userAgent
  };
};

// File utilities
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const isImageFile = (filename: string): boolean => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  return imageExtensions.includes(getFileExtension(filename));
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Number utilities
export const formatNumber = (num: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

export const formatCurrency = (amount: number, currency: string = 'BRL'): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency
  }).format(amount);
};

export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const roundToDecimals = (value: number, decimals: number): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// Object utilities
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

export const isEmpty = (value: any): boolean => {
  if (value == null) return true;
  if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

// Async utilities
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      await sleep(delay * attempt); // Exponential backoff
    }
  }
  
  throw lastError!;
};

export const timeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
    })
  ]);
};

// Cache utilities
const cache = new Map<string, { value: any; expiry: number }>();

export const memoize = <T extends (...args: any[]) => any>(
  fn: T,
  ttl: number = 60000 // 1 minute default
): T => {
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.value;
    }
    
    const result = fn(...args);
    cache.set(key, { value: result, expiry: Date.now() + ttl });
    
    return result;
  }) as T;
};

export const clearCache = (): void => {
  cache.clear();
};

// Performance utilities
export const measureTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
};

export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  };
};

// Export all utilities as a single object
export const utils = {
  // Pagination
  paginate,
  
  // API responses
  successResponse,
  errorResponse,
  
  // Validation
  isValidObjectId,
  isValidEmail,
  isValidUrl,
  isValidHashtag,
  
  // String utilities
  slugify,
  truncate,
  capitalizeFirst,
  capitalizeWords,
  removeHtmlTags,
  extractHashtags,
  extractMentions,
  
  // Array utilities
  removeDuplicates,
  chunk,
  shuffle,
  
  // Date utilities
  formatDate,
  getDateRange,
  isDateInRange,
  
  // Crypto utilities
  generateRandomString,
  generateApiKey,
  hashString,
  generateUUID,
  
  // Request utilities
  getClientIP,
  getUserAgent,
  parseUserAgent,
  
  // File utilities
  getFileExtension,
  isImageFile,
  formatFileSize,
  
  // Number utilities
  formatNumber,
  formatCurrency,
  formatPercentage,
  clamp,
  roundToDecimals,
  
  // Object utilities
  deepClone,
  omit,
  pick,
  isEmpty,
  
  // Async utilities
  sleep,
  retry,
  timeout,
  
  // Cache utilities
  memoize,
  clearCache,
  
  // Performance utilities
  measureTime,
  debounce,
  throttle
};

export default utils;