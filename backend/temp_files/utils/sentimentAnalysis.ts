import axios from 'axios';

interface SentimentResult {
  label: 'positive' | 'negative' | 'neutral';
  score: number; // -1 to 1, where -1 is very negative, 1 is very positive
  confidence: number; // 0 to 1, confidence in the prediction
}

interface TextAnalysisAPI {
  analyzeSentiment(text: string): Promise<SentimentResult>;
}

// Simple rule-based sentiment analysis as fallback
class SimpleSentimentAnalyzer implements TextAnalysisAPI {
  private positiveWords = [
    'bom', 'boa', 'excelente', 'ótimo', 'ótima', 'maravilhoso', 'fantástico',
    'incrível', 'perfeito', 'perfeita', 'amor', 'amei', 'adorei', 'feliz',
    'alegre', 'satisfeito', 'satisfeita', 'contente', 'positivo', 'positiva',
    'sucesso', 'vitória', 'conquista', 'realização', 'sonho', 'esperança',
    'gratidão', 'obrigado', 'obrigada', 'parabéns', 'legal', 'bacana',
    'show', 'top', 'demais', 'massa', 'sensacional', 'espetacular',
    'lindo', 'linda', 'bonito', 'bonita', 'gostoso', 'gostosa', 'delicioso',
    'deliciosa', 'recomendo', 'aprovado', 'aprovada', 'curtir', 'like',
    '❤️', '😍', '😊', '😃', '👏', '🎉', '✨', '💖', '🥰', '😘'
  ];

  private negativeWords = [
    'ruim', 'péssimo', 'péssima', 'horrível', 'terrível', 'odioso', 'odeio',
    'detesto', 'nojo', 'triste', 'chateado', 'chateada', 'irritado', 'irritada',
    'nervoso', 'nervosa', 'bravo', 'brava', 'furioso', 'furiosa', 'decepção',
    'decepcionado', 'decepcionada', 'frustrado', 'frustrada', 'problema',
    'erro', 'falha', 'defeito', 'lixo', 'porcaria', 'vergonha', 'ridículo',
    'ridícula', 'absurdo', 'absurda', 'inaceitável', 'inadmissível',
    'desastre', 'catástrofe', 'fracasso', 'falência', 'prejuízo', 'perda',
    'mentira', 'enganação', 'traição', 'injustiça', 'injusto', 'injusta',
    'cruel', 'maldade', 'violência', 'agressão', 'bullying', 'preconceito',
    '😡', '😠', '😢', '😭', '💔', '😞', '😔', '🤬', '👎', '😤'
  ];

  private intensifiers = {
    'muito': 1.5,
    'super': 1.7,
    'extremamente': 2.0,
    'totalmente': 1.8,
    'completamente': 1.8,
    'bastante': 1.3,
    'bem': 1.2,
    'meio': 0.7,
    'pouco': 0.6,
    'um pouco': 0.5
  };

  private negators = ['não', 'nunca', 'jamais', 'nem', 'nada', 'nenhum', 'nenhuma'];

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    const normalizedText = text.toLowerCase().trim();
    
    if (!normalizedText || normalizedText.length < 3) {
      return {
        label: 'neutral',
        score: 0,
        confidence: 0.1
      };
    }

    const words = normalizedText.split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;
    let totalWords = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let isNegated = false;
      let intensifier = 1.0;

      // Check for negators in the previous 2 words
      for (let j = Math.max(0, i - 2); j < i; j++) {
        if (this.negators.includes(words[j])) {
          isNegated = true;
          break;
        }
      }

      // Check for intensifiers in the previous 2 words
      for (let j = Math.max(0, i - 2); j < i; j++) {
        const prevWord = words[j];
        if (prevWord in this.intensifiers) {
          intensifier = this.intensifiers[prevWord as keyof typeof this.intensifiers];
          break;
        }
      }

      // Check if word is positive
      if (this.positiveWords.includes(word)) {
        const score = intensifier * (isNegated ? -1 : 1);
        positiveScore += isNegated ? 0 : score;
        negativeScore += isNegated ? Math.abs(score) : 0;
        totalWords++;
      }
      // Check if word is negative
      else if (this.negativeWords.includes(word)) {
        const score = intensifier * (isNegated ? -1 : 1);
        negativeScore += isNegated ? 0 : score;
        positiveScore += isNegated ? Math.abs(score) : 0;
        totalWords++;
      }
    }

    // Calculate final score
    const netScore = positiveScore - negativeScore;
    const maxPossibleScore = Math.max(positiveScore + negativeScore, 1);
    const normalizedScore = Math.max(-1, Math.min(1, netScore / maxPossibleScore));

    // Determine label
    let label: 'positive' | 'negative' | 'neutral';
    if (normalizedScore > 0.1) {
      label = 'positive';
    } else if (normalizedScore < -0.1) {
      label = 'negative';
    } else {
      label = 'neutral';
    }

    // Calculate confidence based on number of sentiment words found
    const confidence = Math.min(0.9, Math.max(0.1, totalWords / Math.max(words.length * 0.1, 1)));

    return {
      label,
      score: normalizedScore,
      confidence
    };
  }
}

// Google Cloud Natural Language API integration
class GoogleSentimentAnalyzer implements TextAnalysisAPI {
  private apiKey: string;
  private baseUrl = 'https://language.googleapis.com/v1/documents:analyzeSentiment';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          document: {
            type: 'PLAIN_TEXT',
            content: text,
            language: 'pt'
          },
          encodingType: 'UTF8'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const sentiment = response.data.documentSentiment;
      const score = sentiment.score; // -1 to 1
      const magnitude = sentiment.magnitude; // 0 to infinity

      // Determine label based on score
      let label: 'positive' | 'negative' | 'neutral';
      if (score > 0.1) {
        label = 'positive';
      } else if (score < -0.1) {
        label = 'negative';
      } else {
        label = 'neutral';
      }

      // Use magnitude as confidence indicator (normalized)
      const confidence = Math.min(0.95, Math.max(0.1, magnitude / 4));

      return {
        label,
        score,
        confidence
      };
    } catch (error) {
      console.error('Google Sentiment API error:', error);
      // Fallback to simple analyzer
      const fallback = new SimpleSentimentAnalyzer();
      return await fallback.analyzeSentiment(text);
    }
  }
}

// Azure Text Analytics integration
class AzureSentimentAnalyzer implements TextAnalysisAPI {
  private apiKey: string;
  private endpoint: string;

  constructor(apiKey: string, endpoint: string) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    try {
      const response = await axios.post(
        `${this.endpoint}/text/analytics/v3.1/sentiment`,
        {
          documents: [
            {
              id: '1',
              language: 'pt',
              text: text
            }
          ]
        },
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const result = response.data.documents[0];
      const sentiment = result.sentiment; // 'positive', 'negative', 'neutral'
      const confidenceScores = result.confidenceScores;

      // Convert to our format
      let score = 0;
      if (sentiment === 'positive') {
        score = confidenceScores.positive - 0.5;
      } else if (sentiment === 'negative') {
        score = -(confidenceScores.negative - 0.5);
      } else {
        score = 0;
      }

      const confidence = Math.max(
        confidenceScores.positive,
        confidenceScores.negative,
        confidenceScores.neutral
      );

      return {
        label: sentiment as 'positive' | 'negative' | 'neutral',
        score: Math.max(-1, Math.min(1, score * 2)), // Scale to -1 to 1
        confidence
      };
    } catch (error) {
      console.error('Azure Sentiment API error:', error);
      // Fallback to simple analyzer
      const fallback = new SimpleSentimentAnalyzer();
      return await fallback.analyzeSentiment(text);
    }
  }
}

// Hugging Face Transformers integration
class HuggingFaceSentimentAnalyzer implements TextAnalysisAPI {
  private apiKey: string;
  private model = 'cardiffnlp/twitter-xlm-roberta-base-sentiment';
  private baseUrl = 'https://api-inference.huggingface.co/models';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeSentiment(text: string): Promise<SentimentResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.model}`,
        {
          inputs: text
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const results = response.data[0];
      
      // Find the result with highest score
      let bestResult = results[0];
      for (const result of results) {
        if (result.score > bestResult.score) {
          bestResult = result;
        }
      }

      // Map labels
      let label: 'positive' | 'negative' | 'neutral';
      const hfLabel = bestResult.label.toLowerCase();
      
      if (hfLabel.includes('positive') || hfLabel.includes('pos')) {
        label = 'positive';
      } else if (hfLabel.includes('negative') || hfLabel.includes('neg')) {
        label = 'negative';
      } else {
        label = 'neutral';
      }

      // Convert score to -1 to 1 range
      let score = 0;
      if (label === 'positive') {
        score = bestResult.score;
      } else if (label === 'negative') {
        score = -bestResult.score;
      }

      return {
        label,
        score,
        confidence: bestResult.score
      };
    } catch (error) {
      console.error('Hugging Face Sentiment API error:', error);
      // Fallback to simple analyzer
      const fallback = new SimpleSentimentAnalyzer();
      return await fallback.analyzeSentiment(text);
    }
  }
}

// Factory function to create appropriate analyzer
function createSentimentAnalyzer(): TextAnalysisAPI {
  const googleApiKey = process.env.GOOGLE_CLOUD_API_KEY;
  const azureApiKey = process.env.AZURE_TEXT_ANALYTICS_KEY;
  const azureEndpoint = process.env.AZURE_TEXT_ANALYTICS_ENDPOINT;
  const huggingFaceApiKey = process.env.HUGGING_FACE_API_KEY;

  // Prefer Google Cloud if available
  if (googleApiKey) {
    console.log('Using Google Cloud Natural Language API for sentiment analysis');
    return new GoogleSentimentAnalyzer(googleApiKey);
  }
  
  // Then Azure
  if (azureApiKey && azureEndpoint) {
    console.log('Using Azure Text Analytics for sentiment analysis');
    return new AzureSentimentAnalyzer(azureApiKey, azureEndpoint);
  }
  
  // Then Hugging Face
  if (huggingFaceApiKey) {
    console.log('Using Hugging Face Transformers for sentiment analysis');
    return new HuggingFaceSentimentAnalyzer(huggingFaceApiKey);
  }
  
  // Fallback to simple analyzer
  console.log('Using simple rule-based sentiment analysis (no API keys configured)');
  return new SimpleSentimentAnalyzer();
}

// Global analyzer instance
const sentimentAnalyzer = createSentimentAnalyzer();

// Main export function
export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  if (!text || text.trim().length === 0) {
    return {
      label: 'neutral',
      score: 0,
      confidence: 0.1
    };
  }

  // Limit text length to avoid API limits and costs
  const maxLength = 5000;
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

  try {
    return await sentimentAnalyzer.analyzeSentiment(truncatedText);
  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    
    // Final fallback
    const fallback = new SimpleSentimentAnalyzer();
    return await fallback.analyzeSentiment(truncatedText);
  }
}

// Batch analysis function
export async function analyzeSentimentBatch(texts: string[]): Promise<SentimentResult[]> {
  const results: SentimentResult[] = [];
  
  // Process in batches to avoid overwhelming APIs
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchPromises = batch.map(text => analyzeSentiment(text));
    
    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      console.error('Error in batch sentiment analysis:', error);
      // Add neutral results for failed batch
      for (let j = 0; j < batch.length; j++) {
        results.push({
          label: 'neutral',
          score: 0,
          confidence: 0.1
        });
      }
    }
    
    // Add delay between batches
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

// Export types
export type { SentimentResult, TextAnalysisAPI };