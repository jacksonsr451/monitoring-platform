import mongoose, { Document, Schema } from 'mongoose';

export interface IReport extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: 'instagram' | 'web' | 'combined' | 'custom';
  category: 'performance' | 'engagement' | 'content' | 'analytics' | 'comparison';
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  filters: {
    projects?: mongoose.Types.ObjectId[];
    sources?: mongoose.Types.ObjectId[];
    keywords?: string[];
    categories?: string[];
    metrics?: string[];
  };
  configuration: {
    charts: Array<{
      type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
      title: string;
      dataSource: string;
      metrics: string[];
      groupBy?: string;
      filters?: any;
    }>;
    tables: Array<{
      title: string;
      columns: string[];
      dataSource: string;
      filters?: any;
      sortBy?: string;
      limit?: number;
    }>;
    layout: {
      sections: Array<{
        type: 'chart' | 'table' | 'metric' | 'text';
        title: string;
        size: 'small' | 'medium' | 'large' | 'full';
        position: { row: number; col: number };
        config: any;
      }>;
    };
  };
  data?: {
    metrics: any;
    charts: any;
    tables: any;
    summary: any;
  };
  status: 'draft' | 'generating' | 'completed' | 'error';
  format: 'pdf' | 'excel' | 'html' | 'json';
  isScheduled: boolean;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    timezone: string;
    nextRun?: Date;
  };
  recipients?: string[];
  generatedAt?: Date;
  fileUrl?: string;
  fileSize?: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  type: {
    type: String,
    required: true,
    enum: ['instagram', 'web', 'combined', 'custom']
  },
  category: {
    type: String,
    required: true,
    enum: ['performance', 'engagement', 'content', 'analytics', 'comparison']
  },
  dateRange: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  filters: {
    projects: [{
      type: Schema.Types.ObjectId,
      ref: 'Project'
    }],
    sources: [{
      type: Schema.Types.ObjectId,
      ref: 'WebSource'
    }],
    keywords: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    categories: [{
      type: String,
      trim: true
    }],
    metrics: [{
      type: String,
      trim: true
    }]
  },
  configuration: {
    charts: [{
      type: {
        type: String,
        enum: ['line', 'bar', 'pie', 'area', 'scatter'],
        required: true
      },
      title: {
        type: String,
        required: true,
        trim: true
      },
      dataSource: {
        type: String,
        required: true
      },
      metrics: [{
        type: String,
        required: true
      }],
      groupBy: String,
      filters: Schema.Types.Mixed
    }],
    tables: [{
      title: {
        type: String,
        required: true,
        trim: true
      },
      columns: [{
        type: String,
        required: true
      }],
      dataSource: {
        type: String,
        required: true
      },
      filters: Schema.Types.Mixed,
      sortBy: String,
      limit: Number
    }],
    layout: {
      sections: [{
        type: {
          type: String,
          enum: ['chart', 'table', 'metric', 'text'],
          required: true
        },
        title: {
          type: String,
          required: true
        },
        size: {
          type: String,
          enum: ['small', 'medium', 'large', 'full'],
          default: 'medium'
        },
        position: {
          row: {
            type: Number,
            required: true
          },
          col: {
            type: Number,
            required: true
          }
        },
        config: Schema.Types.Mixed
      }]
    }
  },
  data: {
    metrics: Schema.Types.Mixed,
    charts: Schema.Types.Mixed,
    tables: Schema.Types.Mixed,
    summary: Schema.Types.Mixed
  },
  status: {
    type: String,
    required: true,
    enum: ['draft', 'generating', 'completed', 'error'],
    default: 'draft'
  },
  format: {
    type: String,
    required: true,
    enum: ['pdf', 'excel', 'html', 'json'],
    default: 'pdf'
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly']
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31
    },
    time: String,
    timezone: {
      type: String,
      default: 'America/Sao_Paulo'
    },
    nextRun: Date
  },
  recipients: [{
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  }],
  generatedAt: Date,
  fileUrl: String,
  fileSize: Number,
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
reportSchema.index({ createdBy: 1, createdAt: -1 });
reportSchema.index({ type: 1, category: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ isScheduled: 1, 'schedule.nextRun': 1 });
reportSchema.index({ 'dateRange.startDate': 1, 'dateRange.endDate': 1 });

// Middleware para validação
reportSchema.pre('save', function(next) {
  if (this.dateRange.startDate >= this.dateRange.endDate) {
    next(new Error('Data de início deve ser anterior à data de fim'));
  }
  
  if (this.isScheduled && !this.schedule) {
    next(new Error('Configuração de agendamento é obrigatória para relatórios agendados'));
  }
  
  next();
});

// Virtual para duração do período
reportSchema.virtual('periodDuration').get(function() {
  const diffTime = Math.abs(this.dateRange.endDate.getTime() - this.dateRange.startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual para status de agendamento
reportSchema.virtual('scheduleStatus').get(function() {
  if (!this.isScheduled) return 'not_scheduled';
  if (!this.schedule?.nextRun) return 'schedule_error';
  if (this.schedule.nextRun < new Date()) return 'overdue';
  return 'scheduled';
});

const Report = mongoose.model<IReport>('Report', reportSchema);

export default Report;