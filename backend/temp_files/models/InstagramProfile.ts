import mongoose, { Document, Schema } from 'mongoose';

export interface IInstagramProfile extends Document {
  username: string;
  displayName: string;
  profileUrl: string;
  profilePicture?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  isPrivate: boolean;
  interactions: {
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    lastInteractionDate: Date;
  };
  rankings: {
    monthly: {
      year: number;
      month: number;
      likesRank: number;
      commentsRank: number;
      totalInteractionsRank: number;
      score: number;
    }[];
    yearly: {
      year: number;
      likesRank: number;
      commentsRank: number;
      totalInteractionsRank: number;
      score: number;
    }[];
  };
  projects: mongoose.Types.ObjectId[];
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InstagramProfileSchema: Schema = new Schema({
  username: {
    type: String,
    required: [true, 'Username é obrigatório'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-zA-Z0-9._]+$/, 'Username inválido']
  },
  displayName: {
    type: String,
    required: [true, 'Nome de exibição é obrigatório'],
    trim: true,
    maxlength: [150, 'Nome de exibição não pode ter mais de 150 caracteres']
  },
  profileUrl: {
    type: String,
    required: true,
    trim: true
  },
  profilePicture: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio não pode ter mais de 500 caracteres']
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
  isVerified: {
    type: Boolean,
    default: false
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  interactions: {
    totalLikes: {
      type: Number,
      default: 0,
      min: 0
    },
    totalComments: {
      type: Number,
      default: 0,
      min: 0
    },
    totalShares: {
      type: Number,
      default: 0,
      min: 0
    },
    lastInteractionDate: {
      type: Date,
      default: Date.now
    }
  },
  rankings: {
    monthly: [{
      year: {
        type: Number,
        required: true
      },
      month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
      },
      likesRank: {
        type: Number,
        min: 1
      },
      commentsRank: {
        type: Number,
        min: 1
      },
      totalInteractionsRank: {
        type: Number,
        min: 1
      },
      score: {
        type: Number,
        min: 0
      }
    }],
    yearly: [{
      year: {
        type: Number,
        required: true
      },
      likesRank: {
        type: Number,
        min: 1
      },
      commentsRank: {
        type: Number,
        min: 1
      },
      totalInteractionsRank: {
        type: Number,
        min: 1
      },
      score: {
        type: Number,
        min: 0
      }
    }]
  },
  projects: [{
    type: Schema.Types.ObjectId,
    ref: 'Project'
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
InstagramProfileSchema.index({ username: 1 });
InstagramProfileSchema.index({ 'interactions.totalLikes': -1 });
InstagramProfileSchema.index({ 'interactions.totalComments': -1 });
InstagramProfileSchema.index({ 'interactions.lastInteractionDate': -1 });
InstagramProfileSchema.index({ projects: 1 });
InstagramProfileSchema.index({ 'rankings.monthly.year': 1, 'rankings.monthly.month': 1 });
InstagramProfileSchema.index({ 'rankings.yearly.year': 1 });

// Method to calculate engagement rate
InstagramProfileSchema.methods.calculateEngagementRate = function() {
  if (this.followersCount === 0) return 0;
  const totalEngagement = this.interactions.totalLikes + this.interactions.totalComments;
  return (totalEngagement / this.followersCount) * 100;
};

// Method to update interaction stats
InstagramProfileSchema.methods.updateInteractions = function(likes: number, comments: number, shares: number = 0) {
  this.interactions.totalLikes += likes;
  this.interactions.totalComments += comments;
  this.interactions.totalShares += shares;
  this.interactions.lastInteractionDate = new Date();
  this.lastUpdated = new Date();
};

export default mongoose.model<IInstagramProfile>('InstagramProfile', InstagramProfileSchema);