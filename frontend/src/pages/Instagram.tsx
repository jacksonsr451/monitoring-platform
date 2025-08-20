import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Instagram as InstagramIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Comment as CommentIcon,
  Favorite as FavoriteIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface InstagramProfile {
  _id: string;
  username: string;
  displayName: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  profilePicture?: string;
  isVerified: boolean;
  isPrivate: boolean;
  tags: string[];
  lastScrapedAt: string;
  createdAt: string;
}

interface InstagramPost {
  _id: string;
  postId: string;
  username: string;
  type: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  postedAt: string;
  hashtags: string[];
  engagementRate: number;
}

interface DashboardData {
  overview: {
    totalProfiles: number;
    totalPosts: number;
    totalComments: number;
    totalLikes: number;
    totalFollowers: number;
  };
  topProfiles: InstagramProfile[];
  topPosts: InstagramPost[];
  sentimentAnalysis: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

const Instagram: React.FC = () => {
  const { token } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [profiles, setProfiles] = useState<InstagramProfile[]>([]);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newProfile, setNewProfile] = useState({
    username: '',
    displayName: '',
    bio: '',
    tags: ''
  });

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`http://localhost:3001/api/instagram${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro na requisição');
    }

    return response.json();
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/dashboard');
      setDashboardData(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/profiles');
      setProfiles(data.data.profiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar perfis');
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/posts');
      setPosts(data.data.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar posts');
    } finally {
      setLoading(false);
    }
  };

  const addProfile = async () => {
    try {
      setLoading(true);
      const profileData = {
        ...newProfile,
        tags: newProfile.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      
      await apiCall('/profiles', {
        method: 'POST',
        body: JSON.stringify(profileData)
      });
      
      setOpenDialog(false);
      setNewProfile({ username: '', displayName: '', bio: '', tags: '' });
      loadProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar perfil');
    } finally {
      setLoading(false);
    }
  };

  const removeProfile = async (username: string) => {
    try {
      setLoading(true);
      await apiCall(`/profiles/${username}`, { method: 'DELETE' });
      loadProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover perfil');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (username: string) => {
    try {
      setLoading(true);
      await apiCall(`/profiles/${username}/update`, { method: 'PUT' });
      loadProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tabValue === 0) {
      loadDashboard();
    } else if (tabValue === 1) {
      loadProfiles();
    } else if (tabValue === 2) {
      loadPosts();
    }
  }, [tabValue]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const renderDashboard = () => (
    <Box>
      {dashboardData && (
        <>
          {/* Métricas Gerais */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ bgcolor: '#FBF7EA', border: '1px solid #000' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PersonIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">Perfis</Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {dashboardData.overview.totalProfiles}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ bgcolor: '#FBF7EA', border: '1px solid #000' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <InstagramIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">Posts</Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {dashboardData.overview.totalPosts}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ bgcolor: '#FBF7EA', border: '1px solid #000' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FavoriteIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">Curtidas</Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {formatNumber(dashboardData.overview.totalLikes)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ bgcolor: '#FBF7EA', border: '1px solid #000' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUpIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">Seguidores</Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {formatNumber(dashboardData.overview.totalFollowers)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Top Perfis e Posts */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#FBF7EA', border: '1px solid #000' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Top Perfis por Seguidores
                  </Typography>
                  {dashboardData.topProfiles.slice(0, 5).map((profile) => (
                    <Box key={profile._id} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar src={profile.profilePicture} sx={{ mr: 2 }}>
                        {profile.displayName[0]}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          @{profile.username}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatNumber(profile.followersCount)} seguidores
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#FBF7EA', border: '1px solid #000' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                    Análise de Sentimentos
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Positivos</Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(dashboardData.sentimentAnalysis.positive / dashboardData.overview.totalComments) * 100}
                      sx={{ mb: 1, bgcolor: '#e0e0e0', '& .MuiLinearProgress-bar': { bgcolor: '#4caf50' } }}
                    />
                    <Typography variant="caption">{dashboardData.sentimentAnalysis.positive} comentários</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2">Neutros</Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(dashboardData.sentimentAnalysis.neutral / dashboardData.overview.totalComments) * 100}
                      sx={{ mb: 1, bgcolor: '#e0e0e0', '& .MuiLinearProgress-bar': { bgcolor: '#ff9800' } }}
                    />
                    <Typography variant="caption">{dashboardData.sentimentAnalysis.neutral} comentários</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2">Negativos</Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(dashboardData.sentimentAnalysis.negative / dashboardData.overview.totalComments) * 100}
                      sx={{ mb: 1, bgcolor: '#e0e0e0', '& .MuiLinearProgress-bar': { bgcolor: '#f44336' } }}
                    />
                    <Typography variant="caption">{dashboardData.sentimentAnalysis.negative} comentários</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );

  const renderProfiles = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Perfis Monitorados
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ bgcolor: '#000', color: '#FBF7EA', '&:hover': { bgcolor: '#333' } }}
        >
          Adicionar Perfil
        </Button>
      </Box>

      <Grid container spacing={3}>
        {profiles.map((profile) => (
          <Grid key={profile._id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ bgcolor: '#FBF7EA', border: '1px solid #000' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar src={profile.profilePicture} sx={{ mr: 2 }}>
                    {profile.displayName[0]}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      @{profile.username}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {profile.displayName}
                    </Typography>
                  </Box>
                  {profile.isVerified && (
                    <Chip label="Verificado" size="small" color="primary" />
                  )}
                </Box>
                
                {profile.bio && (
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {profile.bio}
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatNumber(profile.followersCount)}
                    </Typography>
                    <Typography variant="caption">Seguidores</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatNumber(profile.followingCount)}
                    </Typography>
                    <Typography variant="caption">Seguindo</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {profile.postsCount}
                    </Typography>
                    <Typography variant="caption">Posts</Typography>
                  </Box>
                </Box>
                
                {profile.tags.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    {profile.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    ))}
                  </Box>
                )}
                
                <Typography variant="caption" color="text.secondary">
                  Última atualização: {formatDate(profile.lastScrapedAt)}
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <IconButton 
                    size="small" 
                    onClick={() => updateProfile(profile.username)}
                    disabled={loading}
                  >
                    <RefreshIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => removeProfile(profile.username)}
                    disabled={loading}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderPosts = () => (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
        Posts Recentes
      </Typography>
      
      <TableContainer component={Paper} sx={{ bgcolor: '#FBF7EA', border: '1px solid #000' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Usuário</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Curtidas</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Comentários</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Data</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Hashtags</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {posts.map((post) => (
              <TableRow key={post._id}>
                <TableCell>@{post.username}</TableCell>
                <TableCell>
                  <Chip label={post.type} size="small" />
                </TableCell>
                <TableCell>{formatNumber(post.likesCount)}</TableCell>
                <TableCell>{formatNumber(post.commentsCount)}</TableCell>
                <TableCell>{formatDate(post.postedAt)}</TableCell>
                <TableCell>
                  {post.hashtags.slice(0, 3).map((tag) => (
                    <Chip key={tag} label={`#${tag}`} size="small" sx={{ mr: 0.5 }} />
                  ))}
                  {post.hashtags.length > 3 && (
                    <Typography variant="caption">+{post.hashtags.length - 3}</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3, color: '#000' }}>
        Monitoramento Instagram
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      <Tabs 
        value={tabValue} 
        onChange={(_, newValue) => setTabValue(newValue)}
        sx={{ mb: 3, borderBottom: '1px solid #000' }}
      >
        <Tab label="Dashboard" />
        <Tab label="Perfis" />
        <Tab label="Posts" />
      </Tabs>

      {tabValue === 0 && renderDashboard()}
      {tabValue === 1 && renderProfiles()}
      {tabValue === 2 && renderPosts()}

      {/* Dialog para adicionar perfil */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Perfil para Monitoramento</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Username (sem @)"
            value={newProfile.username}
            onChange={(e) => setNewProfile({ ...newProfile, username: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Nome de Exibição"
            value={newProfile.displayName}
            onChange={(e) => setNewProfile({ ...newProfile, displayName: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Bio"
            value={newProfile.bio}
            onChange={(e) => setNewProfile({ ...newProfile, bio: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
          <TextField
            fullWidth
            label="Tags (separadas por vírgula)"
            value={newProfile.tags}
            onChange={(e) => setNewProfile({ ...newProfile, tags: e.target.value })}
            margin="normal"
            helperText="Ex: influencer, moda, lifestyle"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button 
            onClick={addProfile} 
            variant="contained"
            disabled={!newProfile.username || !newProfile.displayName || loading}
            sx={{ bgcolor: '#000', color: '#FBF7EA', '&:hover': { bgcolor: '#333' } }}
          >
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Instagram;