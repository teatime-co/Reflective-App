//
//  LinguisticService.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation
import Combine

// MARK: - Linguistic Analytics Models

// MARK: - Trend Direction Enum
enum LinguisticTrendDirection: String, Codable {
    case improving = "improving"
    case declining = "declining"
    case stable = "stable"
    case insufficient_data = "insufficient_data"
    
    var displayName: String {
        switch self {
        case .improving: return "Improving"
        case .declining: return "Declining"
        case .stable: return "Stable"
        case .insufficient_data: return "Insufficient Data"
        }
    }
    
    var systemImageName: String {
        switch self {
        case .improving: return "arrow.up.circle.fill"
        case .declining: return "arrow.down.circle.fill"
        case .stable: return "minus.circle.fill"
        case .insufficient_data: return "questionmark.circle.fill"
        }
    }
}

struct AnalyticsSummary: Codable {
    let timeframe: TimeFrame
    let totalEntries: Int
    let averageWordCount: Int
    let vocabularyDiversity: VocabularyDiversityData
    let sentimentTrends: SentimentTrendsData
    let complexityMetrics: ComplexityMetricsData
    let writingStyleEvolution: WritingStyleData
}

struct VocabularyDiversityData: Codable {
    let currentScore: Float
    let averageScore: Float
    let trend: LinguisticTrendDirection
    let improvementPercentage: Float
    let uniqueWordsCount: Int
    let totalWordsCount: Int
}

struct SentimentTrendsData: Codable {
    let currentSentiment: Float
    let averageSentiment: Float
    let trend: LinguisticTrendDirection
    let positiveEntriesPercentage: Float
    let neutralEntriesPercentage: Float
    let negativeEntriesPercentage: Float
    let sentimentHistory: [SentimentTrend]
}

struct ComplexityMetricsData: Codable {
    let currentComplexity: Float
    let averageComplexity: Float
    let readabilityLevel: Float
    let trend: LinguisticTrendDirection
    let complexSentencesPercentage: Float
}

struct WritingStyleData: Codable {
    let currentStyle: [String: Float]
    let styleEvolution: [WritingStylePoint]
    let dominantStyles: [String]
    let styleConsistency: Float
}

struct SentimentTrend: Identifiable, Codable {
    let id: UUID
    let timestamp: Date
    let sentimentScore: Float
    let entryId: UUID
    let wordCount: Int
}

struct VocabularyMetric: Identifiable, Codable {
    let id: UUID
    let timestamp: Date
    let diversityScore: Float
    let uniqueWords: Int
    let totalWords: Int
    let newWordsIntroduced: Int
}

struct WritingStylePoint: Identifiable, Codable {
    let id: UUID
    let timestamp: Date
    let styleMetrics: [String: Float]
    let dominantStyle: String
    let confidenceScore: Float
}

struct LinguisticAnalysisRequest: Codable {
    let content: String
    let includeEmotionAnalysis: Bool
    let includeStyleAnalysis: Bool
    let includeComplexityAnalysis: Bool
}

struct LinguisticAnalysisResponse: Codable {
    let metrics: LinguisticMetrics
    let processingTime: Double
    let modelVersion: String
    let confidence: Float
}

// Server response model matching the actual API response
struct TextAnalysis: Codable {
    let vocabulary_diversity_score: Float
    let sentiment_score: Float
    let complexity_score: Float
    let readability_level: Float
    let emotion_scores: EmotionScoresResponse
    let writing_style_metrics: WritingStyleMetricsResponse
}

// MARK: - Linguistic Service
@MainActor
class LinguisticService: ObservableObject {
    
    // MARK: - Singleton
    static let shared = LinguisticService()
    
    // MARK: - Published Properties
    @Published var currentMetrics: LinguisticMetrics?
    @Published var analyticsData: AnalyticsSummary?
    @Published var sentimentTrends: [SentimentTrend] = []
    @Published var vocabularyProgress: [VocabularyMetric] = []
    @Published var isProcessing = false
    @Published var processingProgress: Float = 0.0
    
    // MARK: - Dependencies
    private let apiClient: APIClient
    private let coreDataManager: CoreDataManager
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Private Endpoints
    private let baseLinguistic = "linguistic"
    private let baseAnalysis = "linguistic"
    private let baseAnalytics = "linguistic/analytics"
    private let baseInsights = "linguistic/insights"
    
    // Analysis Endpoints
    private var analyzeEntryEndpoint: String {
        return "\(baseAnalysis)/analyze"
    }
    
    private func processEntryEndpoint(for entryId: UUID) -> String {
        return "\(baseAnalysis)/process/\(entryId)"
    }
    
    private func getAnalysisStatusEndpoint(_ entryId: UUID) -> String {
        return "\(baseAnalysis)/status/\(entryId)"
    }
    
    // Metrics Endpoints
    private func getEntryMetricsEndpoint(_ entryId: UUID) -> String {
        return "\(baseLinguistic)/metrics/\(entryId)"
    }
    
    // Analytics Endpoints
    private func getAnalyticsSummaryEndpoint(_ timeframe: TimeFrame) -> String {
        return "\(baseAnalytics)/summary?timeframe=\(timeframe.rawValue)"
    }
    
    private func getSentimentTrendsEndpoint(_ timeframe: TimeFrame) -> String {
        return "\(baseAnalytics)/sentiment/trends?timeframe=\(timeframe.rawValue)"
    }
    
    private func getVocabularyGrowthEndpoint(_ timeframe: TimeFrame) -> String {
        return "\(baseAnalytics)/vocabulary/growth?timeframe=\(timeframe.rawValue)"
    }
    
    private func getWritingStyleEvolutionEndpoint(_ timeframe: TimeFrame) -> String {
        return "\(baseAnalytics)/style/evolution?timeframe=\(timeframe.rawValue)"
    }
    
    // Comparison Endpoints
    private func compareEntriesEndpoint(_ entryId1: UUID, _ entryId2: UUID) -> String {
        return "\(baseLinguistic)/compare/\(entryId1)/\(entryId2)"
    }
    
    // Insights Endpoints
    private func getWritingInsightsEndpoint(_ timeframe: TimeFrame) -> String {
        return "\(baseInsights)?timeframe=\(timeframe.rawValue)"
    }
    
    // MARK: - Initialization
    private init(
        apiClient: APIClient = APIClient.shared
    ) {
        self.apiClient = apiClient
        self.coreDataManager = CoreDataManager.shared
        
        loadCachedAnalytics()
    }
    
    // MARK: - Public Methods
    
    /// Analyze a journal entry for linguistic metrics
    func analyzeEntry(_ entry: JournalEntry) async throws -> LinguisticMetrics {
        isProcessing = true
        processingProgress = 0.0
        defer { 
            isProcessing = false
            processingProgress = 0.0
        }
        
        processingProgress = 0.3
        
        do {
            print("📊 LinguisticService: Starting linguistic analysis for entry \(entry.id)")
            
            // Use the process endpoint for analyzing a specific entry
            let response: LinguisticMetricsResponse = try await apiClient.request(
                endpoint: processEntryEndpoint(for: entry.id),
                method: .POST
            )
            
            print("✅ LinguisticService: Successfully decoded linguistic response")
            
            processingProgress = 0.7
            
            // Convert response to LinguisticMetrics
            let metrics = LinguisticMetrics(
                id: response.id ?? UUID(),
                log_id: response.log_id,
                vocabulary_diversity_score: response.vocabulary_diversity_score,
                sentiment_score: response.sentiment_score,
                complexity_score: response.complexity_score,
                readability_level: response.readability_level,
                emotion_scores: response.emotion_scores,
                writing_style_metrics: response.writing_style_metrics,
                processed_at: response.processed_at
            )
            
            processingProgress = 1.0
            
            // Cache the metrics
            await cacheLinguisticMetrics(metrics, for: entry.id)
            
            print("✅ LinguisticService: Cached linguistic metrics for entry \(entry.id)")
            return metrics
            
        } catch {
            print("❌ LinguisticService: Failed to analyze entry \(entry.id) - \(error)")
            
            // Add more specific error logging for decoding issues
            if let apiError = error as? APIError {
                switch apiError {
                case .decodingError(let decodingError):
                    print("🔍 LinguisticService: Decoding error details: \(decodingError)")
                case .serverError(let code, let message):
                    print("🔍 LinguisticService: Server error \(code): \(message)")
                default:
                    print("🔍 LinguisticService: Other API error: \(apiError)")
                }
            }
            
            throw LinguisticServiceError.analysisFailed(error.localizedDescription)
        }
    }
    
    /// Get comprehensive analytics summary
    func getAnalyticsSummary(timeframe: TimeFrame = .month) async throws -> AnalyticsSummary {
        do {
            let summary: AnalyticsSummary = try await apiClient.request(
                endpoint: getAnalyticsSummaryEndpoint(timeframe),
                method: .GET
            )
            
            self.analyticsData = summary
            
            // Update related data
            self.sentimentTrends = summary.sentimentTrends.sentimentHistory
            
            return summary
            
        } catch {
            print("❌ LinguisticService: Failed to fetch analytics summary - \(error)")
            throw LinguisticServiceError.fetchFailed(error.localizedDescription)
        }
    }
    
    /// Get sentiment trends over time
    func getSentimentTrends(timeframe: TimeFrame = .month) async throws -> [SentimentTrend] {
        do {
            let trends: [SentimentTrend] = try await apiClient.request(
                endpoint: getSentimentTrendsEndpoint(timeframe),
                method: .GET
            )
            
            self.sentimentTrends = trends
            return trends
            
        } catch {
            print("❌ LinguisticService: Failed to fetch sentiment trends - \(error)")
            throw LinguisticServiceError.fetchFailed(error.localizedDescription)
        }
    }
    
    /// Get vocabulary growth metrics
    func getVocabularyGrowth(timeframe: TimeFrame = .month) async throws -> [VocabularyMetric] {
        do {
            let metrics: [VocabularyMetric] = try await apiClient.request(
                endpoint: getVocabularyGrowthEndpoint(timeframe),
                method: .GET
            )
            
            self.vocabularyProgress = metrics
            return metrics
            
        } catch {
            print("❌ LinguisticService: Failed to fetch vocabulary growth - \(error)")
            throw LinguisticServiceError.fetchFailed(error.localizedDescription)
        }
    }
    
    /// Get writing style evolution
    func getWritingStyleEvolution(timeframe: TimeFrame = .month) async throws -> [WritingStylePoint] {
        do {
            let stylePoints: [WritingStylePoint] = try await apiClient.request(
                endpoint: getWritingStyleEvolutionEndpoint(timeframe),
                method: .GET
            )
            
            return stylePoints
            
        } catch {
            print("❌ LinguisticService: Failed to fetch writing style evolution - \(error)")
            throw LinguisticServiceError.fetchFailed(error.localizedDescription)
        }
    }
    
    /// Batch analyze multiple entries
    func batchAnalyzeEntries(_ entries: [JournalEntry]) async throws -> [UUID: LinguisticMetrics] {
        isProcessing = true
        processingProgress = 0.0
        defer { 
            isProcessing = false
            processingProgress = 0.0
        }
        
        var results: [UUID: LinguisticMetrics] = [:]
        let totalEntries = Float(entries.count)
        
        // Process entries individually since there's no batch endpoint
        for (index, entry) in entries.enumerated() {
            do {
                let metrics = try await analyzeEntry(entry)
                results[entry.id] = metrics
                
                // Update progress
                processingProgress = Float(index + 1) / totalEntries
                
            } catch {
                print("❌ LinguisticService: Failed to analyze entry \(entry.id) - \(error)")
                // Continue with next entry instead of failing completely
                continue
            }
        }
        
        return results
    }
    
    /// Get linguistic metrics for a specific entry
    func getMetricsForEntry(_ entryId: UUID) async throws -> LinguisticMetrics? {
        do {
            let metrics: LinguisticMetrics = try await apiClient.request(
                endpoint: getEntryMetricsEndpoint(entryId),
                method: .GET
            )
            
            return metrics
            
        } catch {
            print("❌ LinguisticService: Failed to fetch metrics for entry - \(error)")
            // Return cached metrics if available
            return await getCachedMetrics(for: entryId)
        }
    }
    
    /// Compare linguistic metrics between two entries
    func compareEntries(_ entryId1: UUID, _ entryId2: UUID) async throws -> LinguisticComparison {
        do {
            let comparison: LinguisticComparison = try await apiClient.request(
                endpoint: compareEntriesEndpoint(entryId1, entryId2),
                method: .GET
            )
            
            return comparison
            
        } catch {
            print("❌ LinguisticService: Failed to compare entries - \(error)")
            throw LinguisticServiceError.comparisonFailed(error.localizedDescription)
        }
    }
    
    /// Get personalized writing insights
    func getWritingInsights(timeframe: TimeFrame = .month) async throws -> [WritingInsight] {
        do {
            let insights: [WritingInsight] = try await apiClient.request(
                endpoint: getWritingInsightsEndpoint(timeframe),
                method: .GET
            )
            
            return insights
            
        } catch {
            print("❌ LinguisticService: Failed to fetch writing insights - \(error)")
            throw LinguisticServiceError.fetchFailed(error.localizedDescription)
        }
    }
    
    // MARK: - Private Methods
    
    private func loadCachedAnalytics() {
        Task {
            // TODO: Implement cached analytics loading when CoreDataManager methods are available
            // For now, using placeholder implementation
            print("📊 LinguisticService: Loading cached analytics (placeholder)")
        }
    }
    
    private func cacheLinguisticMetrics(_ metrics: LinguisticMetrics, for entryId: UUID) async {
        // TODO: Implement caching when CoreDataManager method is available
        print("💾 LinguisticService: Caching metrics for entry \(entryId) (placeholder)")
    }
    
    private func getCachedMetrics(for entryId: UUID) async -> LinguisticMetrics? {
        // TODO: Implement cached metrics retrieval when CoreDataManager method is available
        print("📖 LinguisticService: Getting cached metrics for entry \(entryId) (placeholder)")
        return nil
    }
}

// MARK: - Request/Response Models

struct LinguisticComparison: Codable {
    let entry1Id: UUID
    let entry2Id: UUID
    let sentimentDifference: Float
    let complexityDifference: Float
    let vocabularyDifference: Float
    let styleSimilarity: Float
    let insights: [String]
}

struct WritingInsight: Identifiable, Codable {
    let id: UUID
    let type: InsightType
    let title: String
    let description: String
    let significance: InsightSignificance
    let actionable: Bool
    let relatedMetric: String?
    let timestamp: Date
}

enum InsightType: String, Codable {
    case vocabularyGrowth = "vocabulary_growth"
    case sentimentPattern = "sentiment_pattern"
    case styleEvolution = "style_evolution"
    case complexityTrend = "complexity_trend"
    case writingFrequency = "writing_frequency"
    case emotionalRange = "emotional_range"
}

enum InsightSignificance: String, Codable {
    case low = "low"
    case medium = "medium"
    case high = "high"
    case critical = "critical"
    
    var displayName: String {
        switch self {
        case .low: return "Minor"
        case .medium: return "Notable"
        case .high: return "Significant"
        case .critical: return "Major"
        }
    }
}

// MARK: - Error Types

enum LinguisticServiceError: LocalizedError {
    case analysisFailed(String)
    case fetchFailed(String)
    case comparisonFailed(String)
    case invalidData
    case networkError
    case processingTimeout
    
    var errorDescription: String? {
        switch self {
        case .analysisFailed(let message):
            return "Linguistic analysis failed: \(message)"
        case .fetchFailed(let message):
            return "Failed to fetch linguistic data: \(message)"
        case .comparisonFailed(let message):
            return "Entry comparison failed: \(message)"
        case .invalidData:
            return "Invalid linguistic data received"
        case .networkError:
            return "Network error occurred"
        case .processingTimeout:
            return "Analysis processing timed out"
        }
    }
}

// MARK: - Extensions

extension LinguisticService {
    /// Get current processing status
    var analysisInProgress: Bool {
        return isProcessing
    }
    
    /// Get the latest vocabulary diversity score
    var latestVocabularyScore: Float? {
        return vocabularyProgress.last?.diversityScore
    }
    
    /// Get the latest sentiment score
    var latestSentimentScore: Float? {
        return sentimentTrends.last?.sentimentScore
    }
    
    /// Check if sufficient data exists for analytics
    func hasSufficientDataForAnalytics() -> Bool {
        return analyticsData?.totalEntries ?? 0 >= 5
    }
} 