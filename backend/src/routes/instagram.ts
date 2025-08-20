import express from 'express';
import instagramService from '../services/instagramService';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticate);

// Rotas para Perfis

// GET /api/instagram/profiles - Listar perfis monitorados
router.get('/profiles', async (req, res) => {
  try {
    const {
      isActive,
      tags,
      minFollowers,
      maxFollowers,
      limit,
      page
    } = req.query;

    const filters: any = {};
    
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }
    
    if (tags) {
      filters.tags = Array.isArray(tags) ? tags : [tags];
    }
    
    if (minFollowers) {
      filters.minFollowers = parseInt(minFollowers as string);
    }
    
    if (maxFollowers) {
      filters.maxFollowers = parseInt(maxFollowers as string);
    }
    
    if (limit) {
      filters.limit = parseInt(limit as string);
    }
    
    if (page) {
      filters.page = parseInt(page as string);
    }

    const result = await instagramService.getProfiles(filters);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// POST /api/instagram/profiles - Adicionar perfil para monitoramento
router.post('/profiles', async (req, res) => {
  try {
    const {
      username,
      displayName,
      bio,
      followersCount,
      followingCount,
      postsCount,
      profilePicture,
      isVerified,
      isPrivate,
      externalUrl,
      category,
      contactInfo,
      location,
      tags,
      notes
    } = req.body;

    if (!username || !displayName) {
      return res.status(400).json({
        success: false,
        message: 'Username e displayName são obrigatórios'
      });
    }

    const profileData = {
      username: username.toLowerCase().trim(),
      displayName: displayName.trim(),
      bio,
      followersCount: followersCount || 0,
      followingCount: followingCount || 0,
      postsCount: postsCount || 0,
      profilePicture,
      isVerified: isVerified || false,
      isPrivate: isPrivate || false,
      externalUrl,
      category,
      contactInfo,
      location,
      tags: tags || [],
      notes
    };

    const result = await instagramService.addProfile(profileData);
    
    if (result.success) {
      return res.status(201).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET /api/instagram/profiles/:username/stats - Obter estatísticas de um perfil
router.get('/profiles/:username/stats', async (req, res) => {
  try {
    const { username } = req.params;
    
    const result = await instagramService.getProfileStats(username);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// PUT /api/instagram/profiles/:username/update - Atualizar dados do perfil
router.put('/profiles/:username/update', async (req, res) => {
  try {
    const { username } = req.params;
    
    const result = await instagramService.updateProfile(username);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// DELETE /api/instagram/profiles/:username - Remover perfil do monitoramento
router.delete('/profiles/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const result = await instagramService.removeProfile(username);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rotas para Posts

// GET /api/instagram/posts - Listar posts
router.get('/posts', async (req, res) => {
  try {
    const {
      username,
      type,
      startDate,
      endDate,
      minLikes,
      hashtags,
      limit,
      page
    } = req.query;

    const filters: any = {};
    
    if (username) {
      filters.username = username;
    }
    
    if (type) {
      filters.type = type;
    }
    
    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }
    
    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }
    
    if (minLikes) {
      filters.minLikes = parseInt(minLikes as string);
    }
    
    if (hashtags) {
      filters.hashtags = Array.isArray(hashtags) ? hashtags : [hashtags];
    }
    
    if (limit) {
      filters.limit = parseInt(limit as string);
    }
    
    if (page) {
      filters.page = parseInt(page as string);
    }

    const result = await instagramService.getPosts(filters);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rotas para Comentários

// GET /api/instagram/comments - Listar comentários
router.get('/comments', async (req, res) => {
  try {
    const {
      postId,
      username,
      sentiment,
      startDate,
      endDate,
      limit,
      page
    } = req.query;

    const filters: any = {};
    
    if (postId) {
      filters.postId = postId;
    }
    
    if (username) {
      filters.username = username;
    }
    
    if (sentiment) {
      filters.sentiment = sentiment;
    }
    
    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }
    
    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }
    
    if (limit) {
      filters.limit = parseInt(limit as string);
    }
    
    if (page) {
      filters.page = parseInt(page as string);
    }

    const result = await instagramService.getComments(filters);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Rota para Dashboard - Estatísticas gerais
router.get('/dashboard', async (req, res) => {
  try {
    // Buscar estatísticas gerais
    const profilesResult = await instagramService.getProfiles({ limit: 1000 });
    const postsResult = await instagramService.getPosts({ limit: 1000 });
    const commentsResult = await instagramService.getComments({ limit: 1000 });

    if (!profilesResult.success || !postsResult.success || !commentsResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Erro ao obter dados do dashboard'
      });
    }

    const profiles = profilesResult.data.profiles || [];
    const posts = postsResult.data.posts || [];
    const comments = commentsResult.data.comments || [];

    // Calcular métricas
    const totalProfiles = profiles.length;
    const totalPosts = posts.length;
    const totalComments = comments.length;
    const totalLikes = posts.reduce((sum: number, post: any) => sum + post.likesCount, 0);
    const totalFollowers = profiles.reduce((sum: number, profile: any) => sum + profile.followersCount, 0);

    // Top perfis por seguidores
    const topProfiles = profiles
      .sort((a: any, b: any) => b.followersCount - a.followersCount)
      .slice(0, 10);

    // Posts mais engajados
    const topPosts = posts
      .sort((a: any, b: any) => (b.likesCount + b.commentsCount) - (a.likesCount + a.commentsCount))
      .slice(0, 10);

    // Análise de sentimentos dos comentários
    const sentimentAnalysis = {
      positive: comments.filter((c: any) => c.sentiment?.label === 'positive').length,
      negative: comments.filter((c: any) => c.sentiment?.label === 'negative').length,
      neutral: comments.filter((c: any) => c.sentiment?.label === 'neutral').length
    };

    return res.json({
      success: true,
      message: 'Dashboard carregado com sucesso',
      data: {
        overview: {
          totalProfiles,
          totalPosts,
          totalComments,
          totalLikes,
          totalFollowers
        },
        topProfiles,
        topPosts,
        sentimentAnalysis
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;