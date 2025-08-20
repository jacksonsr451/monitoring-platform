import mongoose, { Document, Schema } from 'mongoose';

export interface IMonitoringData extends Document {
  project: mongoose.Types.ObjectId;
  source: 'instagram' | 'website' | 'news' | 'blog';
  sourceUrl: string;
  contentType: 'post' | 'reel' | 'comment' | 'article' | 'blog_post';
  content: {
    text: string;
    images?: string[];
    videos?: string[];
    author: {
      username?: string;
      displayName?: string;
      profileUrl?: string;
      followersCount?: number;
    };
  };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
  metadata: {
    publishedAt: Date;
    location?: string;
    language?: string;
    hashtags: string[];
    mentions: string[];
  };
  sentiment: {
    score: number; // -1 to 1
    label: 'positive' | 'negative' | 'neutral';
    confidence: number; // 0 to 1
  };
  matchedKeywords: string[];
  matchedHashtags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MonitoringDataSchema: Schema = new Schema({
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  source: {
    type: String,
    enum: ['instagram', 'website', 'news', 'blog'],
    required: true
  },
  sourceUrl: {
    type: String,
    required: true,
    trim: true
  },
  contentType: {
    type: String,
    enum: ['post', 'reel', 'comment', 'article', 'blog_post'],
    required: true
  },
  content: {
    text: {
      type: String,
      required: true,
      maxlength: [10000, 'Texto não pode ter mais de 10000 caracteres']
    },
    images: [{
      type: String,
      trim: true
    }],
    videos: [{
      type: String,
      trim: true
    }],
    author: {
      username: {
        type: String,
        trim: true
      },
      displayName: {
        type: String,
        trim: true
      },
      profileUrl: {
        type: String,
        trim: true
      },
      followersCount: {
        type: Number,
        min: 0
      }
    }
  },
  engagement: {
    likes: {
      type: Number,
      default: 0,
      min: 0
    },
    comments: {
      type: Number,
      default: 0,
      min: 0
    },
    shares: {
      type: Number,
      default: 0,
      min: 0
    },
    views: {
      type: Number,
      min: 0
    }
  },
  metadata: {
    publishedAt: {
      type: Date,
      required: true
    },
    location: {
      type: String,
      trim: true
    },
    language: {
      type: String,
      trim: true,
      lowercase: true
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
    }]
  },
  sentiment: {
    score: {
      type: Number,
      min: -1,
      max: 1,
      default: 0
    },
    label: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    }
  },
  matchedKeywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  matchedHashtags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
MonitoringDataSchema.index({ project: 1, createdAt: -1 });
MonitoringDataSchema.index({ source: 1, contentType: 1 });
MonitoringDataSchema.index({ 'metadata.publishedAt': -1 });
MonitoringDataSchema.index({ matchedKeywords: 1 });
MonitoringDataSchema.index({ matchedHashtags: 1 });
MonitoringDataSchema.index({ 'sentiment.label': 1 });
MonitoringDataSchema.index({ 'content.author.username': 1 });

export default mongoose.model<IMonitoringData>('MonitoringData', MonitoringDataSchema);