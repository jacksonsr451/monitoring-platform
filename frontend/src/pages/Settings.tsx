import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Storage as StorageIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface SystemSettings {
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
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  createdAt: string;
  lastUsed?: string;
  isActive: boolean;
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState<SystemSettings>({
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
  
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [apiKeyDialog, setApiKeyDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState({ name: '', permissions: [] as string[] });

  const availablePermissions = [
    'read:articles',
    'write:articles',
    'read:sources',
    'write:sources',
    'read:dashboard',
    'admin:settings'
  ];

  useEffect(() => {
    loadSettings();
    loadApiKeys();
  }, []);

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:3001/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/settings');
      setSettings(data);
    } catch (err) {
      setError('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeys = async () => {
    try {
      const data = await apiCall('/settings/api-keys');
      setApiKeys(data.apiKeys || []);
    } catch (err) {
      console.error('Erro ao carregar chaves API:', err);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      await apiCall('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      setSuccess('Configurações salvas com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erro ao salvar configurações');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    try {
      const data = await apiCall('/settings/api-keys', {
        method: 'POST',
        body: JSON.stringify(newApiKey)
      });
      setApiKeys([...apiKeys, data.apiKey]);
      setApiKeyDialog(false);
      setNewApiKey({ name: '', permissions: [] });
      setSuccess('Chave API criada com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erro ao criar chave API');
      setTimeout(() => setError(''), 3000);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      await apiCall(`/settings/api-keys/${keyId}`, { method: 'DELETE' });
      setApiKeys(apiKeys.filter(key => key.id !== keyId));
      setSuccess('Chave API removida com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erro ao remover chave API');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const updateSettings = (section: keyof SystemSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const renderGeneralSettings = () => (
    <Card sx={{ border: '2px solid #000' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon /> Configurações Gerais
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            fullWidth
            label="Nome do Site"
            value={settings.general.siteName}
            onChange={(e) => updateSettings('general', 'siteName', e.target.value)}
          />
          <TextField
            fullWidth
            label="Descrição do Site"
            multiline
            rows={2}
            value={settings.general.siteDescription}
            onChange={(e) => updateSettings('general', 'siteDescription', e.target.value)}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl sx={{ flex: 1 }}>
              <InputLabel>Idioma</InputLabel>
              <Select
                value={settings.general.language}
                onChange={(e) => updateSettings('general', 'language', e.target.value)}
              >
                <MenuItem value="pt-BR">Português (Brasil)</MenuItem>
                <MenuItem value="en-US">English (US)</MenuItem>
                <MenuItem value="es-ES">Español</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ flex: 1 }}>
              <InputLabel>Fuso Horário</InputLabel>
              <Select
                value={settings.general.timezone}
                onChange={(e) => updateSettings('general', 'timezone', e.target.value)}
              >
                <MenuItem value="America/Sao_Paulo">São Paulo (GMT-3)</MenuItem>
                <MenuItem value="America/New_York">New York (GMT-5)</MenuItem>
                <MenuItem value="Europe/London">London (GMT+0)</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={settings.general.maintenanceMode}
                onChange={(e) => updateSettings('general', 'maintenanceMode', e.target.checked)}
              />
            }
            label="Modo de Manutenção"
          />
        </Box>
      </CardContent>
    </Card>
  );

  const renderScrapingSettings = () => (
    <Card sx={{ border: '2px solid #000' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RefreshIcon /> Configurações de Scraping
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Frequência Padrão (minutos)"
              type="number"
              value={settings.scraping.defaultFrequency}
              onChange={(e) => updateSettings('scraping', 'defaultFrequency', Number(e.target.value))}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Max Jobs Simultâneos"
              type="number"
              value={settings.scraping.maxConcurrentJobs}
              onChange={(e) => updateSettings('scraping', 'maxConcurrentJobs', Number(e.target.value))}
              sx={{ flex: 1 }}
            />
          </Box>
          <TextField
            fullWidth
            label="User Agent"
            value={settings.scraping.userAgent}
            onChange={(e) => updateSettings('scraping', 'userAgent', e.target.value)}
          />
          <TextField
            label="Delay Padrão (ms)"
            type="number"
            value={settings.scraping.defaultDelay}
            onChange={(e) => updateSettings('scraping', 'defaultDelay', Number(e.target.value))}
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.scraping.respectRobotsTxt}
                onChange={(e) => updateSettings('scraping', 'respectRobotsTxt', e.target.checked)}
              />
            }
            label="Respeitar robots.txt"
          />
        </Box>
      </CardContent>
    </Card>
  );

  const renderNotificationSettings = () => (
    <Card sx={{ border: '2px solid #000' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationsIcon /> Configurações de Notificações
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.notifications.emailEnabled}
                onChange={(e) => updateSettings('notifications', 'emailEnabled', e.target.checked)}
              />
            }
            label="Notificações por Email"
          />
          {settings.notifications.emailEnabled && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pl: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Host SMTP"
                  value={settings.notifications.emailHost}
                  onChange={(e) => updateSettings('notifications', 'emailHost', e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Porta"
                  type="number"
                  value={settings.notifications.emailPort}
                  onChange={(e) => updateSettings('notifications', 'emailPort', Number(e.target.value))}
                  sx={{ width: 120 }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Usuário"
                  value={settings.notifications.emailUser}
                  onChange={(e) => updateSettings('notifications', 'emailUser', e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Senha"
                  type="password"
                  value={settings.notifications.emailPassword}
                  onChange={(e) => updateSettings('notifications', 'emailPassword', e.target.value)}
                  sx={{ flex: 1 }}
                />
              </Box>
            </Box>
          )}
          <Divider />
          <FormControlLabel
            control={
              <Switch
                checked={settings.notifications.webhookEnabled}
                onChange={(e) => updateSettings('notifications', 'webhookEnabled', e.target.checked)}
              />
            }
            label="Webhook"
          />
          {settings.notifications.webhookEnabled && (
            <TextField
              fullWidth
              label="URL do Webhook"
              value={settings.notifications.webhookUrl}
              onChange={(e) => updateSettings('notifications', 'webhookUrl', e.target.value)}
              sx={{ pl: 2 }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );

  const renderSecuritySettings = () => (
    <Card sx={{ border: '2px solid #000' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SecurityIcon /> Configurações de Segurança
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Timeout da Sessão (horas)"
              type="number"
              value={settings.security.sessionTimeout}
              onChange={(e) => updateSettings('security', 'sessionTimeout', Number(e.target.value))}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Max Tentativas de Login"
              type="number"
              value={settings.security.maxLoginAttempts}
              onChange={(e) => updateSettings('security', 'maxLoginAttempts', Number(e.target.value))}
              sx={{ flex: 1 }}
            />
          </Box>
          <TextField
            label="Tamanho Mínimo da Senha"
            type="number"
            value={settings.security.passwordMinLength}
            onChange={(e) => updateSettings('security', 'passwordMinLength', Number(e.target.value))}
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.security.requireSpecialChars}
                onChange={(e) => updateSettings('security', 'requireSpecialChars', e.target.checked)}
              />
            }
            label="Exigir caracteres especiais na senha"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.security.twoFactorEnabled}
                onChange={(e) => updateSettings('security', 'twoFactorEnabled', e.target.checked)}
              />
            }
            label="Autenticação de dois fatores"
          />
        </Box>
      </CardContent>
    </Card>
  );

  const renderStorageSettings = () => (
    <Card sx={{ border: '2px solid #000' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorageIcon /> Configurações de Armazenamento
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Idade Máxima dos Artigos (dias)"
            type="number"
            value={settings.storage.maxArticleAge}
            onChange={(e) => updateSettings('storage', 'maxArticleAge', Number(e.target.value))}
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.storage.autoCleanup}
                onChange={(e) => updateSettings('storage', 'autoCleanup', e.target.checked)}
              />
            }
            label="Limpeza automática"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.storage.backupEnabled}
                onChange={(e) => updateSettings('storage', 'backupEnabled', e.target.checked)}
              />
            }
            label="Backup automático"
          />
          {settings.storage.backupEnabled && (
            <FormControl sx={{ pl: 2 }}>
              <InputLabel>Frequência do Backup</InputLabel>
              <Select
                value={settings.storage.backupFrequency}
                onChange={(e) => updateSettings('storage', 'backupFrequency', e.target.value)}
              >
                <MenuItem value="daily">Diário</MenuItem>
                <MenuItem value="weekly">Semanal</MenuItem>
                <MenuItem value="monthly">Mensal</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  const renderApiKeys = () => (
    <Card sx={{ border: '2px solid #000' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Chaves API</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setApiKeyDialog(true)}
          >
            Nova Chave
          </Button>
        </Box>
        <List>
          {apiKeys.map((apiKey) => (
            <ListItem key={apiKey.id} divider>
              <ListItemText
                primary={apiKey.name}
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Criada em: {new Date(apiKey.createdAt).toLocaleDateString()}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      {apiKey.permissions.map((permission) => (
                        <Chip
                          key={permission}
                          label={permission}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => deleteApiKey(apiKey.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  if (user?.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Acesso negado. Apenas administradores podem acessar as configurações.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Configurações do Sistema
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Geral" />
          <Tab label="Scraping" />
          <Tab label="Notificações" />
          <Tab label="Segurança" />
          <Tab label="Armazenamento" />
          <Tab label="API Keys" />
        </Tabs>
      </Box>

      <Box sx={{ mb: 3 }}>
        {tabValue === 0 && renderGeneralSettings()}
        {tabValue === 1 && renderScrapingSettings()}
        {tabValue === 2 && renderNotificationSettings()}
        {tabValue === 3 && renderSecuritySettings()}
        {tabValue === 4 && renderStorageSettings()}
        {tabValue === 5 && renderApiKeys()}
      </Box>

      {tabValue < 5 && (
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveSettings}
            disabled={loading}
          >
            Salvar Configurações
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadSettings}
            disabled={loading}
          >
            Recarregar
          </Button>
        </Box>
      )}

      {/* Dialog para criar nova chave API */}
      <Dialog open={apiKeyDialog} onClose={() => setApiKeyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova Chave API</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Nome da Chave"
              value={newApiKey.name}
              onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Permissões</InputLabel>
              <Select
                multiple
                value={newApiKey.permissions}
                onChange={(e) => setNewApiKey({ ...newApiKey, permissions: e.target.value as string[] })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {availablePermissions.map((permission) => (
                  <MenuItem key={permission} value={permission}>
                    {permission}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApiKeyDialog(false)}>Cancelar</Button>
          <Button
            onClick={createApiKey}
            variant="contained"
            disabled={!newApiKey.name || newApiKey.permissions.length === 0}
          >
            Criar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;