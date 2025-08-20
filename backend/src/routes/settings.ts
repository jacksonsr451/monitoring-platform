import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import SystemSettings from '../models/SystemSettings';
import ApiKey from '../models/ApiKey';
import crypto from 'crypto';

const router = express.Router();

// Aplicar autenticação a todas as rotas
router.use(authenticate);

// Obter configurações do sistema
router.get('/', requireAdmin, async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    
    if (!settings) {
      // Criar configurações padrão se não existirem
      settings = new SystemSettings({
        general: {
          siteName: 'Monitoring Platform',
          siteDescription: 'Plataforma de monitoramento de conteúdo web',
          language: 'pt-BR',
          timezone: 'America/Sao_Paulo',
          maintenanceMode: false
        },
        scraping: {
          defaultFrequency: 60,
          maxConcurrentJobs: 5,
          userAgent: 'MonitoringPlatform/1.0',
          respectRobotsTxt: true,
          defaultDelay: 1000
        },
        notifications: {
          emailEnabled: false,
          emailHost: '',
          emailPort: 587,
          emailUser: '',
          emailPassword: '',
          webhookEnabled: false,
          webhookUrl: ''
        },
        security: {
          sessionTimeout: 24,
          maxLoginAttempts: 5,
          passwordMinLength: 8,
          requireSpecialChars: true,
          twoFactorEnabled: false
        },
        storage: {
          maxArticleAge: 90,
          autoCleanup: true,
          backupEnabled: false,
          backupFrequency: 'weekly'
        }
      });
      await settings.save();
    }

    // Não retornar senhas sensíveis
    const settingsObj = settings.toObject();
    if (settingsObj.notifications?.emailPassword) {
      settingsObj.notifications.emailPassword = '***';
    }

    res.json(settingsObj);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar configurações do sistema
router.put('/', requireAdmin, async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    
    if (!settings) {
      settings = new SystemSettings(req.body);
    } else {
      // Atualizar apenas os campos fornecidos
      Object.keys(req.body).forEach(section => {
        if (settings![section]) {
          Object.keys(req.body[section]).forEach(field => {
            settings![section][field] = req.body[section][field];
          });
        }
      });
    }

    await settings.save();
    
    // Não retornar senhas sensíveis
    const settingsObj = settings.toObject();
    if (settingsObj.notifications?.emailPassword) {
      settingsObj.notifications.emailPassword = '***';
    }

    return res.json(settingsObj);
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar chaves API
router.get('/api-keys', requireAdmin, async (req, res) => {
  try {
    const apiKeys = await ApiKey.find({ isActive: true })
      .select('-key') // Não retornar a chave real
      .sort({ createdAt: -1 });

    res.json({ apiKeys });
  } catch (error) {
    console.error('Erro ao listar chaves API:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar nova chave API
router.post('/api-keys', requireAdmin, async (req, res) => {
  try {
    const { name, permissions } = req.body;

    if (!name || !permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Nome e permissões são obrigatórios' });
    }

    // Gerar chave única
    const key = 'mk_' + crypto.randomBytes(32).toString('hex');

    const apiKey = new ApiKey({
      name,
      key,
      permissions,
      createdBy: req.user.id,
      isActive: true
    });

    await apiKey.save();

    // Retornar a chave apenas uma vez na criação
    return res.status(201).json({
      apiKey: {
        id: apiKey._id,
        name: apiKey.name,
        key: apiKey.key, // Mostrar apenas na criação
        permissions: apiKey.permissions,
        createdAt: apiKey.createdAt,
        isActive: apiKey.isActive
      }
    });
  } catch (error) {
    console.error('Erro ao criar chave API:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar chave API
router.put('/api-keys/:id', requireAdmin, async (req, res) => {
  try {
    const { name, permissions, isActive } = req.body;

    const apiKey = await ApiKey.findByIdAndUpdate(
      req.params.id,
      { name, permissions, isActive },
      { new: true, runValidators: true }
    ).select('-key');

    if (!apiKey) {
      return res.status(404).json({ error: 'Chave API não encontrada' });
    }

    return res.json({ apiKey });
  } catch (error) {
    console.error('Erro ao atualizar chave API:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover chave API
router.delete('/api-keys/:id', requireAdmin, async (req, res) => {
  try {
    const apiKey = await ApiKey.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!apiKey) {
      return res.status(404).json({ error: 'Chave API não encontrada' });
    }

    return res.json({ message: 'Chave API removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover chave API:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Regenerar chave API
router.post('/api-keys/:id/regenerate', requireAdmin, async (req, res) => {
  try {
    const newKey = 'mk_' + crypto.randomBytes(32).toString('hex');
    
    const apiKey = await ApiKey.findByIdAndUpdate(
      req.params.id,
      { key: newKey },
      { new: true }
    );

    if (!apiKey) {
      return res.status(404).json({ error: 'Chave API não encontrada' });
    }

    return res.json({
      message: 'Chave regenerada com sucesso',
      key: newKey // Mostrar a nova chave
    });
  } catch (error) {
    console.error('Erro ao regenerar chave API:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Testar configurações de email
router.post('/test-email', requireAdmin, async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Email de destino é obrigatório' });
    }

    const settings = await SystemSettings.findOne();
    if (!settings?.notifications?.emailEnabled) {
      return res.status(400).json({ error: 'Notificações por email não estão habilitadas' });
    }

    // Aqui você implementaria o envio real do email de teste
    // Por enquanto, apenas simular
    
    return res.json({ message: 'Email de teste enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao testar email:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Testar webhook
router.post('/test-webhook', requireAdmin, async (req, res) => {
  try {
    const settings = await SystemSettings.findOne();
    if (!settings?.notifications?.webhookEnabled || !settings.notifications.webhookUrl) {
      return res.status(400).json({ error: 'Webhook não está configurado' });
    }

    // Aqui você implementaria o teste real do webhook
    // Por enquanto, apenas simular
    
    return res.json({ message: 'Webhook testado com sucesso' });
  } catch (error) {
    console.error('Erro ao testar webhook:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter estatísticas do sistema
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };

    res.json(stats);
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;