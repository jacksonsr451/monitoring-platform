import axios from 'axios';
import puppeteer from 'puppeteer';
import MonitoringData from '../models/MonitoringData';
import InstagramProfile from '../models/InstagramProfile';
import Project from '../models/Project';
import { analyzeSentiment } from '../utils/sentimentAnalysis';

interface InstagramPost {
  id: string;
  shortcode: string;
  caption: string;
  mediaType: 'photo' | 'video' | 'carousel';
  mediaUrl: string;
  thumbnailUrl?: string;
  likes: number;
  comments: number;
  timestamp: Date;
  owner: {
    id: string;
    username: string;
    fullName: string;
    profilePicUrl: string;
    isVerified: boolean;
  };
  hashtags: string[];
  mentions: string[];
  location?: {
    name: string;
    id: string;
  };
}

interface InstagramComment {
  id: string;
  text: string;
  timestamp: Date;
  likes: number;
  owner: {
    id: string;
    username: string;
    profilePicUrl: string;
  };
}

class InstagramService {
  private browser: any = null;
  private isInitialized = false;

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
      console.log('Instagram service initialized');
    } catch (error) {
      console.error('Failed to initialize Instagram service:', error);
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

  // Search for posts by hashtag
  async searchByHashtag(hashtag: string, limit: number = 50): Promise<InstagramPost[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const page = await this.browser.newPage();
    const posts: InstagramPost[] = [];

    try {
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to hashtag page
      const url = `https://www.instagram.com/explore/tags/${hashtag.replace('#', '')}/`;
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Wait for posts to load
      await page.waitForSelector('article', { timeout: 10000 });

      // Extract post data
      const postData = await page.evaluate((limitPosts) => {
        const posts = [];
        const articles = document.querySelectorAll('article a[href*="/p/"]');
        
        for (let i = 0; i < Math.min(articles.length, limitPosts); i++) {
          const article = articles[i];
          const href = article.getAttribute('href');
          if (href) {
            const shortcode = href.split('/p/')[1]?.split('/')[0];
            if (shortcode) {
              posts.push({ shortcode });
            }
          }
        }
        
        return posts;
      }, limit);

      // Get detailed data for each post
      for (const postInfo of postData) {
        try {
          const postDetails = await this.getPostDetails(postInfo.shortcode);
          if (postDetails) {
            posts.push(postDetails);
          }
        } catch (error) {
          console.error(`Error getting post details for ${postInfo.shortcode}:`, error);
        }
      }

    } catch (error) {
      console.error(`Error searching hashtag ${hashtag}:`, error);
    } finally {
      await page.close();
    }

    return posts;
  }

  // Get detailed post information
  async getPostDetails(shortcode: string): Promise<InstagramPost | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const page = await this.browser.newPage();

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      const url = `https://www.instagram.com/p/${shortcode}/`;
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Wait for post to load
      await page.waitForSelector('article', { timeout: 10000 });

      const postData = await page.evaluate(() => {
        try {
          // Extract data from page
          const article = document.querySelector('article');
          if (!article) return null;

          // Get caption
          const captionElement = article.querySelector('div[data-testid="post-caption"] span, h1');
          const caption = captionElement?.textContent || '';

          // Get likes count
          const likesElement = article.querySelector('button[data-testid="like-button"] + div, section button span');
          const likesText = likesElement?.textContent || '0';
          const likes = parseInt(likesText.replace(/[^0-9]/g, '')) || 0;

          // Get comments count
          const commentsElement = article.querySelector('a[href*="/comments/"] span, div[role="button"] span');
          const commentsText = commentsElement?.textContent || '0';
          const comments = parseInt(commentsText.replace(/[^0-9]/g, '')) || 0;

          // Get media URL
          const mediaElement = article.querySelector('img, video');
          const mediaUrl = mediaElement?.getAttribute('src') || '';

          // Get owner info
          const ownerElement = article.querySelector('header a');
          const username = ownerElement?.textContent || '';
          const profileLink = ownerElement?.getAttribute('href') || '';

          // Extract hashtags and mentions
          const hashtags = [];
          const mentions = [];
          const hashtagMatches = caption.match(/#[\w]+/g);
          const mentionMatches = caption.match(/@[\w.]+/g);
          
          if (hashtagMatches) hashtags.push(...hashtagMatches);
          if (mentionMatches) mentions.push(...mentionMatches);

          return {
            caption,
            likes,
            comments,
            mediaUrl,
            username,
            profileLink,
            hashtags,
            mentions
          };
        } catch (error) {
          console.error('Error extracting post data:', error);
          return null;
        }
      });

      if (!postData) return null;

      const post: InstagramPost = {
        id: shortcode,
        shortcode,
        caption: postData.caption,
        mediaType: postData.mediaUrl.includes('.mp4') ? 'video' : 'photo',
        mediaUrl: postData.mediaUrl,
        likes: postData.likes,
        comments: postData.comments,
        timestamp: new Date(), // Would need to extract actual timestamp
        owner: {
          id: postData.username,
          username: postData.username,
          fullName: postData.username,
          profilePicUrl: '',
          isVerified: false
        },
        hashtags: postData.hashtags,
        mentions: postData.mentions
      };

      return post;

    } catch (error) {
      console.error(`Error getting post details for ${shortcode}:`, error);
      return null;
    } finally {
      await page.close();
    }
  }

  // Get comments for a post
  async getPostComments(shortcode: string, limit: number = 50): Promise<InstagramComment[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const page = await this.browser.newPage();
    const comments: InstagramComment[] = [];

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      const url = `https://www.instagram.com/p/${shortcode}/`;
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Wait for comments to load
      await page.waitForSelector('article', { timeout: 10000 });

      // Try to load more comments
      try {
        const loadMoreButton = await page.$('button[aria-label="Load more comments"]');
        if (loadMoreButton) {
          await loadMoreButton.click();
          await page.waitForTimeout(2000);
        }
      } catch (error) {
        // No more comments to load
      }

      const commentData = await page.evaluate((limitComments) => {
        const comments = [];
        const commentElements = document.querySelectorAll('div[role="button"] div[dir="auto"]');
        
        for (let i = 0; i < Math.min(commentElements.length, limitComments); i++) {
          const element = commentElements[i];
          const text = element.textContent || '';
          
          if (text && text.length > 0) {
            // Try to find username (usually in a link before the comment)
            const usernameElement = element.closest('div')?.querySelector('a');
            const username = usernameElement?.textContent || 'unknown';
            
            comments.push({
              id: `comment_${i}`,
              text,
              username,
              timestamp: new Date().toISOString(),
              likes: 0
            });
          }
        }
        
        return comments;
      }, limit);

      for (const comment of commentData) {
        comments.push({
          id: comment.id,
          text: comment.text,
          timestamp: new Date(comment.timestamp),
          likes: comment.likes,
          owner: {
            id: comment.username,
            username: comment.username,
            profilePicUrl: ''
          }
        });
      }

    } catch (error) {
      console.error(`Error getting comments for ${shortcode}:`, error);
    } finally {
      await page.close();
    }

    return comments;
  }

  // Monitor project keywords and hashtags
  async monitorProject(projectId: string): Promise<void> {
    try {
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      console.log(`Starting Instagram monitoring for project: ${project.name}`);

      // Monitor hashtags
      for (const hashtag of project.hashtags) {
        try {
          console.log(`Monitoring hashtag: ${hashtag}`);
          const posts = await this.searchByHashtag(hashtag, project.settings.maxResults || 50);
          
          for (const post of posts) {
            await this.savePostData(project._id, post, hashtag);
            
            // Get comments if enabled
            if (project.sources.instagram.includeComments) {
              const comments = await this.getPostComments(post.shortcode, 20);
              for (const comment of comments) {
                await this.saveCommentData(project._id, post, comment);
              }
            }
          }
          
          // Add delay between hashtag searches
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
          console.error(`Error monitoring hashtag ${hashtag}:`, error);
        }
      }

      console.log(`Completed Instagram monitoring for project: ${project.name}`);
    } catch (error) {
      console.error('Error in monitorProject:', error);
      throw error;
    }
  }

  // Save post data to database
  private async savePostData(projectId: string, post: InstagramPost, matchedHashtag: string): Promise<void> {
    try {
      // Check if post already exists
      const existingPost = await MonitoringData.findOne({
        project: projectId,
        'metadata.postId': post.id
      });

      if (existingPost) {
        // Update engagement metrics
        existingPost.engagement.likes = post.likes;
        existingPost.engagement.comments = post.comments;
        existingPost.updatedAt = new Date();
        await existingPost.save();
        return;
      }

      // Analyze sentiment
      const sentiment = await analyzeSentiment(post.caption);

      // Create new monitoring data entry
      const monitoringData = new MonitoringData({
        project: projectId,
        source: 'instagram',
        contentType: post.mediaType === 'video' ? 'reel' : 'post',
        text: post.caption,
        images: post.mediaType !== 'video' ? [post.mediaUrl] : [],
        videos: post.mediaType === 'video' ? [post.mediaUrl] : [],
        author: {
          id: post.owner.id,
          username: post.owner.username,
          displayName: post.owner.fullName,
          profileUrl: `https://instagram.com/${post.owner.username}`,
          profilePicture: post.owner.profilePicUrl,
          verified: post.owner.isVerified
        },
        engagement: {
          likes: post.likes,
          comments: post.comments,
          shares: 0,
          views: 0
        },
        metadata: {
          postId: post.id,
          url: `https://instagram.com/p/${post.shortcode}`,
          publishedAt: post.timestamp,
          language: 'pt', // Would need language detection
          hashtags: post.hashtags,
          mentions: post.mentions,
          location: post.location?.name
        },
        sentiment,
        matchedKeywords: [],
        matchedHashtags: [matchedHashtag]
      });

      await monitoringData.save();

      // Update or create Instagram profile
      await this.updateInstagramProfile(projectId, post.owner);

    } catch (error) {
      console.error('Error saving post data:', error);
    }
  }

  // Save comment data to database
  private async saveCommentData(projectId: string, post: InstagramPost, comment: InstagramComment): Promise<void> {
    try {
      // Check if comment already exists
      const existingComment = await MonitoringData.findOne({
        project: projectId,
        'metadata.commentId': comment.id
      });

      if (existingComment) return;

      // Analyze sentiment
      const sentiment = await analyzeSentiment(comment.text);

      // Create new monitoring data entry for comment
      const monitoringData = new MonitoringData({
        project: projectId,
        source: 'instagram',
        contentType: 'comment',
        text: comment.text,
        author: {
          id: comment.owner.id,
          username: comment.owner.username,
          displayName: comment.owner.username,
          profileUrl: `https://instagram.com/${comment.owner.username}`,
          profilePicture: comment.owner.profilePicUrl
        },
        engagement: {
          likes: comment.likes,
          comments: 0,
          shares: 0,
          views: 0
        },
        metadata: {
          commentId: comment.id,
          parentPostId: post.id,
          url: `https://instagram.com/p/${post.shortcode}`,
          publishedAt: comment.timestamp,
          language: 'pt'
        },
        sentiment,
        matchedKeywords: [],
        matchedHashtags: []
      });

      await monitoringData.save();

      // Update Instagram profile for commenter
      await this.updateInstagramProfile(projectId, {
        id: comment.owner.id,
        username: comment.owner.username,
        fullName: comment.owner.username,
        profilePicUrl: comment.owner.profilePicUrl,
        isVerified: false
      });

    } catch (error) {
      console.error('Error saving comment data:', error);
    }
  }

  // Update Instagram profile data
  private async updateInstagramProfile(projectId: string, owner: any): Promise<void> {
    try {
      let profile = await InstagramProfile.findOne({ username: owner.username });

      if (!profile) {
        profile = new InstagramProfile({
          username: owner.username,
          displayName: owner.fullName,
          profileUrl: `https://instagram.com/${owner.username}`,
          profilePicture: owner.profilePicUrl,
          isVerified: owner.isVerified,
          projects: [projectId]
        });
      } else {
        // Add project to profile if not already included
        if (!profile.projects.includes(projectId)) {
          profile.projects.push(projectId);
        }
        
        // Update profile info
        profile.displayName = owner.fullName;
        profile.profilePicture = owner.profilePicUrl;
        profile.isVerified = owner.isVerified;
      }

      profile.lastUpdated = new Date();
      await profile.save();

    } catch (error) {
      console.error('Error updating Instagram profile:', error);
    }
  }
}

export default new InstagramService();