import mongoose, { Document, Schema } from 'mongoose';

export interface IInstagramPost extends Document {
  postId: string;
  username: string;
  profileId: mongoose.Types.ObjectId;
  type: 'photo' | 'video' | 'carousel' | 'reel' | 'story';
  caption?: string;
  mediaUrls: string[];
  thumbnailUrl?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount?: number;
  playCount?: number;
  hashtags: string[];
  mentions: string[];
  location?: {
    name: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  postedAt: Date;
  scrapedAt: Date;
  lastUpdatedAt: Date;
  isSponsored: boolean;
  engagementRate: number;
  reach?: number;
  impressions?: number;
  saves?: number;
  isActive: boolean;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
  };
}

const InstagramPostSchema: Schema = new Schema({
  postId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  profileId: {
    type: Schema.Types.ObjectId,
    ref: 'InstagramProfile',
    required: true
  },
  type: {
    type: String,
    enum: ['photo', 'video', 'carousel', 'reel', 'story'],
    required: true
  },
  caption: {
    type: String,
    trim: true
  },
  mediaUrls: [{
    type: String,
    required: true,
    trim: true
  }],
  thumbnailUrl: {
    type: String,
    trim: true
  },
  likesCount: {
    type: Number,
    default: 0,
    min: 0
  },
  commentsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  sharesCount: {
    type: Number,
    default: 0,
    min: 0
  },
  viewsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  playCount: {
    type: Number,
    default: 0,
    min: 0
  },
  hashtags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  mentions: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  location: {
    name: {
      type: String,
      trim: true
    },
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180
      }
    }
  },
  postedAt: {
    type: Date,
    required: true
  },
  scrapedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  },
  isSponsored: {
    type: Boolean,
    default: false
  },
  engagementRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  reach: {
    type: Number,
    min: 0
  },
  impressions: {
    type: Number,
    min: 0
  },
  saves: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    width: {
      type: Number,
      min: 0
    },
    height: {
      type: Number,
      min: 0
    },
    duration: {
      type: Number,
      min: 0
    },
    format: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true
});

// Índices para otimizar consultas
InstagramPostSchema.index({ postId: 1 });
InstagramPostSchema.index({ username: 1 });
InstagramPostSchema.index({ profileId: 1 });
InstagramPostSchema.index({ type: 1 });
InstagramPostSchema.index({ postedAt: -1 });
InstagramPostSchema.index({ likesCount: -1 });
InstagramPostSchema.index({ engagementRate: -1 });
InstagramPostSchema.index({ hashtags: 1 });
InstagramPostSchema.index({ isActive: 1 });
InstagramPostSchema.index({ scrapedAt: -1 });

// Middleware para calcular taxa de engajamento
InstagramPostSchema.pre('save', function(next) {
  if (this.likesCount !== undefined && this.commentsCount !== undefined) {
    // Taxa de engajamento básica: (curtidas + comentários) / seguidores * 100
    // Nota: Para calcular corretamente, precisaríamos do número de seguidores do perfil
    const likesCount = Number(this.likesCount) || 0;
    const commentsCount = Number(this.commentsCount) || 0;
    const sharesCount = Number(this.sharesCount) || 0;
    const totalEngagement = likesCount + commentsCount + sharesCount;
    this.engagementRate = totalEngagement > 0 ? totalEngagement : 0;
  }
  this.lastUpdatedAt = new Date();
  next();
});

export default mongoose.model<IInstagramPost>('InstagramPost', InstagramPostSchema);