import express from 'express';
import * as reportService from '../services/reportService';
import { authenticate } from '../middleware/auth';
import { body, param, query, validationResult } from 'express-validator';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Aplicar autenticação a todas as rotas
router.use(authenticate);

// Middleware para validação de erros
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Listar relatórios do usuário
router.get('/', [
  query('type').optional().isIn(['instagram', 'web', 'combined', 'custom']),
  query('category').optional().isIn(['performance', 'engagement', 'content', 'analytics', 'comparison']),
  query('status').optional().isIn(['draft', 'generating', 'completed', 'error']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      type: req.query.type as string,
      category: req.query.category as string,
      status: req.query.status as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10
    };

    const result = await reportService.getUserReports(userId, filters);
    res.json(result);
  } catch (error) {
    console.error('Erro ao listar relatórios:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo relatório
router.post('/', [
  body('title').notEmpty().trim().isLength({ max: 200 }).withMessage('Título é obrigatório e deve ter no máximo 200 caracteres'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('type').isIn(['instagram', 'web', 'combined', 'custom']).withMessage('Tipo de relatório inválido'),
  body('category').isIn(['performance', 'engagement', 'content', 'analytics', 'comparison']).withMessage('Categoria inválida'),
  body('dateRange.startDate').isISO8601().withMessage('Data de início inválida'),
  body('dateRange.endDate').isISO8601().withMessage('Data de fim inválida'),
  body('format').optional().isIn(['pdf', 'excel', 'html', 'json']),
  body('configuration.charts').optional().isArray(),
  body('configuration.tables').optional().isArray(),
  body('filters.projects').optional().isArray(),
  body('filters.sources').optional().isArray(),
  body('filters.keywords').optional().isArray(),
  body('filters.categories').optional().isArray()
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const reportData = req.body;

    // Validar datas
    const startDate = new Date(reportData.dateRange.startDate);
    const endDate = new Date(reportData.dateRange.endDate);
    
    if (startDate >= endDate) {
      return res.status(400).json({ error: 'Data de início deve ser anterior à data de fim' });
    }

    // Validar período máximo (1 ano)
    const maxPeriod = 365 * 24 * 60 * 60 * 1000; // 1 ano em ms
    if (endDate.getTime() - startDate.getTime() > maxPeriod) {
      return res.status(400).json({ error: 'Período máximo permitido é de 1 ano' });
    }

    const report = await reportService.createReport(reportData, userId);
    res.status(201).json(report);
  } catch (error) {
    console.error('Erro ao criar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter relatório por ID
router.get('/:id', [
  param('id').isMongoId().withMessage('ID do relatório inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const reportId = req.params.id;

    const report = await reportService.getReportById(reportId, userId);
    if (!report) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    res.json(report);
  } catch (error) {
    console.error('Erro ao buscar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar relatório
router.put('/:id', [
  param('id').isMongoId().withMessage('ID do relatório inválido'),
  body('title').optional().trim().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('type').optional().isIn(['instagram', 'web', 'combined', 'custom']),
  body('category').optional().isIn(['performance', 'engagement', 'content', 'analytics', 'comparison']),
  body('dateRange.startDate').optional().isISO8601(),
  body('dateRange.endDate').optional().isISO8601(),
  body('format').optional().isIn(['pdf', 'excel', 'html', 'json'])
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const reportId = req.params.id;
    const updateData = req.body;

    // Validar datas se fornecidas
    if (updateData.dateRange) {
      const startDate = new Date(updateData.dateRange.startDate);
      const endDate = new Date(updateData.dateRange.endDate);
      
      if (startDate >= endDate) {
        return res.status(400).json({ error: 'Data de início deve ser anterior à data de fim' });
      }
    }

    const report = await reportService.updateReport(reportId, updateData, userId);
    if (!report) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    res.json(report);
  } catch (error) {
    console.error('Erro ao atualizar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar relatório
router.delete('/:id', [
  param('id').isMongoId().withMessage('ID do relatório inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const reportId = req.params.id;

    const deleted = await reportService.deleteReport(reportId, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    res.json({ message: 'Relatório deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Gerar dados do relatório
router.post('/:id/generate', [
  param('id').isMongoId().withMessage('ID do relatório inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const reportId = req.params.id;

    // Verificar se o relatório pertence ao usuário
    const report = await reportService.getReportById(reportId, userId);
    if (!report) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    // Gerar dados em background
    reportService.generateReportData(reportId).catch(error => {
      console.error('Erro ao gerar dados do relatório:', error);
    });

    res.json({ message: 'Geração de dados iniciada', status: 'generating' });
  } catch (error) {
    console.error('Erro ao iniciar geração do relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Exportar relatório em PDF
router.post('/:id/export/pdf', [
  param('id').isMongoId().withMessage('ID do relatório inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const reportId = req.params.id;

    // Verificar se o relatório pertence ao usuário
    const report = await reportService.getReportById(reportId, userId);
    if (!report) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    if (report.status !== 'completed') {
      return res.status(400).json({ error: 'Relatório deve estar completo para exportação' });
    }

    const fileUrl = await reportService.exportToPDF(reportId);
    res.json({ fileUrl, message: 'Relatório exportado em PDF com sucesso' });
  } catch (error) {
    console.error('Erro ao exportar relatório em PDF:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Exportar relatório em Excel
router.post('/:id/export/excel', [
  param('id').isMongoId().withMessage('ID do relatório inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const reportId = req.params.id;

    // Verificar se o relatório pertence ao usuário
    const report = await reportService.getReportById(reportId, userId);
    if (!report) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    if (report.status !== 'completed') {
      return res.status(400).json({ error: 'Relatório deve estar completo para exportação' });
    }

    const fileUrl = await reportService.exportToExcel(reportId);
    res.json({ fileUrl, message: 'Relatório exportado em Excel com sucesso' });
  } catch (error) {
    console.error('Erro ao exportar relatório em Excel:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Agendar relatório
router.post('/:id/schedule', [
  param('id').isMongoId().withMessage('ID do relatório inválido'),
  body('frequency').isIn(['daily', 'weekly', 'monthly', 'quarterly']).withMessage('Frequência inválida'),
  body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Horário inválido (formato HH:MM)'),
  body('timezone').optional().isString(),
  body('dayOfWeek').optional().isInt({ min: 0, max: 6 }),
  body('dayOfMonth').optional().isInt({ min: 1, max: 31 }),
  body('recipients').optional().isArray()
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const reportId = req.params.id;
    const scheduleData = req.body;

    // Verificar se o relatório pertence ao usuário
    const report = await reportService.getReportById(reportId, userId);
    if (!report) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    // Validar configuração de agendamento
    if (scheduleData.frequency === 'weekly' && scheduleData.dayOfWeek === undefined) {
      return res.status(400).json({ error: 'Dia da semana é obrigatório para frequência semanal' });
    }
    
    if (['monthly', 'quarterly'].includes(scheduleData.frequency) && scheduleData.dayOfMonth === undefined) {
      return res.status(400).json({ error: 'Dia do mês é obrigatório para frequência mensal/trimestral' });
    }

    await reportService.scheduleReport(reportId, scheduleData);
    res.json({ message: 'Relatório agendado com sucesso' });
  } catch (error) {
    console.error('Erro ao agendar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Cancelar agendamento
router.delete('/:id/schedule', [
  param('id').isMongoId().withMessage('ID do relatório inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const reportId = req.params.id;

    const report = await reportService.updateReport(reportId, {
      isScheduled: false,
      schedule: undefined
    }, userId);

    if (!report) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    res.json({ message: 'Agendamento cancelado com sucesso' });
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Download de arquivo de relatório
router.get('/:id/download', [
  param('id').isMongoId().withMessage('ID do relatório inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const reportId = req.params.id;

    const report = await reportService.getReportById(reportId, userId);
    if (!report) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    if (!report.fileUrl) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    const fileName = path.basename(report.fileUrl);
    const filePath = path.join(process.cwd(), 'reports', fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no servidor' });
    }

    res.download(filePath, fileName);
  } catch (error) {
    console.error('Erro ao fazer download do relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter templates de relatório
router.get('/templates/list', async (req, res) => {
  try {
    const templates = [
      {
        id: 'instagram_performance',
        name: 'Performance Instagram',
        description: 'Relatório completo de performance de perfis do Instagram',
        type: 'instagram',
        category: 'performance',
        configuration: {
          charts: [
            {
              type: 'line',
              title: 'Engajamento ao Longo do Tempo',
              dataSource: 'instagram_posts',
              metrics: ['likes', 'comments'],
              groupBy: 'date'
            },
            {
              type: 'bar',
              title: 'Posts por Categoria',
              dataSource: 'instagram_posts',
              metrics: ['count'],
              groupBy: 'category'
            }
          ],
          tables: [
            {
              title: 'Top Posts',
              columns: ['title', 'likes', 'comments', 'engagement'],
              dataSource: 'instagram_posts',
              sortBy: 'engagement',
              limit: 20
            }
          ]
        }
      },
      {
        id: 'web_content',
        name: 'Análise de Conteúdo Web',
        description: 'Relatório de análise de conteúdo de portais e blogs',
        type: 'web',
        category: 'content',
        configuration: {
          charts: [
            {
              type: 'area',
              title: 'Artigos Coletados por Dia',
              dataSource: 'web_articles',
              metrics: ['count'],
              groupBy: 'date'
            },
            {
              type: 'pie',
              title: 'Distribuição por Categoria',
              dataSource: 'web_articles',
              metrics: ['count'],
              groupBy: 'category'
            }
          ],
          tables: [
            {
              title: 'Artigos Recentes',
              columns: ['title', 'sourceName', 'category', 'wordCount', 'scrapedAt'],
              dataSource: 'web_articles',
              sortBy: 'scrapedAt',
              limit: 50
            }
          ]
        }
      },
      {
        id: 'combined_analytics',
        name: 'Analytics Combinado',
        description: 'Relatório combinado de Instagram e Web com métricas comparativas',
        type: 'combined',
        category: 'analytics',
        configuration: {
          charts: [
            {
              type: 'line',
              title: 'Comparativo de Atividade',
              dataSource: 'combined',
              metrics: ['instagram_posts', 'web_articles'],
              groupBy: 'date'
            }
          ],
          tables: [
            {
              title: 'Resumo Geral',
              columns: ['metric', 'instagram', 'web', 'total'],
              dataSource: 'combined_summary'
            }
          ]
        }
      }
    ];

    res.json(templates);
  } catch (error) {
    console.error('Erro ao listar templates:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar relatório a partir de template
router.post('/templates/:templateId/create', [
  param('templateId').notEmpty().withMessage('ID do template é obrigatório'),
  body('title').notEmpty().trim().isLength({ max: 200 }),
  body('dateRange.startDate').isISO8601(),
  body('dateRange.endDate').isISO8601(),
  body('filters').optional().isObject()
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const templateId = req.params.templateId;
    const { title, dateRange, filters = {} } = req.body;

    // Buscar template (aqui você pode implementar um sistema de templates mais robusto)
    const templates = {
      'instagram_performance': {
        type: 'instagram',
        category: 'performance',
        configuration: {
          charts: [
            {
              type: 'line',
              title: 'Engajamento ao Longo do Tempo',
              dataSource: 'instagram_posts',
              metrics: ['likes', 'comments'],
              groupBy: 'date'
            }
          ],
          tables: [
            {
              title: 'Top Posts',
              columns: ['title', 'likes', 'comments', 'engagement'],
              dataSource: 'instagram_posts',
              sortBy: 'engagement',
              limit: 20
            }
          ],
          layout: {
            sections: [
              {
                type: 'chart',
                title: 'Engajamento ao Longo do Tempo',
                size: 'large',
                position: { row: 1, col: 1 },
                config: { chartIndex: 0 }
              },
              {
                type: 'table',
                title: 'Top Posts',
                size: 'full',
                position: { row: 2, col: 1 },
                config: { tableIndex: 0 }
              }
            ]
          }
        }
      }
    };

    const template = templates[templateId as keyof typeof templates];
    if (!template) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }

    const reportData = {
      title,
      description: `Relatório gerado a partir do template ${templateId}`,
      type: template.type,
      category: template.category,
      dateRange,
      filters,
      configuration: template.configuration,
      format: 'pdf'
    };

    const report = await reportService.createReport(reportData, userId);
    res.status(201).json(report);
  } catch (error) {
    console.error('Erro ao criar relatório a partir de template:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;