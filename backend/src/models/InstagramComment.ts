import mongoose, { Document, Schema } from 'mongoose';

export interface IInstagramComment extends Document {
  commentId: string;
  postId: string;
  username: string;
  text: string;
  likesCount: number;
  repliesCount: number;
  parentCommentId?: string;
  isReply: boolean;
  postedAt: Date;
  scrapedAt: Date;
  sentiment?: {
    score: number; // -1 a 1 (negativo a positivo)
    label: 'positive' | 'negative' | 'neutral';
    confidence: number; // 0 a 1
  };
  isVerified: boolean;
  isFromOwner: boolean;
  mentions: string[];
  hashtags: string[];
  isActive: boolean;
  language?: string;
  metadata?: {
    hasEmojis: boolean;
    wordCount: number;
    characterCount: number;
  };
}

const InstagramCommentSchema: Schema = new Schema({
  commentId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  postId: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  likesCount: {
    type: Number,
    default: 0,
    min: 0
  },
  repliesCount: {
    type: Number,
    default: 0,
    min: 0
  },
  parentCommentId: {
    type: String,
    trim: true
  },
  isReply: {
    type: Boolean,
    default: false
  },
  postedAt: {
    type: Date,
    required: true
  },
  scrapedAt: {
    type: Date,
    default: Date.now
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
  isVerified: {
    type: Boolean,
    default: false
  },
  isFromOwner: {
    type: Boolean,
    default: false
  },
  mentions: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  hashtags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  language: {
    type: String,
    trim: true,
    lowercase: true
  },
  metadata: {
    hasEmojis: {
      type: Boolean,
      default: false
    },
    wordCount: {
      type: Number,
      min: 0
    },
    characterCount: {
      type: Number,
      min: 0
    }
  }
}, {
  timestamps: true
});

// Índices para otimizar consultas
InstagramCommentSchema.index({ commentId: 1 });
InstagramCommentSchema.index({ postId: 1 });
InstagramCommentSchema.index({ username: 1 });
InstagramCommentSchema.index({ postedAt: -1 });
InstagramCommentSchema.index({ likesCount: -1 });
InstagramCommentSchema.index({ 'sentiment.label': 1 });
InstagramCommentSchema.index({ isReply: 1 });
InstagramCommentSchema.index({ parentCommentId: 1 });
InstagramCommentSchema.index({ isActive: 1 });
InstagramCommentSchema.index({ scrapedAt: -1 });

// Middleware para processar metadados do comentário
InstagramCommentSchema.pre('save', function(next) {
  if (this.text) {
    const textContent = String(this.text);
    
    // Contar palavras e caracteres
    const wordCount = textContent.trim().split(/\s+/).length;
    const characterCount = textContent.length;
    
    // Verificar se tem emojis (regex básico)
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const hasEmojis = emojiRegex.test(textContent);
    
    // Extrair hashtags
    const hashtagRegex = /#[\w\u00c0-\u024f\u1e00-\u1eff]+/gi;
    const hashtags = textContent.match(hashtagRegex) || [];
    this.hashtags = hashtags.map(tag => tag.toLowerCase().substring(1));
    
    // Extrair menções
    const mentionRegex = /@[\w.]+/gi;
    const mentions = textContent.match(mentionRegex) || [];
    this.mentions = mentions.map(mention => mention.toLowerCase().substring(1));
    
    // Definir se é resposta baseado no parentCommentId
    this.isReply = !!this.parentCommentId;
    
    // Atualizar metadados
    this.metadata = {
      hasEmojis,
      wordCount,
      characterCount
    };
  }
  
  next();
});

export default mongoose.model<IInstagramComment>('InstagramComment', InstagramCommentSchema);