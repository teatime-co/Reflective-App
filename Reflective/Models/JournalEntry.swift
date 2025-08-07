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
    var processingStatus: ProcessingStatus?
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

enum ProcessingStatus: String, Codable, CaseIterable {
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
struct Theme: Identifiable, Codable, Hashable {
    let id: UUID
    let name: String
    let description: String?
    let confidenceThreshold: Float
    let confidenceScore: Float
    let detectedAt: Date
    
    var displayConfidence: String {
        return String(format: "%.1f%%", confidenceScore * 100)
    }
}

struct LinguisticMetrics: Codable, Hashable {
    let id: UUID
    let logID: UUID
    let vocabularyDiversityScore: Float?
    let sentimentScore: Float?
    let complexityScore: Float?
    let readabilityLevel: Float?
    let emotionScores: [String: Float]?
    let writingStyleMetrics: [String: Float]?
    let processedAt: Date
}

struct EntryRevision: Identifiable, Codable, Hashable {
    let id: UUID
    let logID: UUID
    let revisionNumber: Int
    let contentDelta: [String: Any] // JSON representation
    let revisionType: String
    let createdAt: Date
    
    // Custom implementation for Equatable
    static func == (lhs: EntryRevision, rhs: EntryRevision) -> Bool {
        return lhs.id == rhs.id &&
               lhs.logID == rhs.logID &&
               lhs.revisionNumber == rhs.revisionNumber &&
               lhs.revisionType == rhs.revisionType &&
               lhs.createdAt == rhs.createdAt &&
               NSDictionary(dictionary: lhs.contentDelta).isEqual(to: rhs.contentDelta)
    }
    
    // Custom implementation for Hashable
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
        hasher.combine(logID)
        hasher.combine(revisionNumber)
        hasher.combine(revisionType)
        hasher.combine(createdAt)
        // Note: We only hash the basic properties since contentDelta is complex
    }
    
    // Custom implementation for Codable since [String: Any] isn't Codable
    enum CodingKeys: String, CodingKey {
        case id, logID, revisionNumber, revisionType, createdAt
        case contentDelta = "content_delta"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        logID = try container.decode(UUID.self, forKey: .logID)
        revisionNumber = try container.decode(Int.self, forKey: .revisionNumber)
        revisionType = try container.decode(String.self, forKey: .revisionType)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        
        // Handle contentDelta as raw data for now
        contentDelta = [:]
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(logID, forKey: .logID)
        try container.encode(revisionNumber, forKey: .revisionNumber)
        try container.encode(revisionType, forKey: .revisionType)
        try container.encode(createdAt, forKey: .createdAt)
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