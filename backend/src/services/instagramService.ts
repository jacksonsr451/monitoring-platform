import InstagramProfile, { IInstagramProfile } from '../models/InstagramProfile';
import InstagramPost, { IInstagramPost } from '../models/InstagramPost';
import InstagramComment, { IInstagramComment } from '../models/InstagramComment';
import mongoose from 'mongoose';

export interface InstagramScrapingResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface ProfileStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  averageEngagement: number;
  topHashtags: { tag: string; count: number }[];
  recentActivity: {
    postsLast7Days: number;
    postsLast30Days: number;
  };
}

class InstagramService {
  // Adicionar perfil para monitoramento
  async addProfile(profileData: Partial<IInstagramProfile>): Promise<InstagramScrapingResult> {
    try {
      const existingProfile = await InstagramProfile.findOne({ username: profileData.username });
      
      if (existingProfile) {
        return {
          success: false,
          message: 'Perfil já está sendo monitorado',
          data: existingProfile
        };
      }

      const profile = new InstagramProfile({
        ...profileData,
        lastScrapedAt: new Date(),
        isActive: true
      });

      await profile.save();

      return {
        success: true,
        message: 'Perfil adicionado com sucesso',
        data: profile
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao adicionar perfil',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // Buscar perfis monitorados
  async getProfiles(filters: {
    isActive?: boolean;
    tags?: string[];
    minFollowers?: number;
    maxFollowers?: number;
    limit?: number;
    page?: number;
  } = {}): Promise<InstagramScrapingResult> {
    try {
      const {
        isActive = true,
        tags,
        minFollowers,
        maxFollowers,
        limit = 20,
        page = 1
      } = filters;

      const query: any = { isActive };

      if (tags && tags.length > 0) {
        query.tags = { $in: tags };
      }

      if (minFollowers !== undefined || maxFollowers !== undefined) {
        query.followersCount = {};
        if (minFollowers !== undefined) query.followersCount.$gte = minFollowers;
        if (maxFollowers !== undefined) query.followersCount.$lte = maxFollowers;
      }

      const skip = (page - 1) * limit;
      const profiles = await InstagramProfile.find(query)
        .sort({ followersCount: -1 })
        .skip(skip)
        .limit(limit);

      const total = await InstagramProfile.countDocuments(query);

      return {
        success: true,
        message: 'Perfis encontrados',
        data: {
          profiles,
          pagination: {
            current: page,
            total: Math.ceil(total / limit),
            count: profiles.length,
            totalRecords: total
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao buscar perfis',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // Obter estatísticas de um perfil
  async getProfileStats(username: string): Promise<InstagramScrapingResult> {
    try {
      const profile = await InstagramProfile.findOne({ username, isActive: true });
      
      if (!profile) {
        return {
          success: false,
          message: 'Perfil não encontrado'
        };
      }

      // Buscar posts do perfil
      const posts = await InstagramPost.find({ 
        profileId: profile._id,
        isActive: true 
      }).sort({ postedAt: -1 });

      // Calcular estatísticas
      const totalPosts = posts.length;
      const totalLikes = posts.reduce((sum, post) => sum + post.likesCount, 0);
      const totalComments = posts.reduce((sum, post) => sum + post.commentsCount, 0);
      const averageEngagement = totalPosts > 0 ? (totalLikes + totalComments) / totalPosts : 0;

      // Top hashtags
      const hashtagCount: { [key: string]: number } = {};
      posts.forEach(post => {
        post.hashtags.forEach(tag => {
          hashtagCount[tag] = (hashtagCount[tag] || 0) + 1;
        });
      });

      const topHashtags = Object.entries(hashtagCount)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Atividade recente
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const postsLast7Days = posts.filter(post => post.postedAt >= sevenDaysAgo).length;
      const postsLast30Days = posts.filter(post => post.postedAt >= thirtyDaysAgo).length;

      const stats: ProfileStats = {
        totalPosts,
        totalLikes,
        totalComments,
        averageEngagement,
        topHashtags,
        recentActivity: {
          postsLast7Days,
          postsLast30Days
        }
      };

      return {
        success: true,
        message: 'Estatísticas obtidas com sucesso',
        data: {
          profile,
          stats
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao obter estatísticas do perfil',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // Buscar posts
  async getPosts(filters: {
    username?: string;
    type?: string;
    startDate?: Date;
    endDate?: Date;
    minLikes?: number;
    hashtags?: string[];
    limit?: number;
    page?: number;
  } = {}): Promise<InstagramScrapingResult> {
    try {
      const {
        username,
        type,
        startDate,
        endDate,
        minLikes,
        hashtags,
        limit = 20,
        page = 1
      } = filters;

      const query: any = { isActive: true };

      if (username) {
        query.username = username;
      }

      if (type) {
        query.type = type;
      }

      if (startDate || endDate) {
        query.postedAt = {};
        if (startDate) query.postedAt.$gte = startDate;
        if (endDate) query.postedAt.$lte = endDate;
      }

      if (minLikes !== undefined) {
        query.likesCount = { $gte: minLikes };
      }

      if (hashtags && hashtags.length > 0) {
        query.hashtags = { $in: hashtags };
      }

      const skip = (page - 1) * limit;
      const posts = await InstagramPost.find(query)
        .populate('profileId', 'username displayName profilePicture')
        .sort({ postedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await InstagramPost.countDocuments(query);

      return {
        success: true,
        message: 'Posts encontrados',
        data: {
          posts,
          pagination: {
            current: page,
            total: Math.ceil(total / limit),
            count: posts.length,
            totalRecords: total
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao buscar posts',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // Buscar comentários
  async getComments(filters: {
    postId?: string;
    username?: string;
    sentiment?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    page?: number;
  } = {}): Promise<InstagramScrapingResult> {
    try {
      const {
        postId,
        username,
        sentiment,
        startDate,
        endDate,
        limit = 50,
        page = 1
      } = filters;

      const query: any = { isActive: true };

      if (postId) {
        query.postId = postId;
      }

      if (username) {
        query.username = username;
      }

      if (sentiment) {
        query['sentiment.label'] = sentiment;
      }

      if (startDate || endDate) {
        query.postedAt = {};
        if (startDate) query.postedAt.$gte = startDate;
        if (endDate) query.postedAt.$lte = endDate;
      }

      const skip = (page - 1) * limit;
      const comments = await InstagramComment.find(query)
        .sort({ postedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await InstagramComment.countDocuments(query);

      return {
        success: true,
        message: 'Comentários encontrados',
        data: {
          comments,
          pagination: {
            current: page,
            total: Math.ceil(total / limit),
            count: comments.length,
            totalRecords: total
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao buscar comentários',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // Atualizar perfil (simulação de scraping)
  async updateProfile(username: string): Promise<InstagramScrapingResult> {
    try {
      const profile = await InstagramProfile.findOne({ username, isActive: true });
      
      if (!profile) {
        return {
          success: false,
          message: 'Perfil não encontrado'
        };
      }

      // Simulação de dados atualizados (em produção, aqui seria feito o scraping real)
      const updatedData = {
        followersCount: profile.followersCount + Math.floor(Math.random() * 100),
        followingCount: profile.followingCount + Math.floor(Math.random() * 10),
        postsCount: profile.postsCount + Math.floor(Math.random() * 5),
        lastScrapedAt: new Date()
      };

      await InstagramProfile.findByIdAndUpdate(profile._id, updatedData);

      return {
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: { ...profile.toObject(), ...updatedData }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao atualizar perfil',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // Remover perfil do monitoramento
  async removeProfile(username: string): Promise<InstagramScrapingResult> {
    try {
      const profile = await InstagramProfile.findOneAndUpdate(
        { username },
        { isActive: false },
        { new: true }
      );

      if (!profile) {
        return {
          success: false,
          message: 'Perfil não encontrado'
        };
      }

      return {
        success: true,
        message: 'Perfil removido do monitoramento',
        data: profile
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao remover perfil',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}

export default new InstagramService();