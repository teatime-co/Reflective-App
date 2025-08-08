import Foundation
import SwiftUI

// MARK: - Journal Entry Model
struct JournalEntry: Identifiable, Codable, Hashable {
    let id: UUID
    let userID: UUID
    var sessionID: UUID?
    var promptID: UUID?
    var weaviateID: String?
    var content: String
    var moodScore: Float? // -1 to 1 scale
    var completionStatus: CompletionStatus
    var targetWordCount: Int
    var writingDuration: Int? // seconds
    var wordCount: Int?
    var processingStatus: EntryProcessingStatus?
    let createdAt: Date
    var updatedAt: Date
    var tags: [Tag]
    var themes: [Theme]
    var linguisticMetrics: LinguisticMetrics?
    var revisions: [EntryRevision]
    
    // MARK: - Computed Properties
    var formattedCreatedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: createdAt)
    }
    
    var actualWordCount: Int {
        wordCount ?? content.split(separator: " ").count
    }
    
    var completionPercentage: Double {
        let actual = actualWordCount
        let target = targetWordCount
        return target > 0 ? min(Double(actual) / Double(target), 1.0) : 1.0
    }
    
    var readingTime: Int {
        // Average reading speed: 200 words per minute
        return max(1, actualWordCount / 200)
    }
    
    var moodEmoji: String {
        guard let mood = moodScore else { return "😐" }
        switch mood {
        case 0.7...1.0: return "😊"
        case 0.3..<0.7: return "🙂"
        case -0.3..<0.3: return "😐"
        case -0.7..<(-0.3): return "🙁"
        default: return "😢"
        }
    }
    
    // MARK: - Initializers
    init(
        id: UUID = UUID(),
        userID: UUID,
        content: String,
        moodScore: Float? = nil,
        completionStatus: CompletionStatus = .draft,
        targetWordCount: Int = 750,
        writingDuration: Int? = nil,
        sessionID: UUID? = nil,
        promptID: UUID? = nil,
        tags: [Tag] = [],
        themes: [Theme] = [],
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.userID = userID
        self.content = content
        self.moodScore = moodScore
        self.completionStatus = completionStatus
        self.targetWordCount = targetWordCount
        self.writingDuration = writingDuration
        self.sessionID = sessionID
        self.promptID = promptID
        self.tags = tags
        self.themes = themes
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.revisions = []
        self.wordCount = content.split(separator: " ").count
        self.processingStatus = .processed
        self.weaviateID = nil
        self.linguisticMetrics = nil
    }
}

// MARK: - Supporting Enums
enum CompletionStatus: String, Codable, CaseIterable {
    case draft = "draft"
    case complete = "complete"
    case archived = "archived"
    
    var displayName: String {
        switch self {
        case .draft: return "Draft"
        case .complete: return "Complete"
        case .archived: return "Archived"
        }
    }
    
    var color: Color {
        switch self {
        case .draft: return .orange
        case .complete: return .green
        case .archived: return .gray
        }
    }
}

enum EntryProcessingStatus: String, Codable, CaseIterable {
    case pending = "pending"
    case processed = "processed"
    case failed = "failed"
    
    var displayName: String {
        switch self {
        case .pending: return "Processing..."
        case .processed: return "Processed"
        case .failed: return "Failed"
        }
    }
}

// MARK: - Supporting Models
// Note: Theme model is defined in Tag.swift - using that as the canonical definition

struct LinguisticMetrics: Codable, Hashable {
    let id: UUID
    let log_id: UUID
    let vocabulary_diversity_score: Float?
    let sentiment_score: Float?
    let complexity_score: Float?
    let readability_level: Float?
    let emotion_scores: EmotionScoresResponse?
    let writing_style_metrics: WritingStyleMetricsResponse?
    let processed_at: Date
}

// MARK: - API Response Models
struct LinguisticMetricsResponse: Codable {
    let id: UUID?
    let log_id: UUID
    let vocabulary_diversity_score: Float
    let sentiment_score: Float
    let complexity_score: Float
    let readability_level: Float
    let emotion_scores: EmotionScoresResponse
    let writing_style_metrics: WritingStyleMetricsResponse
    let processed_at: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case log_id
        case vocabulary_diversity_score
        case sentiment_score
        case complexity_score
        case readability_level
        case emotion_scores
        case writing_style_metrics
        case processed_at
    }
}

// Response models matching the actual API structure
struct EmotionScoresResponse: Codable, Hashable {
    let emotions: [String: Float]
    let subjectivity: Float
}

struct WritingStyleMetricsResponse: Codable, Hashable {
    let sentence_types: [String: Float]
    let style_similarities: [String: Float]?
    let formality_indicators: [String: Float]?
}

struct EntryRevision: Identifiable, Codable, Hashable {
    let id: UUID
    let logID: UUID
    let revisionNumber: Int
    var contentDeltaData: Data? // Store as Data instead of [String: Any]
    let revisionType: String
    let createdAt: Date
    
    // Computed property for accessing content delta
    var contentDelta: [String: Any]? {
        guard let data = contentDeltaData else { return nil }
        return try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    }
    
    // Helper to set content delta
    mutating func setContentDelta(_ delta: [String: Any]) {
        contentDeltaData = try? JSONSerialization.data(withJSONObject: delta)
    }
    
    // MARK: - Initializers
    init(
        id: UUID = UUID(),
        logID: UUID,
        revisionNumber: Int,
        contentDelta: [String: Any]? = nil,
        revisionType: String,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.logID = logID
        self.revisionNumber = revisionNumber
        self.revisionType = revisionType
        self.createdAt = createdAt
        
        if let delta = contentDelta {
            self.contentDeltaData = try? JSONSerialization.data(withJSONObject: delta)
        } else {
            self.contentDeltaData = nil
        }
    }
    
    // MARK: - Codable
    enum CodingKeys: String, CodingKey {
        case id, logID, revisionNumber, revisionType, createdAt
        case contentDeltaData = "content_delta"
    }
}

// MARK: - API Request/Response Models
struct LogCreateRequest: Codable {
    let id: UUID
    let content: String
    let tags: [String]
    let moodScore: Float?
    let completionStatus: String
    let targetWordCount: Int
    let writingDuration: Int?
    let sessionID: UUID?
    let promptID: UUID?
    
    enum CodingKeys: String, CodingKey {
        case id, content, tags
        case moodScore = "mood_score"
        case completionStatus = "completion_status"
        case targetWordCount = "target_word_count"
        case writingDuration = "writing_duration"
        case sessionID = "session_id"
        case promptID = "prompt_id"
    }
}

struct LogResponse: Codable {
    let id: UUID
    let userID: UUID
    let weaviateID: String?
    let content: String
    let moodScore: Float?
    let completionStatus: String
    let targetWordCount: Int
    let writingDuration: Int?
    let wordCount: Int?
    let processingStatus: String?
    let createdAt: Date
    let updatedAt: Date
    let tags: [Tag]
    let themes: [Theme]
    let linguisticMetrics: LinguisticMetrics?
    let revisions: [EntryRevision]
    
    enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case weaviateID = "weaviate_id"
        case content
        case moodScore = "mood_score"
        case completionStatus = "completion_status"
        case targetWordCount = "target_word_count"
        case writingDuration = "writing_duration"
        case wordCount = "word_count"
        case processingStatus = "processing_status"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case tags, themes
        case linguisticMetrics = "linguistic_metrics"
        case revisions
    }
} 