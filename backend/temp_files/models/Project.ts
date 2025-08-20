import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description?: string;
  keywords: string[];
  hashtags: string[];
  owner: mongoose.Types.ObjectId;
  collaborators: mongoose.Types.ObjectId[];
  sources: {
    instagram: boolean;
    websites: boolean;
    news: boolean;
    blogs: boolean;
  };
  settings: {
    monitoringFrequency: number; // em minutos
    sentimentAnalysis: boolean;
    realTimeAlerts: boolean;
    maxResults: number;
  };
  status: 'active' | 'paused' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Nome do projeto é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome não pode ter mais de 100 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Descrição não pode ter mais de 500 caracteres']
  },
  keywords: [{
    type: String,
    required: true,
    trim: true,
    lowercase: true
  }],
  hashtags: [{
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v: string) {
        return v.startsWith('#');
      },
      message: 'Hashtag deve começar com #'
    }
  }],
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  sources: {
    instagram: {
      type: Boolean,
      default: true
    },
    websites: {
      type: Boolean,
      default: true
    },
    news: {
      type: Boolean,
      default: true
    },
    blogs: {
      type: Boolean,
      default: true
    }
  },
  settings: {
    monitoringFrequency: {
      type: Number,
      default: 60, // 1 hora
      min: [15, 'Frequência mínima é 15 minutos'],
      max: [1440, 'Frequência máxima é 24 horas']
    },
    sentimentAnalysis: {
      type: Boolean,
      default: true
    },
    realTimeAlerts: {
      type: Boolean,
      default: false
    },
    maxResults: {
      type: Number,
      default: 1000,
      min: [100, 'Mínimo 100 resultados'],
      max: [10000, 'Máximo 10000 resultados']
    }
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Index for better query performance
ProjectSchema.index({ owner: 1, status: 1 });
ProjectSchema.index({ keywords: 1 });
ProjectSchema.index({ hashtags: 1 });

export default mongoose.model<IProject>('Project', ProjectSchema);