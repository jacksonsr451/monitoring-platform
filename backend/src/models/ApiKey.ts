import mongoose, { Document, Schema } from 'mongoose';

export interface IApiKey extends Document {
  name: string;
  key: string;
  permissions: string[];
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  lastUsed?: Date;
  usageCount: number;
  rateLimit: {
    requestsPerHour: number;
    requestsPerDay: number;
  };
  restrictions: {
    allowedIPs?: string[];
    allowedDomains?: string[];
  };
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  permissions: [{
    type: String,
    enum: [
      'read:articles',
      'write:articles',
      'delete:articles',
      'read:sources',
      'write:sources',
      'delete:sources',
      'read:dashboard',
      'read:reports',
      'write:reports',
      'admin:settings',
      'admin:users',
      'scraping:manual',
      'scraping:schedule'
    ]
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date
  },
  usageCount: {
    type: Number,
    default: 0
  },
  rateLimit: {
    requestsPerHour: {
      type: Number,
      default: 1000,
      min: 1,
      max: 10000
    },
    requestsPerDay: {
      type: Number,
      default: 10000,
      min: 1,
      max: 100000
    }
  },
  restrictions: {
    allowedIPs: [{
      type: String,
      validate: {
        validator: function(v: string) {
          // Validação básica de IP (IPv4 e IPv6)
          const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
          return ipv4Regex.test(v) || ipv6Regex.test(v);
        },
        message: 'IP inválido'
      }
    }],
    allowedDomains: [{
      type: String,
      validate: {
        validator: function(v: string) {
          // Validação básica de domínio
          return /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(v);
        },
        message: 'Domínio inválido'
      }
    }]
  },
  expiresAt: {
    type: Date,
    validate: {
      validator: function(v: Date) {
        return !v || v > new Date();
      },
      message: 'Data de expiração deve ser no futuro'
    }
  }
}, {
  timestamps: true
});

// Middleware para validar permissões
ApiKeySchema.pre('save', function(next): void {
  if ((this as any).permissions.length === 0) {
    return next(new Error('Pelo menos uma permissão deve ser especificada'));
  }
  next();
});

// Método para verificar se a chave tem uma permissão específica
ApiKeySchema.methods.hasPermission = function(permission: string): boolean {
  return this.permissions.includes(permission);
};

// Método para verificar se a chave tem múltiplas permissões
ApiKeySchema.methods.hasPermissions = function(permissions: string[]): boolean {
  return permissions.every(permission => this.permissions.includes(permission));
};

// Método para verificar se a chave está válida
ApiKeySchema.methods.isValid = function(): boolean {
  if (!this.isActive) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
};

// Método para verificar restrições de IP
ApiKeySchema.methods.isIPAllowed = function(ip: string): boolean {
  if (!this.restrictions.allowedIPs || this.restrictions.allowedIPs.length === 0) {
    return true; // Sem restrições de IP
  }
  return this.restrictions.allowedIPs.includes(ip);
};

// Método para verificar restrições de domínio
ApiKeySchema.methods.isDomainAllowed = function(domain: string): boolean {
  if (!this.restrictions.allowedDomains || this.restrictions.allowedDomains.length === 0) {
    return true; // Sem restrições de domínio
  }
  return this.restrictions.allowedDomains.includes(domain);
};

// Método para registrar uso da chave
ApiKeySchema.methods.recordUsage = function(): Promise<IApiKey> {
  this.lastUsed = new Date();
  this.usageCount += 1;
  return this.save();
};

// Método para obter estatísticas de uso
ApiKeySchema.methods.getUsageStats = async function() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Aqui você implementaria a lógica para contar usos por período
  // Por enquanto, retornar dados básicos
  return {
    totalUsage: this.usageCount,
    lastUsed: this.lastUsed,
    isActive: this.isActive,
    isExpired: this.expiresAt && this.expiresAt < now
  };
};

// Índices para performance
ApiKeySchema.index({ key: 1 }, { unique: true });
ApiKeySchema.index({ createdBy: 1 });
ApiKeySchema.index({ isActive: 1 });
ApiKeySchema.index({ expiresAt: 1 });
ApiKeySchema.index({ lastUsed: -1 });

// Índice TTL para chaves expiradas
ApiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ApiKey = mongoose.model<IApiKey>('ApiKey', ApiKeySchema);

export default ApiKey;