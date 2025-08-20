import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Language as WebIcon,
  Article as ArticleIcon,
  TrendingUp as TrendingIcon,
  Schedule as ScheduleIcon,
  Assessment as StatsIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface WebSource {
  _id: string;
  name: string;
  url: string;
  type: 'news' | 'blog' | 'website' | 'forum';
  category: string;
  description?: string;
  isActive: boolean;
  crawlFrequency: number;
  lastCrawled?: string;
  nextCrawl?: string;
  keywords: string[];
  excludeKeywords: string[];
  language: string;
  statistics: {
    totalArticles: number;
    lastMonthArticles: number;
    avgArticlesPerDay: number;
    successRate: number;
    lastError?: string;
  };
  createdAt: string;
}

interface WebArticle {
  _id: string;
  title: string;
  sourceName: string;
  scrapedAt: string;
  url: string;
  category: string;
  wordCount: number;
  readingTime: number;
  author?: string;
  publishedAt?: string;
  imageUrl?: string;
}

interface DashboardData {
  statistics: {
    totalSources: number;
    activeSources: number;
    totalArticles: number;
    todayArticles: number;
    weekArticles: number;
    avgArticlesPerDay: number;
  };
  articlesByCategory: Array<{ _id: string; count: number }>;
  topSources: Array<{ _id: string; count: number; lastArticle: string }>;
  recentArticles: WebArticle[];
}

const WebMonitoring: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [sources, setSources] = useState<WebSource[]>([]);
  const [articles, setArticles] = useState<WebArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<WebSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { token } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    type: 'website' as 'news' | 'blog' | 'website' | 'forum',
    category: '',
    description: '',
    isActive: true,
    crawlFrequency: 60,
    keywords: '',
    excludeKeywords: '',
    language: 'pt-BR'
  });

  useEffect(() => {
    loadDashboard();
    loadSources();
    loadArticles();
  }, []);

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`http://localhost:3001/api/web-monitoring${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    return response.json();
  };

  const loadDashboard = async () => {
    try {
      const data = await apiCall('/dashboard');
      setDashboard(data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      setError('Erro ao carregar estatísticas');
    }
  };

  const loadSources = async () => {
    try {
      const data = await apiCall('/sources?limit=50');
      setSources(data.sources);
    } catch (error) {
      console.error('Erro ao carregar fontes:', error);
      setError('Erro ao carregar fontes');
    }
  };

  const loadArticles = async () => {
    try {
      const data = await apiCall('/articles?limit=20');
      setArticles(data.articles);
    } catch (error) {
      console.error('Erro ao carregar artigos:', error);
      setError('Erro ao carregar artigos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = () => {
    setEditingSource(null);
    setFormData({
      name: '',
      url: '',
      type: 'website',
      category: '',
      description: '',
      isActive: true,
      crawlFrequency: 60,
      keywords: '',
      excludeKeywords: '',
      language: 'pt-BR'
    });
    setDialogOpen(true);
  };

  const handleEditSource = (source: WebSource) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      url: source.url,
      type: source.type,
      category: source.category,
      description: source.description || '',
      isActive: source.isActive,
      crawlFrequency: source.crawlFrequency,
      keywords: source.keywords.join(', '),
      excludeKeywords: source.excludeKeywords.join(', '),
      language: source.language
    });
    setDialogOpen(true);
  };

  const handleSaveSource = async () => {
    try {
      const sourceData = {
        ...formData,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
        excludeKeywords: formData.excludeKeywords.split(',').map(k => k.trim()).filter(k => k)
      };

      if (editingSource) {
        await apiCall(`/sources/${editingSource._id}`, {
          method: 'PUT',
          body: JSON.stringify(sourceData)
        });
        setSuccess('Fonte atualizada com sucesso!');
      } else {
        await apiCall('/sources', {
          method: 'POST',
          body: JSON.stringify(sourceData)
        });
        setSuccess('Fonte adicionada com sucesso!');
      }

      setDialogOpen(false);
      loadSources();
      loadDashboard();
    } catch (error) {
      console.error('Erro ao salvar fonte:', error);
      setError('Erro ao salvar fonte');
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!window.confirm('Tem certeza que deseja remover esta fonte?')) {
      return;
    }

    try {
      await apiCall(`/sources/${sourceId}`, { method: 'DELETE' });
      setSuccess('Fonte removida com sucesso!');
      loadSources();
      loadDashboard();
    } catch (error) {
      console.error('Erro ao remover fonte:', error);
      setError('Erro ao remover fonte');
    }
  };

  const handleScrapeSource = async (sourceId: string) => {
    try {
      setLoading(true);
      const result = await apiCall(`/sources/${sourceId}/scrape`, { method: 'POST' });
      setSuccess(`Scraping concluído! ${result.result.articlesFound} artigos encontrados.`);
      loadSources();
      loadArticles();
      loadDashboard();
    } catch (error) {
      console.error('Erro no scraping:', error);
      setError('Erro ao fazer scraping da fonte');
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeAll = async () => {
    try {
      setLoading(true);
      const result = await apiCall('/scrape-all', { method: 'POST' });
      setSuccess(`Scraping geral concluído! ${result.result.totalArticles} artigos coletados.`);
      loadSources();
      loadArticles();
      loadDashboard();
    } catch (error) {
      console.error('Erro no scraping geral:', error);
      setError('Erro ao fazer scraping de todas as fontes');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getTypeColor = (type: string) => {
    const colors = {
      news: '#2196F3',
      blog: '#4CAF50',
      website: '#FF9800',
      forum: '#9C27B0'
    };
    return colors[type as keyof typeof colors] || '#757575';
  };

  if (loading && !dashboard) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} sx={{ color: '#000' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#000' }}>
          Monitoramento Web
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleScrapeAll}
            disabled={loading}
            sx={{ mr: 2, borderColor: '#000', color: '#000' }}
          >
            Scraping Geral
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddSource}
            sx={{ bgcolor: '#000', '&:hover': { bgcolor: '#333' } }}
          >
            Adicionar Fonte
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label="Dashboard" icon={<StatsIcon />} />
        <Tab label="Fontes" icon={<WebIcon />} />
        <Tab label="Artigos" icon={<ArticleIcon />} />
      </Tabs>

      {tabValue === 0 && dashboard && (
        <Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <Card sx={{ border: '2px solid #000' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <WebIcon sx={{ mr: 1, color: '#000' }} />
                    <Typography variant="h6">Fontes Ativas</Typography>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#000' }}>
                    {dashboard.statistics.activeSources}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    de {dashboard.statistics.totalSources} total
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <Card sx={{ border: '2px solid #000' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ArticleIcon sx={{ mr: 1, color: '#000' }} />
                    <Typography variant="h6">Artigos Hoje</Typography>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#000' }}>
                    {dashboard.statistics.todayArticles}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboard.statistics.totalArticles} total
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <Card sx={{ border: '2px solid #000' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingIcon sx={{ mr: 1, color: '#000' }} />
                    <Typography variant="h6">Esta Semana</Typography>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#000' }}>
                    {dashboard.statistics.weekArticles}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboard.statistics.avgArticlesPerDay}/dia média
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
              <Card sx={{ border: '2px solid #000' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <ScheduleIcon sx={{ mr: 1, color: '#000' }} />
                    <Typography variant="h6">Média Diária</Typography>
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#000' }}>
                    {dashboard.statistics.avgArticlesPerDay}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    artigos por dia
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: '1 1 400px' }}>
              <Card sx={{ border: '2px solid #000' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Artigos por Categoria
                  </Typography>
                  {dashboard.articlesByCategory.map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>{item._id}</Typography>
                      <Chip label={item.count} size="small" sx={{ bgcolor: '#000', color: '#FBF7EA' }} />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ flex: '1 1 400px' }}>
              <Card sx={{ border: '2px solid #000' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Fontes Mais Produtivas
                  </Typography>
                  {dashboard.topSources.map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>{item._id}</Typography>
                      <Chip label={item.count} size="small" sx={{ bgcolor: '#000', color: '#FBF7EA' }} />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>
      )}

      {tabValue === 1 && (
        <TableContainer component={Paper} sx={{ border: '2px solid #000' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#000' }}>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Nome</TableCell>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Tipo</TableCell>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Categoria</TableCell>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Artigos</TableCell>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Último Scraping</TableCell>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source._id}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {source.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {source.url}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={source.type} 
                      size="small" 
                      sx={{ bgcolor: getTypeColor(source.type), color: 'white' }}
                    />
                  </TableCell>
                  <TableCell>{source.category}</TableCell>
                  <TableCell>
                    <Chip 
                      label={source.isActive ? 'Ativo' : 'Inativo'} 
                      size="small" 
                      color={source.isActive ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{source.statistics.totalArticles}</TableCell>
                  <TableCell>
                    {source.lastCrawled ? formatDate(source.lastCrawled) : 'Nunca'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Fazer Scraping">
                      <IconButton 
                        onClick={() => handleScrapeSource(source._id)}
                        disabled={loading}
                        size="small"
                      >
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton onClick={() => handleEditSource(source)} size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remover">
                      <IconButton 
                        onClick={() => handleDeleteSource(source._id)} 
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tabValue === 2 && (
        <TableContainer component={Paper} sx={{ border: '2px solid #000' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#000' }}>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Título</TableCell>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Fonte</TableCell>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Categoria</TableCell>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Coletado em</TableCell>
                <TableCell sx={{ color: '#FBF7EA', fontWeight: 'bold' }}>Palavras</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {articles.map((article) => (
                <TableRow key={article._id}>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {article.title}
                    </Typography>
                    {article.author && (
                      <Typography variant="caption" color="text.secondary">
                        por {article.author}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{article.sourceName}</TableCell>
                  <TableCell>
                    <Chip label={article.category} size="small" />
                  </TableCell>
                  <TableCell>{formatDate(article.scrapedAt)}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{article.wordCount} palavras</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {article.readingTime} min leitura
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog para adicionar/editar fonte */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSource ? 'Editar Fonte' : 'Adicionar Nova Fonte'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="Nome da Fonte"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Box>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="URL"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
              />
            </Box>
            <Box sx={{ flex: '1 1 200px' }}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <MenuItem value="news">Notícias</MenuItem>
                  <MenuItem value="blog">Blog</MenuItem>
                  <MenuItem value="website">Website</MenuItem>
                  <MenuItem value="forum">Fórum</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 200px' }}>
              <TextField
                fullWidth
                label="Categoria"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              />
            </Box>
            <Box sx={{ flex: '1 1 200px' }}>
              <TextField
                fullWidth
                label="Frequência (minutos)"
                type="number"
                value={formData.crawlFrequency}
                onChange={(e) => setFormData({ ...formData, crawlFrequency: Number(e.target.value) })}
                required
              />
            </Box>
            <Box sx={{ width: '100%' }}>
              <TextField
                fullWidth
                label="Descrição"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Box>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="Palavras-chave (separadas por vírgula)"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                helperText="Ex: tecnologia, inovação, startup"
              />
            </Box>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="Palavras de exclusão (separadas por vírgula)"
                value={formData.excludeKeywords}
                onChange={(e) => setFormData({ ...formData, excludeKeywords: e.target.value })}
                helperText="Artigos com essas palavras serão ignorados"
              />
            </Box>
            <Box sx={{ width: '100%' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Fonte ativa"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleSaveSource} 
            variant="contained"
            sx={{ bgcolor: '#000', '&:hover': { bgcolor: '#333' } }}
          >
            {editingSource ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WebMonitoring;