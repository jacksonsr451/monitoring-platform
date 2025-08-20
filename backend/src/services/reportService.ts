import Report, { IReport } from '../models/Report';
import WebSource from '../models/WebSource';
import WebArticle from '../models/WebArticle';
import Project from '../models/Project';
import InstagramProfile from '../models/InstagramProfile';
import InstagramPost from '../models/InstagramPost';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

interface ReportData {
  metrics: any;
  charts: any;
  tables: any;
  summary: any;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }>;
}

export class ReportService {
  private reportsDir: string;

  constructor() {
    this.reportsDir = path.join(process.cwd(), 'reports');
    this.ensureReportsDirectory();
  }

  private ensureReportsDirectory(): void {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  // Listar relatórios do usuário
  async getUserReports(userId: string, filters: any = {}): Promise<{ reports: IReport[], total: number, page: number, totalPages: number }> {
    const { type, category, status, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const query: any = { userId };
    
    if (type) query.type = type;
    if (category) query.category = category;
    if (status) query.status = status;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(query)
    ]);

    return {
      reports: reports as IReport[],
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Criar novo relatório
  async createReport(reportData: any, userId: string): Promise<IReport> {
    const report = new Report({
      ...reportData,
      createdBy: new mongoose.Types.ObjectId(userId),
      status: 'draft'
    });

    return await report.save();
  }



  // Obter relatório por ID
  async getReportById(reportId: string, userId: string): Promise<IReport | null> {
    return await Report.findOne({
      _id: new mongoose.Types.ObjectId(reportId),
      createdBy: new mongoose.Types.ObjectId(userId)
    }).populate('createdBy', 'name email');
  }

  // Atualizar relatório
  async updateReport(
    reportId: string,
    updateData: Partial<IReport>,
    userId: string
  ): Promise<IReport | null> {
    return await Report.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(reportId),
        createdBy: new mongoose.Types.ObjectId(userId)
      },
      updateData,
      { new: true, runValidators: true }
    );
  }

  // Deletar relatório
  async deleteReport(reportId: string, userId: string): Promise<boolean> {
    const result = await Report.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(reportId),
      createdBy: new mongoose.Types.ObjectId(userId)
    });

    if (result && result.fileUrl) {
      // Remover arquivo físico se existir
      const filePath = path.join(this.reportsDir, path.basename(result.fileUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    return !!result;
  }

  // Gerar dados do relatório
  async generateReportData(reportId: string): Promise<ReportData> {
    const report = await Report.findById(reportId);
    if (!report) {
      throw new Error('Relatório não encontrado');
    }

    await Report.findByIdAndUpdate(reportId, { status: 'generating' });

    try {
      const data: ReportData = {
        metrics: {},
        charts: {},
        tables: {},
        summary: {}
      };

      // Gerar métricas baseadas no tipo de relatório
      switch (report.type) {
        case 'instagram':
          data.metrics = await this.generateInstagramMetrics(report);
          break;
        case 'web':
          data.metrics = await this.generateWebMetrics(report);
          break;
        case 'combined':
          data.metrics = {
            ...await this.generateInstagramMetrics(report),
            ...await this.generateWebMetrics(report)
          };
          break;
        case 'custom':
          data.metrics = await this.generateCustomMetrics(report);
          break;
      }

      // Gerar dados dos gráficos
      for (const chartConfig of report.configuration.charts) {
        data.charts[chartConfig.title] = await this.generateChartData(chartConfig, report);
      }

      // Gerar dados das tabelas
      for (const tableConfig of report.configuration.tables) {
        data.tables[tableConfig.title] = await this.generateTableData(tableConfig, report);
      }

      // Gerar resumo
      data.summary = this.generateSummary(data.metrics, report);

      // Salvar dados no relatório
      await Report.findByIdAndUpdate(reportId, {
        data,
        status: 'completed',
        generatedAt: new Date()
      });

      return data;
    } catch (error) {
      await Report.findByIdAndUpdate(reportId, { status: 'error' });
      throw error;
    }
  }

  // Gerar métricas do Instagram
  private async generateInstagramMetrics(report: IReport): Promise<any> {
    const { startDate, endDate } = report.dateRange;
    const projectIds = report.filters.projects || [];

    const profileQuery: any = {
      createdAt: { $gte: startDate, $lte: endDate }
    };
    if (projectIds.length > 0) {
      profileQuery.projectId = { $in: projectIds };
    }

    const profiles = await InstagramProfile.find(profileQuery);
    const profileIds = profiles.map(p => p._id);

    const posts = await InstagramPost.find({
      profileId: { $in: profileIds },
      createdAt: { $gte: startDate, $lte: endDate }
    });

    return {
      totalProfiles: profiles.length,
      totalPosts: posts.length,
      totalLikes: posts.reduce((sum, post) => sum + (post.likesCount || 0), 0),
      totalComments: posts.reduce((sum, post) => sum + (post.commentsCount || 0), 0),
      avgEngagement: posts.length > 0 ? 
        posts.reduce((sum, post) => sum + ((post.likesCount || 0) + (post.commentsCount || 0)), 0) / posts.length : 0,
      topPosts: posts.sort((a, b) => ((b.likesCount || 0) + (b.commentsCount || 0)) - ((a.likesCount || 0) + (a.commentsCount || 0))).slice(0, 10)
    };
  }

  // Gerar métricas da Web
  private async generateWebMetrics(report: IReport): Promise<any> {
    const { startDate, endDate } = report.dateRange;
    const sourceIds = report.filters.sources || [];
    const keywords = report.filters.keywords || [];
    const categories = report.filters.categories || [];

    const articleQuery: any = {
      scrapedAt: { $gte: startDate, $lte: endDate }
    };
    
    if (sourceIds.length > 0) {
      articleQuery.sourceId = { $in: sourceIds };
    }
    
    if (categories.length > 0) {
      articleQuery.category = { $in: categories };
    }
    
    if (keywords.length > 0) {
      articleQuery.$text = { $search: keywords.join(' ') };
    }

    const articles = await WebArticle.find(articleQuery);
    const sources = await WebSource.find({
      _id: { $in: sourceIds.length > 0 ? sourceIds : await WebSource.distinct('_id') }
    });

    return {
      totalSources: sources.length,
      totalArticles: articles.length,
      totalWords: articles.reduce((sum, article) => sum + (article.wordCount || 0), 0),
      avgWordsPerArticle: articles.length > 0 ? 
        articles.reduce((sum, article) => sum + (article.wordCount || 0), 0) / articles.length : 0,
      articlesByCategory: await this.getArticlesByCategory(articleQuery),
      topSources: await this.getTopSources(articleQuery),
      dailyArticles: await this.getDailyArticles(articleQuery)
    };
  }

  // Gerar métricas customizadas
  private async generateCustomMetrics(report: IReport): Promise<any> {
    // Implementar lógica para métricas customizadas baseadas na configuração
    return {
      customMetric1: 0,
      customMetric2: 0
    };
  }

  // Gerar dados para gráficos
  private async generateChartData(chartConfig: any, report: IReport): Promise<ChartData> {
    const { type, dataSource, metrics, groupBy } = chartConfig;
    const { startDate, endDate } = report.dateRange;

    switch (dataSource) {
      case 'web_articles':
        return await this.generateWebChartData(chartConfig, report);
      case 'instagram_posts':
        return await this.generateInstagramChartData(chartConfig, report);
      default:
        return { labels: [], datasets: [] };
    }
  }

  // Gerar dados de gráfico para web
  private async generateWebChartData(chartConfig: any, report: IReport): Promise<ChartData> {
    const { startDate, endDate } = report.dateRange;
    
    if (chartConfig.groupBy === 'date') {
      const dailyData = await WebArticle.aggregate([
        {
          $match: {
            scrapedAt: { $gte: startDate, $lte: endDate }
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

      return {
        labels: dailyData.map(d => d._id),
        datasets: [{
          label: 'Artigos por Dia',
          data: dailyData.map(d => d.count),
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)'
        }]
      };
    }

    return { labels: [], datasets: [] };
  }

  // Gerar dados de gráfico para Instagram
  private async generateInstagramChartData(chartConfig: any, report: IReport): Promise<ChartData> {
    // Implementar lógica similar para dados do Instagram
    return { labels: [], datasets: [] };
  }

  // Gerar dados para tabelas
  private async generateTableData(tableConfig: any, report: IReport): Promise<any[]> {
    const { dataSource, columns, sortBy, limit } = tableConfig;
    const { startDate, endDate } = report.dateRange;

    switch (dataSource) {
      case 'web_articles':
        return await this.generateWebTableData(tableConfig, report);
      case 'instagram_posts':
        return await this.generateInstagramTableData(tableConfig, report);
      default:
        return [];
    }
  }

  // Gerar dados de tabela para web
  private async generateWebTableData(tableConfig: any, report: IReport): Promise<any[]> {
    const { startDate, endDate } = report.dateRange;
    const { columns, sortBy, limit = 50 } = tableConfig;

    const query = WebArticle.find({
      scrapedAt: { $gte: startDate, $lte: endDate }
    }).select(columns.join(' '));

    if (sortBy) {
      query.sort({ [sortBy]: -1 });
    }

    return await query.limit(limit);
  }

  // Gerar dados de tabela para Instagram
  private async generateInstagramTableData(tableConfig: any, report: IReport): Promise<any[]> {
    // Implementar lógica similar para dados do Instagram
    return [];
  }

  // Gerar resumo do relatório
  private generateSummary(metrics: any, report: IReport): any {
    const { startDate, endDate } = report.dateRange;
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        days: periodDays
      },
      highlights: this.generateHighlights(metrics),
      recommendations: this.generateRecommendations(metrics)
    };
  }

  // Gerar destaques
  private generateHighlights(metrics: any): string[] {
    const highlights: string[] = [];

    if (metrics.totalArticles) {
      highlights.push(`${metrics.totalArticles} artigos coletados no período`);
    }
    if (metrics.totalPosts) {
      highlights.push(`${metrics.totalPosts} posts do Instagram analisados`);
    }
    if (metrics.avgEngagement) {
      highlights.push(`Engajamento médio de ${metrics.avgEngagement.toFixed(2)}`);
    }

    return highlights;
  }

  // Gerar recomendações
  private generateRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.avgEngagement && metrics.avgEngagement < 100) {
      recommendations.push('Considere estratégias para aumentar o engajamento');
    }
    if (metrics.totalArticles && metrics.totalArticles < 10) {
      recommendations.push('Adicione mais fontes de monitoramento para obter mais dados');
    }

    return recommendations;
  }

  // Métodos auxiliares para agregações
  private async getArticlesByCategory(query: any): Promise<any[]> {
    return await WebArticle.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
  }

  private async getTopSources(query: any): Promise<any[]> {
    return await WebArticle.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$sourceName',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
  }

  private async getDailyArticles(query: any): Promise<any[]> {
    return await WebArticle.aggregate([
      { $match: query },
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
  }

  // Exportar relatório em PDF
  async exportToPDF(reportId: string): Promise<string> {
    const report = await Report.findById(reportId).populate('createdBy', 'name');
    if (!report || !report.data) {
      throw new Error('Relatório não encontrado ou não gerado');
    }

    const fileName = `report_${reportId}_${Date.now()}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));

    // Cabeçalho
    doc.fontSize(20).text(report.title, 50, 50);
    doc.fontSize(12).text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 50, 80);
    doc.text(`Período: ${report.dateRange.startDate.toLocaleDateString('pt-BR')} - ${report.dateRange.endDate.toLocaleDateString('pt-BR')}`, 50, 100);

    // Métricas principais
    let yPosition = 140;
    doc.fontSize(16).text('Métricas Principais', 50, yPosition);
    yPosition += 30;

    Object.entries(report.data.metrics).forEach(([key, value]) => {
      doc.fontSize(12).text(`${key}: ${value}`, 50, yPosition);
      yPosition += 20;
    });

    // Resumo
    if (report.data.summary.highlights) {
      yPosition += 20;
      doc.fontSize(16).text('Destaques', 50, yPosition);
      yPosition += 30;

      report.data.summary.highlights.forEach((highlight: string) => {
        doc.fontSize(12).text(`• ${highlight}`, 50, yPosition);
        yPosition += 20;
      });
    }

    doc.end();

    // Atualizar relatório com URL do arquivo
    const fileUrl = `/reports/${fileName}`;
    const stats = fs.statSync(filePath);
    await Report.findByIdAndUpdate(reportId, {
      fileUrl,
      fileSize: stats.size
    });

    return fileUrl;
  }

  // Exportar relatório em Excel
  async exportToExcel(reportId: string): Promise<string> {
    const report = await Report.findById(reportId);
    if (!report || !report.data) {
      throw new Error('Relatório não encontrado ou não gerado');
    }

    const fileName = `report_${reportId}_${Date.now()}.xlsx`;
    const filePath = path.join(this.reportsDir, fileName);

    const workbook = new ExcelJS.Workbook();
    
    // Planilha de métricas
    const metricsSheet = workbook.addWorksheet('Métricas');
    metricsSheet.addRow(['Métrica', 'Valor']);
    
    Object.entries(report.data.metrics).forEach(([key, value]) => {
      metricsSheet.addRow([key, value]);
    });

    // Planilhas para cada tabela
    Object.entries(report.data.tables).forEach(([tableName, tableData]: [string, any]) => {
      const sheet = workbook.addWorksheet(tableName);
      if (Array.isArray(tableData) && tableData.length > 0) {
        const headers = Object.keys(tableData[0]);
        sheet.addRow(headers);
        
        tableData.forEach(row => {
          sheet.addRow(headers.map(header => row[header]));
        });
      }
    });

    await workbook.xlsx.writeFile(filePath);

    // Atualizar relatório com URL do arquivo
    const fileUrl = `/reports/${fileName}`;
    const stats = fs.statSync(filePath);
    await Report.findByIdAndUpdate(reportId, {
      fileUrl,
      fileSize: stats.size
    });

    return fileUrl;
  }

  // Agendar relatório
  async scheduleReport(reportId: string, schedule: any): Promise<void> {
    const nextRun = this.calculateNextRun(schedule);
    
    await Report.findByIdAndUpdate(reportId, {
      isScheduled: true,
      schedule: {
        ...schedule,
        nextRun
      }
    });
  }

  // Calcular próxima execução
  private calculateNextRun(schedule: any): Date {
    const now = new Date();
    const nextRun = new Date();

    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(now.getDate() + (7 - now.getDay() + schedule.dayOfWeek) % 7);
        break;
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1, schedule.dayOfMonth);
        break;
      case 'quarterly':
        nextRun.setMonth(now.getMonth() + 3, schedule.dayOfMonth);
        break;
    }

    const [hours, minutes] = schedule.time.split(':');
    nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    return nextRun;
  }

  // Processar relatórios agendados
  async processScheduledReports(): Promise<void> {
    const scheduledReports = await Report.find({
      isScheduled: true,
      'schedule.nextRun': { $lte: new Date() }
    });

    for (const report of scheduledReports) {
      try {
        await this.generateReportData(report._id.toString());
        
        if (report.format === 'pdf') {
          await this.exportToPDF(report._id.toString());
        } else if (report.format === 'excel') {
          await this.exportToExcel(report._id.toString());
        }

        // Atualizar próxima execução
        const nextRun = this.calculateNextRun(report.schedule);
        await Report.findByIdAndUpdate(report._id, {
          'schedule.nextRun': nextRun
        });

        // Enviar por email se configurado
        if (report.recipients && report.recipients.length > 0) {
          // Implementar envio de email
        }
      } catch (error) {
        console.error(`Erro ao processar relatório agendado ${report._id}:`, error);
      }
    }
  }
}

const reportServiceInstance = new ReportService();

// Exportações nomeadas para compatibilidade
export const getUserReports = reportServiceInstance.getUserReports.bind(reportServiceInstance);
export const createReport = reportServiceInstance.createReport.bind(reportServiceInstance);
export const getReportById = reportServiceInstance.getReportById.bind(reportServiceInstance);
export const updateReport = reportServiceInstance.updateReport.bind(reportServiceInstance);
export const deleteReport = reportServiceInstance.deleteReport.bind(reportServiceInstance);
export const generateReportData = reportServiceInstance.generateReportData.bind(reportServiceInstance);
export const exportToPDF = reportServiceInstance.exportToPDF.bind(reportServiceInstance);
export const exportToExcel = reportServiceInstance.exportToExcel.bind(reportServiceInstance);
export const scheduleReport = reportServiceInstance.scheduleReport.bind(reportServiceInstance);

export default reportServiceInstance;