import express from 'express';
import { query, validationResult } from 'express-validator';
import MonitoringData from '../models/MonitoringData';
import InstagramProfile from '../models/InstagramProfile';
import Project from '../models/Project';
import { authenticateToken } from '../middleware/auth';
import mongoose from 'mongoose';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get monitoring data for a project
router.get('/data/:projectId', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit deve ser entre 1 e 100'),
  query('source').optional().isIn(['instagram', 'website', 'news', 'blog']).withMessage('Source inválido'),
  query('contentType').optional().isIn(['post', 'reel', 'comment', 'article', 'blog_post']).withMessage('Content type inválido'),
  query('sentiment').optional().isIn(['positive', 'negative', 'neutral']).withMessage('Sentiment inválido'),
  query('dateFrom').optional().isISO8601().withMessage('Data inicial inválida'),
  query('dateTo').optional().isISO8601().withMessage('Data final inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Parâmetros inválidos',
        errors: errors.array()
      });
    }

    const { projectId } = req.params;
    const userId = req.user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const source = req.query.source as string;
    const contentType = req.query.contentType as string;
    const sentiment = req.query.sentiment as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: 'ID do projeto inválido',
        error: 'INVALID_PROJECT_ID'
      });
    }

    // Verify user has access to project
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userId },
        { collaborators: userId }
      ]
    });

    if (!project) {
      return res.status(404).json({
        message: 'Projeto não encontrado',
        error: 'PROJECT_NOT_FOUND'
      });
    }

    // Build query
    const query: any = { project: projectId };

    if (source) {
      query.source = source;
    }

    if (contentType) {
      query.contentType = contentType;
    }

    if (sentiment) {
      query['sentiment.label'] = sentiment;
    }

    if (dateFrom || dateTo) {
      query['metadata.publishedAt'] = {};
      if (dateFrom) {
        query['metadata.publishedAt'].$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query['metadata.publishedAt'].$lte = new Date(dateTo);
      }
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      MonitoringData.find(query)
        .sort({ 'metadata.publishedAt': -1 })
        .skip(skip)
        .limit(limit),
      MonitoringData.countDocuments(query)
    ]);

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Erro ao buscar dados de monitoramento:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'GET_MONITORING_DATA_ERROR'
    });
  }
});

// Get monitoring statistics for a project
router.get('/stats/:projectId', [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Período inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Parâmetros inválidos',
        errors: errors.array()
      });
    }

    const { projectId } = req.params;
    const userId = req.user?._id;
    const period = req.query.period as string || '30d';

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: 'ID do projeto inválido',
        error: 'INVALID_PROJECT_ID'
      });
    }

    // Verify user has access to project
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userId },
        { collaborators: userId }
      ]
    });

    if (!project) {
      return res.status(404).json({
        message: 'Projeto não encontrado',
        error: 'PROJECT_NOT_FOUND'
      });
    }

    // Calculate date range
    const now = new Date();
    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    const startDate = new Date(now.getTime() - (periodDays[period as keyof typeof periodDays] * 24 * 60 * 60 * 1000));

    // Aggregation pipeline for statistics
    const stats = await MonitoringData.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          'metadata.publishedAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalLikes: { $sum: '$engagement.likes' },
          totalComments: { $sum: '$engagement.comments' },
          totalShares: { $sum: '$engagement.shares' },
          totalViews: { $sum: '$engagement.views' },
          avgSentimentScore: { $avg: '$sentiment.score' },
          sourceBreakdown: {
            $push: '$source'
          },
          contentTypeBreakdown: {
            $push: '$contentType'
          },
          sentimentBreakdown: {
            $push: '$sentiment.label'
          }
        }
      }
    ]);

    // Get top keywords and hashtags
    const keywordStats = await MonitoringData.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          'metadata.publishedAt': { $gte: startDate }
        }
      },
      { $unwind: '$matchedKeywords' },
      {
        $group: {
          _id: '$matchedKeywords',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const hashtagStats = await MonitoringData.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          'metadata.publishedAt': { $gte: startDate }
        }
      },
      { $unwind: '$matchedHashtags' },
      {
        $group: {
          _id: '$matchedHashtags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get daily activity
    const dailyActivity = await MonitoringData.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          'metadata.publishedAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$metadata.publishedAt'
            }
          },
          count: { $sum: 1 },
          likes: { $sum: '$engagement.likes' },
          comments: { $sum: '$engagement.comments' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const result = {
      period,
      summary: stats[0] || {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalViews: 0,
        avgSentimentScore: 0
      },
      topKeywords: keywordStats,
      topHashtags: hashtagStats,
      dailyActivity
    };

    res.json(result);
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'GET_STATS_ERROR'
    });
  }
});

// Get Instagram profile rankings
router.get('/rankings/:projectId', [
  query('type').optional().isIn(['monthly', 'yearly']).withMessage('Tipo inválido'),
  query('metric').optional().isIn(['likes', 'comments', 'total']).withMessage('Métrica inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit deve ser entre 1 e 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Parâmetros inválidos',
        errors: errors.array()
      });
    }

    const { projectId } = req.params;
    const userId = req.user?._id;
    const type = req.query.type as string || 'monthly';
    const metric = req.query.metric as string || 'total';
    const limit = parseInt(req.query.limit as string) || 20;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: 'ID do projeto inválido',
        error: 'INVALID_PROJECT_ID'
      });
    }

    // Verify user has access to project
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userId },
        { collaborators: userId }
      ]
    });

    if (!project) {
      return res.status(404).json({
        message: 'Projeto não encontrado',
        error: 'PROJECT_NOT_FOUND'
      });
    }

    // Build sort criteria based on metric
    let sortField = 'interactions.totalLikes';
    if (metric === 'comments') {
      sortField = 'interactions.totalComments';
    } else if (metric === 'total') {
      // We'll calculate total in aggregation
    }

    const rankings = await InstagramProfile.find({
      projects: projectId
    })
    .sort({ [sortField]: -1 })
    .limit(limit)
    .select('username displayName profilePicture followersCount interactions rankings');

    res.json({
      type,
      metric,
      rankings
    });
  } catch (error: any) {
    console.error('Erro ao buscar rankings:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'GET_RANKINGS_ERROR'
    });
  }
});

// Start monitoring for a project (trigger data collection)
router.post('/start/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: 'ID do projeto inválido',
        error: 'INVALID_PROJECT_ID'
      });
    }

    // Verify user has access to project
    const project = await Project.findOne({
      _id: projectId,
      owner: userId // Only owner can start monitoring
    });

    if (!project) {
      return res.status(404).json({
        message: 'Projeto não encontrado ou sem permissão',
        error: 'PROJECT_NOT_FOUND'
      });
    }

    // Update project status to active
    project.status = 'active';
    await project.save();

    // TODO: Trigger actual monitoring services
    // This would start the background jobs for data collection

    res.json({
      message: 'Monitoramento iniciado com sucesso',
      project: {
        id: project._id,
        name: project.name,
        status: project.status
      }
    });
  } catch (error: any) {
    console.error('Erro ao iniciar monitoramento:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'START_MONITORING_ERROR'
    });
  }
});

// Stop monitoring for a project
router.post('/stop/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: 'ID do projeto inválido',
        error: 'INVALID_PROJECT_ID'
      });
    }

    // Verify user has access to project
    const project = await Project.findOne({
      _id: projectId,
      owner: userId // Only owner can stop monitoring
    });

    if (!project) {
      return res.status(404).json({
        message: 'Projeto não encontrado ou sem permissão',
        error: 'PROJECT_NOT_FOUND'
      });
    }

    // Update project status to paused
    project.status = 'paused';
    await project.save();

    // TODO: Stop actual monitoring services
    // This would stop the background jobs for data collection

    res.json({
      message: 'Monitoramento pausado com sucesso',
      project: {
        id: project._id,
        name: project.name,
        status: project.status
      }
    });
  } catch (error: any) {
    console.error('Erro ao pausar monitoramento:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'STOP_MONITORING_ERROR'
    });
  }
});

export default router;