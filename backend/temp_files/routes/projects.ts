import express from 'express';
import { body, query, validationResult } from 'express-validator';
import Project from '../models/Project';
import { authenticateToken } from '../middleware/auth';
import mongoose from 'mongoose';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Validation middleware
const validateProject = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Descrição não pode ter mais de 500 caracteres'),
  body('keywords')
    .isArray({ min: 1 })
    .withMessage('Pelo menos uma palavra-chave é obrigatória'),
  body('keywords.*')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Cada palavra-chave deve ter entre 2 e 50 caracteres'),
  body('hashtags')
    .optional()
    .isArray()
    .withMessage('Hashtags deve ser um array'),
  body('hashtags.*')
    .optional()
    .trim()
    .matches(/^#[a-zA-Z0-9_]+$/)
    .withMessage('Hashtag deve começar com # e conter apenas letras, números e _'),
  body('sources')
    .optional()
    .isObject()
    .withMessage('Sources deve ser um objeto'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings deve ser um objeto')
];

// Create new project
router.post('/', validateProject, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { name, description, keywords, hashtags, sources, settings } = req.body;
    const userId = req.user?._id;

    // Check if project with same name exists for this user
    const existingProject = await Project.findOne({ name, owner: userId });
    if (existingProject) {
      return res.status(409).json({
        message: 'Já existe um projeto com este nome',
        error: 'PROJECT_EXISTS'
      });
    }

    const project = new Project({
      name,
      description,
      keywords: keywords.map((k: string) => k.toLowerCase().trim()),
      hashtags: hashtags?.map((h: string) => h.toLowerCase().trim()) || [],
      owner: userId,
      sources: {
        instagram: sources?.instagram ?? true,
        websites: sources?.websites ?? true,
        news: sources?.news ?? true,
        blogs: sources?.blogs ?? true
      },
      settings: {
        monitoringFrequency: settings?.monitoringFrequency || 60,
        sentimentAnalysis: settings?.sentimentAnalysis ?? true,
        realTimeAlerts: settings?.realTimeAlerts ?? false,
        maxResults: settings?.maxResults || 1000
      }
    });

    await project.save();
    await project.populate('owner', 'name email');

    res.status(201).json({
      message: 'Projeto criado com sucesso',
      project
    });
  } catch (error: any) {
    console.error('Erro ao criar projeto:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'CREATE_PROJECT_ERROR'
    });
  }
});

// Get user's projects
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Página deve ser um número positivo'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit deve ser entre 1 e 100'),
  query('status').optional().isIn(['active', 'paused', 'completed']).withMessage('Status inválido'),
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Termo de busca inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Parâmetros inválidos',
        errors: errors.array()
      });
    }

    const userId = req.user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const search = req.query.search as string;

    // Build query
    const query: any = {
      $or: [
        { owner: userId },
        { collaborators: userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { keywords: { $in: [new RegExp(search, 'i')] } }
        ]
      });
    }

    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('owner', 'name email')
        .populate('collaborators', 'name email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Project.countDocuments(query)
    ]);

    res.json({
      projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Erro ao buscar projetos:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'GET_PROJECTS_ERROR'
    });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'ID do projeto inválido',
        error: 'INVALID_PROJECT_ID'
      });
    }

    const project = await Project.findOne({
      _id: id,
      $or: [
        { owner: userId },
        { collaborators: userId }
      ]
    })
    .populate('owner', 'name email')
    .populate('collaborators', 'name email');

    if (!project) {
      return res.status(404).json({
        message: 'Projeto não encontrado',
        error: 'PROJECT_NOT_FOUND'
      });
    }

    res.json({ project });
  } catch (error: any) {
    console.error('Erro ao buscar projeto:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'GET_PROJECT_ERROR'
    });
  }
});

// Update project
router.put('/:id', validateProject, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Dados inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const userId = req.user?._id;
    const { name, description, keywords, hashtags, sources, settings, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'ID do projeto inválido',
        error: 'INVALID_PROJECT_ID'
      });
    }

    const project = await Project.findOne({
      _id: id,
      owner: userId // Only owner can update
    });

    if (!project) {
      return res.status(404).json({
        message: 'Projeto não encontrado ou sem permissão',
        error: 'PROJECT_NOT_FOUND'
      });
    }

    // Update fields
    project.name = name;
    project.description = description;
    project.keywords = keywords.map((k: string) => k.toLowerCase().trim());
    project.hashtags = hashtags?.map((h: string) => h.toLowerCase().trim()) || [];
    
    if (sources) {
      project.sources = {
        instagram: sources.instagram ?? project.sources.instagram,
        websites: sources.websites ?? project.sources.websites,
        news: sources.news ?? project.sources.news,
        blogs: sources.blogs ?? project.sources.blogs
      };
    }

    if (settings) {
      project.settings = {
        monitoringFrequency: settings.monitoringFrequency || project.settings.monitoringFrequency,
        sentimentAnalysis: settings.sentimentAnalysis ?? project.settings.sentimentAnalysis,
        realTimeAlerts: settings.realTimeAlerts ?? project.settings.realTimeAlerts,
        maxResults: settings.maxResults || project.settings.maxResults
      };
    }

    if (status && ['active', 'paused', 'completed'].includes(status)) {
      project.status = status;
    }

    await project.save();
    await project.populate('owner', 'name email');
    await project.populate('collaborators', 'name email');

    res.json({
      message: 'Projeto atualizado com sucesso',
      project
    });
  } catch (error: any) {
    console.error('Erro ao atualizar projeto:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'UPDATE_PROJECT_ERROR'
    });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'ID do projeto inválido',
        error: 'INVALID_PROJECT_ID'
      });
    }

    const project = await Project.findOneAndDelete({
      _id: id,
      owner: userId // Only owner can delete
    });

    if (!project) {
      return res.status(404).json({
        message: 'Projeto não encontrado ou sem permissão',
        error: 'PROJECT_NOT_FOUND'
      });
    }

    res.json({
      message: 'Projeto excluído com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao excluir projeto:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: 'DELETE_PROJECT_ERROR'
    });
  }
});

export default router;