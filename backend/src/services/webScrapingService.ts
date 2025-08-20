import axios from 'axios';
import * as cheerio from 'cheerio';
import WebSource, { IWebSource } from '../models/WebSource';
import WebArticle, { IWebArticle } from '../models/WebArticle';
import crypto from 'crypto';

interface ScrapingResult {
  success: boolean;
  articlesFound: number;
  errors: string[];
  articles: Partial<IWebArticle>[];
}

interface ArticleData {
  title: string;
  content: string;
  author?: string;
  publishedAt?: Date;
  url: string;
  imageUrl?: string;
  tags: string[];
  links: {
    internal: string[];
    external: string[];
  };
}

class WebScrapingService {
  private readonly defaultHeaders = {
    'User-Agent': 'MonitoringPlatform/1.0 (Web Scraper)'
  };

  async scrapeSource(sourceId: string): Promise<ScrapingResult> {
    try {
      const source = await WebSource.findById(sourceId);
      if (!source || !source.isActive) {
        return {
          success: false,
          articlesFound: 0,
          errors: ['Fonte não encontrada ou inativa'],
          articles: []
        };
      }

      const result = await this.performScraping(source);
      
      // Atualizar estatísticas da fonte
      await this.updateSourceStatistics(source, result);
      
      return result;
    } catch (error) {
      console.error('Erro no scraping:', error);
      return {
        success: false,
        articlesFound: 0,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido'],
        articles: []
      };
    }
  }

  private async performScraping(source: IWebSource): Promise<ScrapingResult> {
    const result: ScrapingResult = {
      success: true,
      articlesFound: 0,
      errors: [],
      articles: []
    };

    try {
      const response = await axios.get(source.url, {
        headers: {
          ...this.defaultHeaders,
          ...source.headers,
          'User-Agent': source.userAgent || this.defaultHeaders['User-Agent']
        },
        timeout: 30000,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      const articles = await this.extractArticles($, source, response.config.url || source.url);
      
      for (const articleData of articles) {
        try {
          const article = await this.processArticle(articleData, source);
          if (article) {
            result.articles.push(article);
            result.articlesFound++;
          }
        } catch (error) {
          result.errors.push(`Erro ao processar artigo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Erro ao acessar ${source.url}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }

    return result;
  }

  private async extractArticles($: cheerio.Root, source: IWebSource, baseUrl: string): Promise<ArticleData[]> {
    const articles: ArticleData[] = [];
    
    // Seletores padrão se não especificados
    const selectors = {
      title: source.selectors.title || 'h1, h2, .title, .headline, [class*="title"]',
      content: source.selectors.content || 'article, .content, .post-content, .entry-content, main',
      author: source.selectors.author || '.author, .by-author, [class*="author"]',
      publishDate: source.selectors.publishDate || 'time, .date, .publish-date, [class*="date"]',
      image: source.selectors.image || 'img[src], .featured-image img',
      links: source.selectors.links || 'a[href]'
    };

    // Extrair artigos da página principal
    const articleElements = $('article, .post, .news-item, [class*="article"], [class*="post"]').slice(0, 20);
    
    articleElements.each((_, element) => {
      try {
        const $article = $(element);
        
        const title = this.extractText($article, selectors.title);
        const content = this.extractText($article, selectors.content);
        const author = this.extractText($article, selectors.author);
        const publishDate = this.extractDate($article, selectors.publishDate);
        const imageUrl = this.extractImageUrl($article, selectors.image, baseUrl);
        const articleUrl = this.extractArticleUrl($article, baseUrl);
        
        if (title && content && articleUrl) {
          const { internal, external } = this.extractLinks($article, selectors.links, baseUrl, $);
          
          articles.push({
            title: title.substring(0, 500),
            content: content.substring(0, 10000),
            author,
            publishedAt: publishDate,
            url: articleUrl,
            imageUrl,
            tags: this.extractTags(content),
            links: { internal, external }
          });
        }
      } catch (error) {
        console.error('Erro ao extrair artigo:', error);
      }
    });

    return articles;
  }

  private extractText($element: cheerio.Cheerio, selector: string): string {
    const text = $element.find(selector).first().text().trim();
    return text || $element.text().trim().substring(0, 1000);
  }

  private extractDate($element: cheerio.Cheerio, selector: string): Date | undefined {
    const dateText = $element.find(selector).first().attr('datetime') || 
                    $element.find(selector).first().text().trim();
    
    if (dateText) {
      const date = new Date(dateText);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  }

  private extractImageUrl($element: cheerio.Cheerio, selector: string, baseUrl: string): string | undefined {
    const imgSrc = $element.find(selector).first().attr('src');
    if (imgSrc) {
      return this.resolveUrl(imgSrc, baseUrl);
    }
    return undefined;
  }

  private extractArticleUrl($element: cheerio.Cheerio, baseUrl: string): string {
    const href = $element.find('a[href]').first().attr('href') || 
                $element.closest('a').attr('href');
    
    if (href) {
      return this.resolveUrl(href, baseUrl);
    }
    return baseUrl;
  }

  private extractLinks($element: cheerio.Cheerio, selector: string, baseUrl: string, $: cheerio.Root): { internal: string[], external: string[] } {
    const internal: string[] = [];
    const external: string[] = [];
    const baseDomain = new URL(baseUrl).hostname;

    $element.find(selector).each((_, link) => {
      const href = $(link).attr('href');
      if (href) {
        const fullUrl = this.resolveUrl(href, baseUrl);
        try {
          const linkDomain = new URL(fullUrl).hostname;
          if (linkDomain === baseDomain) {
            internal.push(fullUrl);
          } else {
            external.push(fullUrl);
          }
        } catch {
          // URL inválida, ignorar
        }
      }
    });

    return { internal: internal.slice(0, 10), external: external.slice(0, 5) };
  }

  private extractTags(content: string): string[] {
    const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const wordCount: Record<string, number> = {};
    
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return baseUrl;
    }
  }

  private async processArticle(articleData: ArticleData, source: IWebSource): Promise<Partial<IWebArticle> | null> {
    // Verificar se já existe
    const hash = crypto.createHash('md5').update(articleData.content).digest('hex');
    const existing = await WebArticle.findOne({ hash });
    
    if (existing) {
      return null; // Artigo já existe
    }

    // Filtrar por palavras-chave
    if (!this.matchesKeywords(articleData.content, source.keywords, source.excludeKeywords)) {
      return null;
    }

    const words = articleData.content.trim().split(/\s+/).length;
    
    return {
      sourceId: source._id as any,
      sourceName: source.name,
      sourceUrl: source.url,
      title: articleData.title,
      content: articleData.content,
      author: articleData.author,
      publishedAt: articleData.publishedAt || new Date(),
      url: articleData.url,
      imageUrl: articleData.imageUrl,
      tags: articleData.tags,
      keywords: source.keywords,
      category: source.category,
      language: source.language,
      wordCount: words,
      readingTime: Math.ceil(words / 200),
      links: articleData.links,
      crawlDepth: 1,
      hash,
      metadata: {
        scrapedFrom: source.url,
        userAgent: source.userAgent
      }
    };
  }

  private matchesKeywords(content: string, keywords: string[], excludeKeywords: string[]): boolean {
    const lowerContent = content.toLowerCase();
    
    // Verificar palavras-chave de exclusão
    if (excludeKeywords.length > 0) {
      const hasExcluded = excludeKeywords.some(keyword => lowerContent.includes(keyword));
      if (hasExcluded) return false;
    }
    
    // Verificar palavras-chave obrigatórias
    if (keywords.length > 0) {
      return keywords.some(keyword => lowerContent.includes(keyword));
    }
    
    return true;
  }

  private async updateSourceStatistics(source: IWebSource, result: ScrapingResult): Promise<void> {
    const updateData: any = {
      lastCrawled: new Date(),
      nextCrawl: new Date(Date.now() + (source.crawlFrequency * 60 * 1000))
    };

    if (result.success) {
      updateData['$inc'] = {
        'statistics.totalArticles': result.articlesFound
      };
      updateData['$unset'] = {
        'statistics.lastError': 1,
        'statistics.lastErrorDate': 1
      };
    } else {
      updateData['statistics.lastError'] = result.errors.join('; ');
      updateData['statistics.lastErrorDate'] = new Date();
    }

    await WebSource.findByIdAndUpdate(source._id, updateData);
  }

  async scrapeAllActiveSources(): Promise<{ success: number, failed: number, totalArticles: number }> {
    const sources = await WebSource.find({ 
      isActive: true,
      nextCrawl: { $lte: new Date() }
    });

    let success = 0;
    let failed = 0;
    let totalArticles = 0;

    for (const source of sources) {
      try {
        const result = await this.scrapeSource((source._id as any).toString());
        if (result.success) {
          success++;
          totalArticles += result.articlesFound;
        } else {
          failed++;
        }
        
        // Delay entre requests
        await new Promise(resolve => setTimeout(resolve, source.crawlSettings.delay));
      } catch (error) {
        failed++;
        console.error(`Erro ao fazer scraping da fonte ${source.name}:`, error);
      }
    }

    return { success, failed, totalArticles };
  }
}

export default new WebScrapingService();