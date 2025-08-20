import express from 'express';
import { query, body, validationResult } from 'express-validator';
import MonitoringData from '../models/MonitoringData';
import InstagramProfile from '../models/InstagramProfile';
import Project from '../models/Project';
import { authenticateToken } from '../middleware/auth';
import mongoose from 'mongoose';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Generate comprehensive report for a project
router.get('/generate/:projectId', [
  query('period').optional().isIn(['7d', '30d', '90d', '1y', 'custom']).withMessage('Período inválido'),
  query('dateFrom').optional().isISO8601().withMessage('Data inicial inválida'),
  query('dateTo').optional().isISO8601().withMessage('Data final inválida'),
  query('includeCharts').optional().isBoolean().withMessage('includeCharts deve ser boolean'),
  query('includeSentiment').optional().isBoolean().withMessage('includeSentiment deve ser boolean'),
  query('includeRankings').optional().isBoolean().withMessage('includeRankings deve ser boolean')
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
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const includeCharts = req.query.includeCharts !== 'false';
    const includeSentiment = req.query.includeSentiment !== 'false';
    const includeRankings = req.query.includeRankings !== 'false';

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
    let startDate: Date;
    let endDate = new Date();

    if (period === 'custom' && dateFrom && dateTo) {
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo);
    } else {
      const periodDays = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
      };
      const days = periodDays[period as keyof typeof periodDays] || 30;
      startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
    }

    // Get basic statistics
    const basicStats = await MonitoringData.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          'metadata.publishedAt': { $gte: startDate, $lte: endDate }
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
          avgEngagement: {
            $avg: {
              $add: ['$engagement.likes', '$engagement.comments', '$engagement.shares']
            }
          },
          sourceBreakdown: { $push: '$source' },
          contentTypeBreakdown: { $push: '$contentType' }
        }
      }
    ]);

    // Get source distribution
    const sourceStats = await MonitoringData.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          'metadata.publishedAt': { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          totalLikes: { $sum: '$engagement.likes' },
          totalComments: { $sum: '$engagement.comments' },
          avgEngagement: {
            $avg: {
              $add: ['$engagement.likes', '$engagement.comments', '$engagement.shares']
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get top performing content
    const topContent = await MonitoringData.find({
      project: projectId,
      'metadata.publishedAt': { $gte: startDate, $lte: endDate }
    })
    .sort({ 'engagement.likes': -1 })
    .limit(10)
    .select('source contentType text author engagement metadata');

    // Get keyword performance
    const keywordPerformance = await MonitoringData.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          'metadata.publishedAt': { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$matchedKeywords' },
      {
        $group: {
          _id: '$matchedKeywords',
          mentions: { $sum: 1 },
          totalLikes: { $sum: '$engagement.likes' },
          totalComments: { $sum: '$engagement.comments' },
          avgEngagement: {
            $avg: {
              $add: ['$engagement.likes', '$engagement.comments', '$engagement.shares']
            }
          }
        }
      },
      { $sort: { mentions: -1 } },
      { $limit: 20 }
    ]);

    // Get hashtag performance
    const hashtagPerformance = await MonitoringData.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          'metadata.publishedAt': { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$matchedHashtags' },
      {
        $group: {
          _id: '$matchedHashtags',
          mentions: { $sum: 1 },
          totalLikes: { $sum: '$engagement.likes' },
          totalComments: { $sum: '$engagement.comments' },
          avgEngagement: {
            $avg: {
              $add: ['$engagement.likes', '$engagement.comments', '$engagement.shares']
            }
          }
        }
      },
      { $sort: { mentions: -1 } },
      { $limit: 20 }
    ]);

    let chartData = null;
    if (includeCharts) {
      // Get daily activity for charts
      chartData = {
        dailyActivity: await MonitoringData.aggregate([
          {
            $match: {
              project: new mongoose.Types.ObjectId(projectId),
              'metadata.publishedAt': { $gte: startDate, $lte: endDate }
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
              posts: { $sum: 1 },
              likes: { $sum: '$engagement.likes' },
              comments: { $sum: '$engagement.comments' },
              shares: { $sum: '$engagement.shares' }
            }
          },
          { $sort: { _id: 1 } }
        ]),
        hourlyActivity: await MonitoringData.aggregate([
          {
            $match: {
              project: new mongoose.Types.ObjectId(projectId),
              'metadata.publishedAt': { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: {
                $hour: '$metadata.publishedAt'
              },
              posts: { $sum: 1 },
              avgEngagement: {
                $avg: {
                  $add: ['$engagement.likes', '$engagement.comments', '$engagement.shares']
                }
              }
            }
          },
          { $sort: { _id: 1 } }
        ])
      };
    }

    let sentimentAnalysis = null;
    if (includeSentiment) {
      sentimentAnalysis = await MonitoringData.aggregate([
        {
          $match: {
            project: new mongoose.Types.ObjectId(projectId),
            'metadata.publishedAt': { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$sentiment.label',
            count: { $sum: 1 },
            avgScore: { $avg: '$sentiment.score' },
            totalEngagement: {
              $sum: {
                $add: ['$engagement.likes', '$engagement.comments', '$engagement.shares']
              }
            }
          }
        },
        { $sort: { count: -1 } }
      ]);
    }

    let rankings = null;
    if (includeRankings) {
      rankings = {
        topProfiles: await InstagramProfile.find({
          projects: projectId
        })
        .sort({ 'interactions.totalLikes': -1 })
        .limit(20)
        .select('username displayName followersCount interactions engagementRate'),
        
        topCommenters: await InstagramProfile.find({
          projects: projectId
        })
        .sort({ 'interactions.totalComments': -1 })
        .limit(20)
        .select('username displayName followersCount interactions')
      };
    }

    const report = {
      project: {
        id: project._id,
        name: project.name,
        description: project.description,
        keywords: project.keywords,
        hashtags: project.hashtags
      },
      period: {
        type: period,
        startDate,
        endDate
      },
      summary: basicStats[0] || {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalViews: 0,
        avgEngagement: 0
      },
      sourceDistribution: sourceStats,
      topContent,
      keywordPerformance,
      hashtagPerformance,
      chartData,
      sentimentAnalysis,
      rankings,
      generatedAt: new Date()
    };

    res.json(report);
  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'GENERATE_REPORT_ERROR'
    });
  }
});

// Get social media specific report (Instagram)
router.get('/social/:projectId', [
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

    // Get Instagram specific data
    const instagramData = await MonitoringData.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          source: 'instagram',
          'metadata.publishedAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$contentType',
          count: { $sum: 1 },
          totalLikes: { $sum: '$engagement.likes' },
          totalComments: { $sum: '$engagement.comments' },
          totalShares: { $sum: '$engagement.shares' },
          totalViews: { $sum: '$engagement.views' },
          avgEngagement: {
            $avg: {
              $add: ['$engagement.likes', '$engagement.comments', '$engagement.shares']
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get top Instagram profiles
    const topProfiles = await InstagramProfile.find({
      projects: projectId
    })
    .sort({ 'interactions.totalLikes': -1 })
    .limit(50)
    .select('username displayName profilePicture followersCount interactions engagementRate rankings');

    // Get hashtag performance on Instagram
    const hashtagPerformance = await MonitoringData.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          source: 'instagram',
          'metadata.publishedAt': { $gte: startDate }
        }
      },
      { $unwind: '$metadata.hashtags' },
      {
        $group: {
          _id: '$metadata.hashtags',
          mentions: { $sum: 1 },
          totalLikes: { $sum: '$engagement.likes' },
          totalComments: { $sum: '$engagement.comments' },
          avgEngagement: {
            $avg: {
              $add: ['$engagement.likes', '$engagement.comments', '$engagement.shares']
            }
          }
        }
      },
      { $sort: { mentions: -1 } },
      { $limit: 30 }
    ]);

    const report = {
      project: {
        id: project._id,
        name: project.name
      },
      period,
      contentTypeBreakdown: instagramData,
      topProfiles,
      hashtagPerformance,
      generatedAt: new Date()
    };

    res.json(report);
  } catch (error: any) {
    console.error('Erro ao gerar relatório de redes sociais:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'GENERATE_SOCIAL_REPORT_ERROR'
    });
  }
});

// Get web/news specific report
router.get('/web/:projectId', [
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

    // Get web/news specific data
    const webData = await MonitoringData.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          source: { $in: ['website', 'news', 'blog'] },
          'metadata.publishedAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            source: '$source',
            domain: '$metadata.domain'
          },
          count: { $sum: 1 },
          avgSentimentScore: { $avg: '$sentiment.score' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get top domains
    const topDomains = await MonitoringData.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          source: { $in: ['website', 'news', 'blog'] },
          'metadata.publishedAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$metadata.domain',
          count: { $sum: 1 },
          avgSentimentScore: { $avg: '$sentiment.score' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // Get recent articles
    const recentArticles = await MonitoringData.find({
      project: projectId,
      source: { $in: ['website', 'news', 'blog'] },
      'metadata.publishedAt': { $gte: startDate }
    })
    .sort({ 'metadata.publishedAt': -1 })
    .limit(20)
    .select('source text author metadata sentiment matchedKeywords');

    const report = {
      project: {
        id: project._id,
        name: project.name
      },
      period,
      sourceBreakdown: webData,
      topDomains,
      recentArticles,
      generatedAt: new Date()
    };

    res.json(report);
  } catch (error: any) {
    console.error('Erro ao gerar relatório web:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'GENERATE_WEB_REPORT_ERROR'
    });
  }
});

// Save custom report configuration
router.post('/config/:projectId', [
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('description').optional().isString(),
  body('logo').optional().isString(),
  body('includeCharts').optional().isBoolean(),
  body('includeSentiment').optional().isBoolean(),
  body('includeRankings').optional().isBoolean(),
  body('customFields').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { projectId } = req.params;
    const userId = req.user?._id;
    const { name, description, logo, includeCharts, includeSentiment, includeRankings, customFields } = req.body;

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

    // Update project with report configuration
    project.reportConfig = {
      name,
      description,
      logo,
      includeCharts: includeCharts !== false,
      includeSentiment: includeSentiment !== false,
      includeRankings: includeRankings !== false,
      customFields: customFields || []
    };

    await project.save();

    res.json({
      message: 'Configuração de relatório salva com sucesso',
      config: project.reportConfig
    });
  } catch (error: any) {
    console.error('Erro ao salvar configuração de relatório:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'SAVE_REPORT_CONFIG_ERROR'
    });
  }
});

export default router;