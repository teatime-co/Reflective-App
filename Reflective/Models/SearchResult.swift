import Foundation

// MARK: - Search Result Model
struct SearchResult: Identifiable, Codable, Hashable {
    let id: UUID
    let userID: UUID
    let sessionID: UUID?
    let promptID: UUID?
    let weaviateID: String?
    let content: String
    let moodScore: Float?
    let completionStatus: CompletionStatus
    let targetWordCount: Int
    let writingDuration: Int?
    let wordCount: Int?
    let processingStatus: EntryProcessingStatus?
    let createdAt: Date
    let updatedAt: Date
    let tags: [Tag]
    let themes: [Theme]
    let linguisticMetrics: LinguisticMetrics?
    let revisions: [EntryRevision]
    
    // Search metadata
    let relevanceScore: Float
    let snippetText: String
    let snippetStartIndex: Int
    let snippetEndIndex: Int
    let contextBefore: String?
    let contextAfter: String?
    let rank: Int
    
    // MARK: - Computed Properties
    var formattedRelevance: String {
        String(format: "%.1f%%", relevanceScore * 100)
    }
    
    var formattedDate: String {
        createdAt.formatted(date: .abbreviated, time: .omitted)
    }
    
    var moodEmoji: String {
        guard let mood = moodScore else { return "😐" }
        switch mood {
        case 0.6...1.0: return "😊"
        case 0.2..<0.6: return "🙂"
        case -0.2..<0.2: return "😐"
        case -0.6..<(-0.2): return "🙁"
        default: return "😞"
        }
    }
    
    var moodDescription: String {
        guard let mood = moodScore else { return "Neutral" }
        switch mood {
        case 0.6...1.0: return "Positive"
        case -0.2..<0.6: return "Neutral"
        default: return "Negative"
        }
    }
    
    // MARK: - Hashable Conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
        hasher.combine(relevanceScore)
        hasher.combine(rank)
    }
    
    static func == (lhs: SearchResult, rhs: SearchResult) -> Bool {
        return lhs.id == rhs.id && lhs.rank == rhs.rank
    }
    
    // MARK: - Coding Keys
    enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case sessionID = "session_id"
        case promptID = "prompt_id"
        case weaviateID = "weaviate_id"
        case content, tags, themes
        case moodScore = "mood_score"
        case completionStatus = "completion_status"
        case targetWordCount = "target_word_count"
        case writingDuration = "writing_duration"
        case wordCount = "word_count"
        case processingStatus = "processing_status"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case linguisticMetrics = "linguistic_metrics"
        case revisions
        case relevanceScore = "relevance_score"
        case snippetText = "snippet_text"
        case snippetStartIndex = "snippet_start_index"
        case snippetEndIndex = "snippet_end_index"
        case contextBefore = "context_before"
        case contextAfter = "context_after"
        case rank
    }
    
    // MARK: - Custom Decoding
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        id = try container.decode(UUID.self, forKey: .id)
        userID = try container.decode(UUID.self, forKey: .userID)
        sessionID = try container.decodeIfPresent(UUID.self, forKey: .sessionID)
        promptID = try container.decodeIfPresent(UUID.self, forKey: .promptID)
        weaviateID = try container.decodeIfPresent(String.self, forKey: .weaviateID)
        content = try container.decode(String.self, forKey: .content)
        moodScore = try container.decodeIfPresent(Float.self, forKey: .moodScore)
        targetWordCount = try container.decodeIfPresent(Int.self, forKey: .targetWordCount) ?? 750
        writingDuration = try container.decodeIfPresent(Int.self, forKey: .writingDuration)
        wordCount = try container.decodeIfPresent(Int.self, forKey: .wordCount)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
        tags = try container.decode([Tag].self, forKey: .tags)
        themes = try container.decodeIfPresent([Theme].self, forKey: .themes) ?? []
        linguisticMetrics = try container.decodeIfPresent(LinguisticMetrics.self, forKey: .linguisticMetrics)
        revisions = try container.decodeIfPresent([EntryRevision].self, forKey: .revisions) ?? []
        
        // Decode completion status
        let statusString = try container.decode(String.self, forKey: .completionStatus)
        completionStatus = CompletionStatus(rawValue: statusString) ?? .draft
        
        // Decode processing status
        if let processingStatusString = try container.decodeIfPresent(String.self, forKey: .processingStatus) {
            processingStatus = EntryProcessingStatus(rawValue: processingStatusString)
        } else {
            processingStatus = nil
        }
        
        // Search metadata
        relevanceScore = try container.decode(Float.self, forKey: .relevanceScore)
        snippetText = try container.decode(String.self, forKey: .snippetText)
        snippetStartIndex = try container.decode(Int.self, forKey: .snippetStartIndex)
        snippetEndIndex = try container.decode(Int.self, forKey: .snippetEndIndex)
        contextBefore = try container.decodeIfPresent(String.self, forKey: .contextBefore)
        contextAfter = try container.decodeIfPresent(String.self, forKey: .contextAfter)
        rank = try container.decode(Int.self, forKey: .rank)
    }
}

// MARK: - Search Result Extensions
extension SearchResult {
    /// Convert SearchResult to JournalEntry
    /// Creates a JournalEntry with all available data from the search result
    func toJournalEntry() -> JournalEntry {
        // Create a base JournalEntry with the standard initializer
        var entry = JournalEntry(
            id: id,
            userID: userID,
            content: content,
            moodScore: moodScore,
            completionStatus: completionStatus,
            targetWordCount: targetWordCount,
            writingDuration: writingDuration,
            sessionID: sessionID,
            promptID: promptID,
            tags: tags,
            themes: themes,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
        
        // Manually set the additional fields that SearchResult provides
        entry.weaviateID = weaviateID
        entry.wordCount = wordCount ?? content.split(separator: " ").count
        entry.processingStatus = processingStatus ?? .processed
        entry.linguisticMetrics = linguisticMetrics
        entry.revisions = revisions
        
        return entry
    }
} 