import express from 'express';
import WebSource from '../models/WebSource';
import WebArticle from '../models/WebArticle';
import webScrapingService from '../services/webScrapingService';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Aplicar autenticação a todas as rotas
router.use(authenticate);

// Dashboard - Estatísticas gerais
router.get('/dashboard', async (req, res) => {
  try {
    const totalSources = await WebSource.countDocuments();
    const activeSources = await WebSource.countDocuments({ isActive: true });
    const totalArticles = await WebArticle.countDocuments();
    const todayArticles = await WebArticle.countDocuments({
      scrapedAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0))
      }
    });
    
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const weekArticles = await WebArticle.countDocuments({
      scrapedAt: { $gte: last7Days }
    });

    // Artigos por categoria
    const articlesByCategory = await WebArticle.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Fontes mais produtivas
    const topSources = await WebArticle.aggregate([
      {
        $group: {
          _id: '$sourceName',
          count: { $sum: 1 },
          lastArticle: { $max: '$scrapedAt' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Artigos recentes
    const recentArticles = await WebArticle.find()
      .select('title sourceName scrapedAt url category wordCount')
      .sort({ scrapedAt: -1 })
      .limit(10);

    res.json({
      statistics: {
        totalSources,
        activeSources,
        totalArticles,
        todayArticles,
        weekArticles,
        avgArticlesPerDay: Math.round(weekArticles / 7)
      },
      articlesByCategory,
      topSources,
      recentArticles
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar fontes
router.get('/sources', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, type, active } = req.query;
    
    const filter: any = {};
    if (category) filter.category = category;
    if (type) filter.type = type;
    if (active !== undefined) filter.isActive = active === 'true';

    const sources = await WebSource.find(filter)
      .select('-headers -metadata')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await WebSource.countDocuments(filter);

    res.json({
      sources,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar fontes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adicionar nova fonte
router.post('/sources', async (req, res) => {
  try {
    const sourceData = req.body;
    
    // Validar URL única
    const existingSource = await WebSource.findOne({ url: sourceData.url });
    if (existingSource) {
      return res.status(400).json({ error: 'URL já está sendo monitorada' });
    }

    const source = new WebSource(sourceData);
    await source.save();

    return res.status(201).json(source);
  } catch (error) {
    console.error('Erro ao adicionar fonte:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter detalhes de uma fonte
router.get('/sources/:id', async (req, res) => {
  try {
    const source = await WebSource.findById(req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Fonte não encontrada' });
    }

    // Estatísticas dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentArticles = await WebArticle.countDocuments({
      sourceId: source._id,
      scrapedAt: { $gte: thirtyDaysAgo }
    });

    const articlesByDay = await WebArticle.aggregate([
      {
        $match: {
          sourceId: source._id,
          scrapedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$scrapedAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return res.json({
      source,
      statistics: {
        recentArticles,
        articlesByDay
      }
    });
  } catch (error) {
    console.error('Erro ao buscar fonte:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar fonte
router.put('/sources/:id', async (req, res) => {
  try {
    const source = await WebSource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!source) {
      return res.status(404).json({ error: 'Fonte não encontrada' });
    }

    return res.json(source);
  } catch (error) {
    console.error('Erro ao atualizar fonte:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Remover fonte
router.delete('/sources/:id', async (req, res) => {
  try {
    const source = await WebSource.findByIdAndDelete(req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Fonte não encontrada' });
    }

    // Remover artigos relacionados
    await WebArticle.deleteMany({ sourceId: source._id });

    return res.json({ message: 'Fonte removida com sucesso' });
  } catch (error) {
    console.error('Erro ao remover fonte:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Fazer scraping manual de uma fonte
router.post('/sources/:id/scrape', async (req, res) => {
  try {
    const source = await WebSource.findById(req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Fonte não encontrada' });
    }

    const result = await webScrapingService.scrapeSource(req.params.id);
    
    // Salvar artigos encontrados
    for (const articleData of result.articles) {
      try {
        const article = new WebArticle(articleData);
        await article.save();
      } catch (error) {
        console.error('Erro ao salvar artigo:', error);
      }
    }

    return res.json({
      message: 'Scraping concluído',
      result: {
        success: result.success,
        articlesFound: result.articlesFound,
        errors: result.errors
      }
    });
  } catch (error) {
    console.error('Erro no scraping manual:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar artigos
router.get('/articles', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      source, 
      search, 
      startDate, 
      endDate 
    } = req.query;
    
    const filter: any = { isActive: true };
    
    if (category) filter.category = category;
    if (source) filter.sourceName = source;
    if (search) {
      filter.$text = { $search: search as string };
    }
    if (startDate || endDate) {
      filter.scrapedAt = {};
      if (startDate) filter.scrapedAt.$gte = new Date(startDate as string);
      if (endDate) filter.scrapedAt.$lte = new Date(endDate as string);
    }

    const articles = await WebArticle.find(filter)
      .select('title sourceName scrapedAt url category wordCount readingTime author publishedAt imageUrl')
      .sort({ scrapedAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await WebArticle.countDocuments(filter);

    return res.json({
      articles,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao listar artigos:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter detalhes de um artigo
router.get('/articles/:id', async (req, res) => {
  try {
    const article = await WebArticle.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Artigo não encontrado' });
    }

    return res.json(article);
  } catch (error) {
    console.error('Erro ao buscar artigo:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Fazer scraping de todas as fontes ativas
router.post('/scrape-all', async (req, res) => {
  try {
    const result = await webScrapingService.scrapeAllActiveSources();
    
    return res.json({
      message: 'Scraping de todas as fontes concluído',
      result
    });
  } catch (error) {
    console.error('Erro no scraping geral:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter categorias disponíveis
router.get('/categories', async (req, res) => {
  try {
    const categories = await WebSource.distinct('category');
    res.json(categories);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;