import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemSettings extends Document {
  general: {
    siteName: string;
    siteDescription: string;
    language: string;
    timezone: string;
    maintenanceMode: boolean;
  };
  scraping: {
    defaultFrequency: number;
    maxConcurrentJobs: number;
    userAgent: string;
    respectRobotsTxt: boolean;
    defaultDelay: number;
  };
  notifications: {
    emailEnabled: boolean;
    emailHost: string;
    emailPort: number;
    emailUser: string;
    emailPassword: string;
    webhookEnabled: boolean;
    webhookUrl: string;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordMinLength: number;
    requireSpecialChars: boolean;
    twoFactorEnabled: boolean;
  };
  storage: {
    maxArticleAge: number;
    autoCleanup: boolean;
    backupEnabled: boolean;
    backupFrequency: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SystemSettingsSchema: Schema = new Schema({
  general: {
    siteName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      default: 'Monitoring Platform'
    },
    siteDescription: {
      type: String,
      trim: true,
      maxlength: 500,
      default: 'Plataforma de monitoramento de conteúdo web'
    },
    language: {
      type: String,
      enum: ['pt-BR', 'en-US', 'es-ES'],
      default: 'pt-BR'
    },
    timezone: {
      type: String,
      default: 'America/Sao_Paulo'
    },
    maintenanceMode: {
      type: Boolean,
      default: false
    }
  },
  scraping: {
    defaultFrequency: {
      type: Number,
      min: 5,
      max: 1440,
      default: 60
    },
    maxConcurrentJobs: {
      type: Number,
      min: 1,
      max: 20,
      default: 5
    },
    userAgent: {
      type: String,
      required: true,
      default: 'MonitoringPlatform/1.0'
    },
    respectRobotsTxt: {
      type: Boolean,
      default: true
    },
    defaultDelay: {
      type: Number,
      min: 100,
      max: 10000,
      default: 1000
    }
  },
  notifications: {
    emailEnabled: {
      type: Boolean,
      default: false
    },
    emailHost: {
      type: String,
      trim: true
    },
    emailPort: {
      type: Number,
      min: 1,
      max: 65535,
      default: 587
    },
    emailUser: {
      type: String,
      trim: true
    },
    emailPassword: {
      type: String
    },
    webhookEnabled: {
      type: Boolean,
      default: false
    },
    webhookUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // Permitir vazio
          return /^https?:\/\/.+/.test(v);
        },
        message: 'URL do webhook deve ser uma URL válida'
      }
    }
  },
  security: {
    sessionTimeout: {
      type: Number,
      min: 1,
      max: 168, // 1 semana
      default: 24
    },
    maxLoginAttempts: {
      type: Number,
      min: 3,
      max: 10,
      default: 5
    },
    passwordMinLength: {
      type: Number,
      min: 6,
      max: 50,
      default: 8
    },
    requireSpecialChars: {
      type: Boolean,
      default: true
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    }
  },
  storage: {
    maxArticleAge: {
      type: Number,
      min: 1,
      max: 365,
      default: 90
    },
    autoCleanup: {
      type: Boolean,
      default: true
    },
    backupEnabled: {
      type: Boolean,
      default: false
    },
    backupFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    }
  }
}, {
  timestamps: true
});

// Middleware para criptografar senha do email antes de salvar
SystemSettingsSchema.pre('save', function(next): void {
  if ((this as any).isModified('notifications.emailPassword') && (this as any).notifications.emailPassword) {
    // Aqui você pode implementar criptografia da senha
    // Por enquanto, manter como está para simplicidade
  }
  next();
});

// Método para validar configurações
SystemSettingsSchema.methods.validateSettings = function(): string[] {
  const errors: string[] = [];
  
  if (this.notifications.emailEnabled) {
    if (!this.notifications.emailHost) {
      errors.push('Host do email é obrigatório quando notificações por email estão habilitadas');
    }
    if (!this.notifications.emailUser) {
      errors.push('Usuário do email é obrigatório quando notificações por email estão habilitadas');
    }
    if (!this.notifications.emailPassword) {
      errors.push('Senha do email é obrigatória quando notificações por email estão habilitadas');
    }
  }
  
  if (this.notifications.webhookEnabled && !this.notifications.webhookUrl) {
    errors.push('URL do webhook é obrigatória quando webhook está habilitado');
  }
  
  return errors;
};

// Método para obter configurações públicas (sem dados sensíveis)
SystemSettingsSchema.methods.getPublicSettings = function(): any {
  const settings = this.toObject();
  
  // Remover dados sensíveis
  if (settings.notifications) {
    delete settings.notifications.emailPassword;
  }
  
  return settings;
};

// Índices
SystemSettingsSchema.index({ 'general.siteName': 1 });
SystemSettingsSchema.index({ createdAt: -1 });

const SystemSettings = mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);

export default SystemSettings;