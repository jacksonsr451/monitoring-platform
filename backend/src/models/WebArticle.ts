import mongoose, { Document, Schema } from 'mongoose';

export interface IWebArticle extends Document {
  sourceId: mongoose.Types.ObjectId;
  sourceName: string;
  sourceUrl: string;
  title: string;
  content: string;
  summary?: string;
  author?: string;
  publishedAt?: Date;
  scrapedAt: Date;
  url: string;
  imageUrl?: string;
  tags: string[];
  keywords: string[];
  category: string;
  language: string;
  wordCount: number;
  readingTime: number; // em minutos
  sentiment?: {
    score: number; // -1 a 1
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
  };
  engagement?: {
    views?: number;
    shares?: number;
    comments?: number;
    likes?: number;
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    canonicalUrl?: string;
  };
  links: {
    internal: string[];
    external: string[];
  };
  isActive: boolean;
  isDuplicate: boolean;
  duplicateOf?: mongoose.Types.ObjectId;
  crawlDepth: number;
  hash: string; // hash do conteúdo para detectar duplicatas
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const WebArticleSchema: Schema = new Schema({
  sourceId: {
    type: Schema.Types.ObjectId,
    ref: 'WebSource',
    required: true
  },
  sourceName: {
    type: String,
    required: true,
    trim: true
  },
  sourceUrl: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  content: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  author: {
    type: String,
    trim: true,
    maxlength: 200
  },
  publishedAt: {
    type: Date
  },
  scrapedAt: {
    type: Date,
    required: true,
    default: Date.now
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
  imageUrl: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  keywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  category: {
    type: String,
    required: true,
    trim: true
  },
  language: {
    type: String,
    required: true,
    default: 'pt-BR'
  },
  wordCount: {
    type: Number,
    required: true,
    min: 0
  },
  readingTime: {
    type: Number,
    required: true,
    min: 0
  },
  sentiment: {
    score: {
      type: Number,
      min: -1,
      max: 1
    },
    label: {
      type: String,
      enum: ['positive', 'negative', 'neutral']
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    }
  },
  engagement: {
    views: { type: Number, min: 0 },
    shares: { type: Number, min: 0 },
    comments: { type: Number, min: 0 },
    likes: { type: Number, min: 0 }
  },
  seo: {
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    metaKeywords: [{ type: String, trim: true }],
    canonicalUrl: { type: String, trim: true }
  },
  links: {
    internal: [{ type: String, trim: true }],
    external: [{ type: String, trim: true }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDuplicate: {
    type: Boolean,
    default: false
  },
  duplicateOf: {
    type: Schema.Types.ObjectId,
    ref: 'WebArticle'
  },
  crawlDepth: {
    type: Number,
    required: true,
    min: 0
  },
  hash: {
    type: String,
    required: true,
    index: true
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Índices para otimização
WebArticleSchema.index({ sourceId: 1, scrapedAt: -1 });
WebArticleSchema.index({ url: 1 }, { unique: true });
WebArticleSchema.index({ title: 'text', content: 'text' });
WebArticleSchema.index({ keywords: 1 });
WebArticleSchema.index({ category: 1, publishedAt: -1 });
WebArticleSchema.index({ hash: 1 });
WebArticleSchema.index({ isDuplicate: 1, isActive: 1 });
WebArticleSchema.index({ publishedAt: -1 });
WebArticleSchema.index({ scrapedAt: -1 });

// Middleware para calcular word count e reading time
WebArticleSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    // Calcular contagem de palavras
    const contentText = String(this.content || '');
    const words = contentText.trim().split(/\s+/).length;
    this.wordCount = words;
    
    // Calcular tempo de leitura (assumindo 200 palavras por minuto)
    this.readingTime = Math.ceil(words / 200);
    
    // Gerar hash do conteúdo
    const crypto = require('crypto');
    this.hash = crypto.createHash('md5').update(contentText).digest('hex');
  }
  next();
});

// Método para gerar resumo automático
WebArticleSchema.methods.generateSummary = function(maxLength: number = 300): string {
  const contentText = String(this.content || '');
  if (contentText.length <= maxLength) {
    return contentText;
  }
  
  const sentences = contentText.split(/[.!?]+/);
  let summary = '';
  
  for (const sentence of sentences) {
    if ((summary + sentence).length > maxLength) {
      break;
    }
    summary += sentence + '. ';
  }
  
  return summary.trim();
};

export default mongoose.model<IWebArticle>('WebArticle', WebArticleSchema);