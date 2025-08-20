import mongoose, { Document, Schema } from 'mongoose';

export interface IInstagramProfile extends Document {
  username: string;
  displayName: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  profilePicture?: string;
  isVerified: boolean;
  isPrivate: boolean;
  externalUrl?: string;
  category?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
  };
  location?: string;
  createdAt: Date;
  updatedAt: Date;
  lastScrapedAt: Date;
  isActive: boolean;
  tags: string[];
  notes?: string;
}

const InstagramProfileSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  bio: {
    type: String,
    trim: true
  },
  followersCount: {
    type: Number,
    default: 0,
    min: 0
  },
  followingCount: {
    type: Number,
    default: 0,
    min: 0
  },
  postsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  profilePicture: {
    type: String,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  externalUrl: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  contactInfo: {
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    }
  },
  location: {
    type: String,
    trim: true
  },
  lastScrapedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Índices para otimizar consultas
InstagramProfileSchema.index({ username: 1 });
InstagramProfileSchema.index({ isActive: 1 });
InstagramProfileSchema.index({ tags: 1 });
InstagramProfileSchema.index({ lastScrapedAt: 1 });
InstagramProfileSchema.index({ followersCount: -1 });

export default mongoose.model<IInstagramProfile>('InstagramProfile', InstagramProfileSchema);