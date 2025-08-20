import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import MonitoringData from '../models/MonitoringData';
import Project from '../models/Project';
import { analyzeSentiment } from '../utils/sentimentAnalysis';

interface ScrapedArticle {
  title: string;
  content: string;
  url: string;
  author?: string;
  publishedAt: Date;
  domain: string;
  images: string[];
  tags: string[];
  category?: string;
}

interface NewsSource {
  name: string;
  baseUrl: string;
  selectors: {
    title: string;
    content: string;
    author?: string;
    date?: string;
    image?: string;
  };
  rssUrl?: string;
}

class WebScrapingService {
  private browser: any = null;
  private isInitialized = false;

  // Common news sources with their selectors
  private newsSources: NewsSource[] = [
    {
      name: 'G1',
      baseUrl: 'https://g1.globo.com',
      selectors: {
        title: 'h1.content-head__title',
        content: '.content-text__container p',
        author: '.content-publication-data__from',
        date: '.content-publication-data__updated time',
        image: '.content-media__image img'
      },
      rssUrl: 'https://g1.globo.com/rss/g1/'
    },
    {
      name: 'Folha de S.Paulo',
      baseUrl: 'https://folha.uol.com.br',
      selectors: {
        title: 'h1.c-content-head__title',
        content: '.c-news__body p',
        author: '.c-signature__author',
        date: 'time.c-signature__time',
        image: '.c-news__image img'
      }
    },
    {
      name: 'UOL',
      baseUrl: 'https://uol.com.br',
      selectors: {
        title: 'h1.custom-title',
        content: '.text p',
        author: '.author',
        date: '.publish-date',
        image: '.news-image img'
      }
    },
    {
      name: 'Estadão',
      baseUrl: 'https://estadao.com.br',
      selectors: {
        title: 'h1.title',
        content: '.content p',
        author: '.author-name',
        date: '.date',
        image: '.featured-image img'
      }
    }
  ];

  async initialize() {
    if (this.isInitialized) return;

    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      this.isInitialized = true;
      console.log('Web scraping service initialized');
    } catch (error) {
      console.error('Failed to initialize web scraping service:', error);
      throw error;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.isInitialized = false;
    }
  }

  // Search for articles containing keywords
  async searchByKeywords(keywords: string[], sources: string[] = [], limit: number = 50): Promise<ScrapedArticle[]> {
    const articles: ScrapedArticle[] = [];

    for (const keyword of keywords) {
      try {
        // Search Google News for the keyword
        const googleResults = await this.searchGoogleNews(keyword, limit / keywords.length);
        articles.push(...googleResults);

        // Search specific news sources
        for (const source of this.newsSources) {
          if (sources.length === 0 || sources.includes(source.name)) {
            try {
              const sourceResults = await this.searchNewsSource(source, keyword, 10);
              articles.push(...sourceResults);
            } catch (error) {
              console.error(`Error searching ${source.name}:`, error);
            }
          }
        }

        // Add delay between keyword searches
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error searching keyword ${keyword}:`, error);
      }
    }

    // Remove duplicates based on URL
    const uniqueArticles = articles.filter((article, index, self) => 
      index === self.findIndex(a => a.url === article.url)
    );

    return uniqueArticles.slice(0, limit);
  }

  // Search Google News for keyword
  private async searchGoogleNews(keyword: string, limit: number = 20): Promise<ScrapedArticle[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const page = await this.browser.newPage();
    const articles: ScrapedArticle[] = [];

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      const searchUrl = `https://news.google.com/search?q=${encodeURIComponent(keyword)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Wait for articles to load
      await page.waitForSelector('article', { timeout: 10000 });

      const articleData = await page.evaluate((limitArticles) => {
        const articles = [];
        const articleElements = document.querySelectorAll('article');
        
        for (let i = 0; i < Math.min(articleElements.length, limitArticles); i++) {
          const article = articleElements[i];
          
          const titleElement = article.querySelector('h3 a, h4 a');
          const title = titleElement?.textContent?.trim() || '';
          const relativeUrl = titleElement?.getAttribute('href') || '';
          
          const timeElement = article.querySelector('time');
          const timeText = timeElement?.getAttribute('datetime') || timeElement?.textContent || '';
          
          const sourceElement = article.querySelector('[data-n-tid]');
          const source = sourceElement?.textContent?.trim() || '';
          
          if (title && relativeUrl) {
            articles.push({
              title,
              relativeUrl,
              timeText,
              source
            });
          }
        }
        
        return articles;
      }, limit);

      // Get full article content for each result
      for (const articleInfo of articleData) {
        try {
          if (articleInfo.relativeUrl.startsWith('./')) {
            const fullUrl = `https://news.google.com${articleInfo.relativeUrl.substring(1)}`;
            
            // Get the actual article URL from Google News redirect
            const actualUrl = await this.getActualUrlFromGoogleNews(fullUrl);
            if (actualUrl) {
              const articleContent = await this.scrapeArticleContent(actualUrl);
              if (articleContent) {
                articles.push({
                  ...articleContent,
                  title: articleInfo.title,
                  publishedAt: this.parseDate(articleInfo.timeText)
                });
              }
            }
          }
        } catch (error) {
          console.error('Error processing Google News article:', error);
        }
      }

    } catch (error) {
      console.error('Error searching Google News:', error);
    } finally {
      await page.close();
    }

    return articles;
  }

  // Get actual URL from Google News redirect
  private async getActualUrlFromGoogleNews(googleUrl: string): Promise<string | null> {
    try {
      const response = await axios.get(googleUrl, {
        maxRedirects: 5,
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      return response.request.res.responseUrl || response.config.url;
    } catch (error) {
      console.error('Error getting actual URL:', error);
      return null;
    }
  }

  // Search specific news source
  private async searchNewsSource(source: NewsSource, keyword: string, limit: number = 10): Promise<ScrapedArticle[]> {
    const articles: ScrapedArticle[] = [];

    try {
      // If RSS is available, use it
      if (source.rssUrl) {
        const rssArticles = await this.searchRSSFeed(source.rssUrl, keyword, limit);
        articles.push(...rssArticles);
      }

      // Also try site search if available
      const searchUrl = `${source.baseUrl}/busca/?q=${encodeURIComponent(keyword)}`;
      const searchResults = await this.scrapeSearchResults(searchUrl, source, limit);
      articles.push(...searchResults);

    } catch (error) {
      console.error(`Error searching ${source.name}:`, error);
    }

    return articles;
  }

  // Search RSS feed for keyword
  private async searchRSSFeed(rssUrl: string, keyword: string, limit: number = 10): Promise<ScrapedArticle[]> {
    const articles: ScrapedArticle[] = [];

    try {
      const response = await axios.get(rssUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      const items = $('item').slice(0, limit * 2); // Get more items to filter

      for (let i = 0; i < items.length && articles.length < limit; i++) {
        const item = $(items[i]);
        const title = item.find('title').text();
        const description = item.find('description').text();
        const link = item.find('link').text();
        const pubDate = item.find('pubDate').text();

        // Check if keyword is mentioned in title or description
        if (title.toLowerCase().includes(keyword.toLowerCase()) || 
            description.toLowerCase().includes(keyword.toLowerCase())) {
          
          const articleContent = await this.scrapeArticleContent(link);
          if (articleContent) {
            articles.push({
              ...articleContent,
              title,
              publishedAt: new Date(pubDate)
            });
          }
        }
      }

    } catch (error) {
      console.error('Error searching RSS feed:', error);
    }

    return articles;
  }

  // Scrape search results from a news site
  private async scrapeSearchResults(searchUrl: string, source: NewsSource, limit: number = 10): Promise<ScrapedArticle[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const page = await this.browser.newPage();
    const articles: ScrapedArticle[] = [];

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // Extract article links from search results
      const articleLinks = await page.evaluate(() => {
        const links = [];
        const linkElements = document.querySelectorAll('a[href*="/"]');
        
        for (const link of linkElements) {
          const href = link.getAttribute('href');
          const text = link.textContent?.trim();
          
          if (href && text && text.length > 20) {
            links.push({
              url: href.startsWith('http') ? href : window.location.origin + href,
              title: text
            });
          }
        }
        
        return links;
      });

      // Scrape content from each article
      for (let i = 0; i < Math.min(articleLinks.length, limit); i++) {
        try {
          const articleContent = await this.scrapeArticleContent(articleLinks[i].url);
          if (articleContent) {
            articles.push(articleContent);
          }
        } catch (error) {
          console.error('Error scraping article:', error);
        }
      }

    } catch (error) {
      console.error('Error scraping search results:', error);
    } finally {
      await page.close();
    }

    return articles;
  }

  // Scrape content from a specific article URL
  private async scrapeArticleContent(url: string): Promise<ScrapedArticle | null> {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const domain = new URL(url).hostname;

      // Find appropriate selectors based on domain
      const source = this.newsSources.find(s => domain.includes(s.baseUrl.replace('https://', '')));
      
      let title = '';
      let content = '';
      let author = '';
      let publishedAt = new Date();
      let images: string[] = [];

      if (source) {
        // Use specific selectors for known sources
        title = $(source.selectors.title).first().text().trim();
        
        const contentElements = $(source.selectors.content);
        content = contentElements.map((_, el) => $(el).text()).get().join(' ').trim();
        
        if (source.selectors.author) {
          author = $(source.selectors.author).first().text().trim();
        }
        
        if (source.selectors.date) {
          const dateText = $(source.selectors.date).first().attr('datetime') || $(source.selectors.date).first().text();
          publishedAt = this.parseDate(dateText);
        }
        
        if (source.selectors.image) {
          $(source.selectors.image).each((_, el) => {
            const src = $(el).attr('src');
            if (src) {
              images.push(src.startsWith('http') ? src : new URL(src, url).href);
            }
          });
        }
      } else {
        // Use generic selectors for unknown sources
        title = $('h1').first().text().trim() || 
                $('title').text().trim() || 
                $('[property="og:title"]').attr('content') || '';
        
        // Try multiple content selectors
        const contentSelectors = ['article p', '.content p', '.post-content p', '.entry-content p', 'main p', 'p'];
        for (const selector of contentSelectors) {
          const elements = $(selector);
          if (elements.length > 0) {
            content = elements.map((_, el) => $(el).text()).get().join(' ').trim();
            if (content.length > 100) break;
          }
        }
        
        // Try to find author
        const authorSelectors = ['.author', '.byline', '[rel="author"]', '.post-author'];
        for (const selector of authorSelectors) {
          const authorText = $(selector).first().text().trim();
          if (authorText) {
            author = authorText;
            break;
          }
        }
        
        // Try to find publication date
        const dateSelectors = ['time', '.date', '.published', '[property="article:published_time"]'];
        for (const selector of dateSelectors) {
          const dateElement = $(selector).first();
          const dateText = dateElement.attr('datetime') || dateElement.text();
          if (dateText) {
            publishedAt = this.parseDate(dateText);
            break;
          }
        }
        
        // Extract images
        $('img').each((_, el) => {
          const src = $(el).attr('src');
          if (src && !src.includes('logo') && !src.includes('icon')) {
            images.push(src.startsWith('http') ? src : new URL(src, url).href);
          }
        });
      }

      if (!title || !content || content.length < 100) {
        return null;
      }

      return {
        title,
        content,
        url,
        author,
        publishedAt,
        domain,
        images: images.slice(0, 5), // Limit to 5 images
        tags: this.extractTags(content)
      };

    } catch (error) {
      console.error(`Error scraping article content from ${url}:`, error);
      return null;
    }
  }

  // Extract tags/keywords from content
  private extractTags(content: string): string[] {
    const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const wordCount: { [key: string]: number } = {};
    
    words.forEach(word => {
      if (!this.isStopWord(word)) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  // Check if word is a stop word
  private isStopWord(word: string): boolean {
    const stopWords = [
      'que', 'de', 'do', 'da', 'em', 'um', 'uma', 'com', 'não', 'para',
      'por', 'mais', 'como', 'mas', 'foi', 'ao', 'ele', 'das', 'tem',
      'à', 'seu', 'sua', 'ou', 'ser', 'quando', 'muito', 'há', 'nos',
      'já', 'está', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso',
      'ela', 'entre', 'era', 'depois', 'sem', 'mesmo', 'aos', 'ter',
      'seus', 'suas', 'numa', 'pelos', 'pelas', 'esse', 'essa', 'num',
      'nem', 'suas', 'meu', 'às', 'minha', 'têm', 'numa', 'pelos',
      'pelas', 'seu', 'sua', 'dele', 'dela', 'outros', 'outras'
    ];
    return stopWords.includes(word);
  }

  // Parse date from various formats
  private parseDate(dateString: string): Date {
    if (!dateString) return new Date();
    
    // Try ISO format first
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
    
    // Try Brazilian format (dd/mm/yyyy)
    const brMatch = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (brMatch) {
      return new Date(parseInt(brMatch[3]), parseInt(brMatch[2]) - 1, parseInt(brMatch[1]));
    }
    
    // Try relative dates
    if (dateString.includes('hora')) {
      const hours = parseInt(dateString.match(/\d+/)?.[0] || '1');
      return new Date(Date.now() - hours * 60 * 60 * 1000);
    }
    
    if (dateString.includes('dia')) {
      const days = parseInt(dateString.match(/\d+/)?.[0] || '1');
      return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }
    
    return new Date();
  }

  // Monitor project for web content
  async monitorProject(projectId: string): Promise<void> {
    try {
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      console.log(`Starting web monitoring for project: ${project.name}`);

      // Search for articles containing project keywords
      const articles = await this.searchByKeywords(
        project.keywords,
        [], // Search all sources
        project.settings.maxResults || 100
      );

      console.log(`Found ${articles.length} articles for project: ${project.name}`);

      // Save articles to database
      for (const article of articles) {
        await this.saveArticleData(project._id, article, project.keywords);
      }

      console.log(`Completed web monitoring for project: ${project.name}`);
    } catch (error) {
      console.error('Error in web monitoring:', error);
      throw error;
    }
  }

  // Save article data to database
  private async saveArticleData(projectId: string, article: ScrapedArticle, keywords: string[]): Promise<void> {
    try {
      // Check if article already exists
      const existingArticle = await MonitoringData.findOne({
        project: projectId,
        'metadata.url': article.url
      });

      if (existingArticle) {
        return;
      }

      // Find matched keywords
      const matchedKeywords = keywords.filter(keyword => 
        article.title.toLowerCase().includes(keyword.toLowerCase()) ||
        article.content.toLowerCase().includes(keyword.toLowerCase())
      );

      if (matchedKeywords.length === 0) {
        return; // Skip if no keywords match
      }

      // Analyze sentiment
      const sentiment = await analyzeSentiment(article.content);

      // Determine content type based on domain
      let contentType = 'article';
      if (article.domain.includes('blog')) {
        contentType = 'blog_post';
      }

      // Determine source type
      let source = 'website';
      const newsDomains = ['g1.globo.com', 'folha.uol.com.br', 'uol.com.br', 'estadao.com.br', 'cnn.com.br', 'bbc.com'];
      if (newsDomains.some(domain => article.domain.includes(domain))) {
        source = 'news';
      } else if (article.domain.includes('blog')) {
        source = 'blog';
      }

      // Create new monitoring data entry
      const monitoringData = new MonitoringData({
        project: projectId,
        source,
        contentType,
        text: `${article.title}\n\n${article.content}`,
        images: article.images,
        author: {
          displayName: article.author || 'Unknown',
          profileUrl: article.url
        },
        engagement: {
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0
        },
        metadata: {
          url: article.url,
          title: article.title,
          domain: article.domain,
          publishedAt: article.publishedAt,
          language: 'pt',
          tags: article.tags
        },
        sentiment,
        matchedKeywords,
        matchedHashtags: []
      });

      await monitoringData.save();
      console.log(`Saved article: ${article.title}`);

    } catch (error) {
      console.error('Error saving article data:', error);
    }
  }
}

export default new WebScrapingService();