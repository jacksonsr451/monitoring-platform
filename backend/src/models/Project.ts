import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description?: string;
  keywords: string[];
  instagramProfiles: mongoose.Types.ObjectId[];
  webSources: mongoose.Types.ObjectId[];
  userId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  keywords: [{
    type: String,
    trim: true
  }],
  instagramProfiles: [{
    type: Schema.Types.ObjectId,
    ref: 'InstagramProfile'
  }],
  webSources: [{
    type: Schema.Types.ObjectId,
    ref: 'WebSource'
  }],
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices
ProjectSchema.index({ userId: 1 });
ProjectSchema.index({ name: 1, userId: 1 }, { unique: true });
ProjectSchema.index({ keywords: 1 });

export default mongoose.model<IProject>('Project', ProjectSchema);