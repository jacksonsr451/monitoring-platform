import mongoose, { Document, Schema } from 'mongoose';

export interface IWebSource extends Document {
  name: string;
  url: string;
  type: 'news' | 'blog' | 'website' | 'forum';
  category: string;
  description?: string;
  isActive: boolean;
  crawlFrequency: number; // em minutos
  lastCrawled?: Date;
  nextCrawl?: Date;
  selectors: {
    title?: string;
    content?: string;
    author?: string;
    publishDate?: string;
    image?: string;
    links?: string;
  };
  keywords: string[];
  excludeKeywords: string[];
  language: string;
  encoding?: string;
  userAgent?: string;
  headers?: Record<string, string>;
  crawlSettings: {
    maxDepth: number;
    followExternalLinks: boolean;
    respectRobotsTxt: boolean;
    delay: number; // em ms
  };
  statistics: {
    totalArticles: number;
    lastMonthArticles: number;
    avgArticlesPerDay: number;
    successRate: number;
    lastError?: string;
    lastErrorDate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const WebSourceSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  url: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'URL deve começar com http:// ou https://'
    }
  },
  type: {
    type: String,
    required: true,
    enum: ['news', 'blog', 'website', 'forum'],
    default: 'website'
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  isActive: {
    type: Boolean,
    default: true
  },
  crawlFrequency: {
    type: Number,
    required: true,
    min: 5, // mínimo 5 minutos
    default: 60 // 1 hora
  },
  lastCrawled: {
    type: Date
  },
  nextCrawl: {
    type: Date
  },
  selectors: {
    title: { type: String, trim: true },
    content: { type: String, trim: true },
    author: { type: String, trim: true },
    publishDate: { type: String, trim: true },
    image: { type: String, trim: true },
    links: { type: String, trim: true }
  },
  keywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  excludeKeywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  language: {
    type: String,
    required: true,
    default: 'pt-BR',
    maxlength: 10
  },
  encoding: {
    type: String,
    default: 'utf-8'
  },
  userAgent: {
    type: String,
    default: 'MonitoringPlatform/1.0'
  },
  headers: {
    type: Map,
    of: String
  },
  crawlSettings: {
    maxDepth: {
      type: Number,
      default: 2,
      min: 1,
      max: 5
    },
    followExternalLinks: {
      type: Boolean,
      default: false
    },
    respectRobotsTxt: {
      type: Boolean,
      default: true
    },
    delay: {
      type: Number,
      default: 1000,
      min: 500
    }
  },
  statistics: {
    totalArticles: {
      type: Number,
      default: 0
    },
    lastMonthArticles: {
      type: Number,
      default: 0
    },
    avgArticlesPerDay: {
      type: Number,
      default: 0
    },
    successRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    lastError: {
      type: String
    },
    lastErrorDate: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// Índices para otimização
WebSourceSchema.index({ url: 1 }, { unique: true });
WebSourceSchema.index({ type: 1, category: 1 });
WebSourceSchema.index({ isActive: 1, nextCrawl: 1 });
WebSourceSchema.index({ keywords: 1 });
WebSourceSchema.index({ createdAt: -1 });

// Middleware para calcular próximo crawl
WebSourceSchema.pre('save', function(next) {
  if (this.isModified('crawlFrequency') || this.isModified('lastCrawled')) {
    const now = new Date();
    const lastCrawl = this.lastCrawled ? new Date(String(this.lastCrawled)) : now;
    const frequency = Number(this.crawlFrequency) || 60;
    this.nextCrawl = new Date(lastCrawl.getTime() + (frequency * 60 * 1000));
  }
  next();
});

export default mongoose.model<IWebSource>('WebSource', WebSourceSchema);