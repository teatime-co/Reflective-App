import Foundation
import Combine

// MARK: - Tag Service
@MainActor
class TagService: ObservableObject {
    static let shared = TagService()
    
    @Published var tags: [Tag] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var lastSyncDate: Date?
    
    private let apiClient: APIClient
    private let coreDataManager: CoreDataManager
    private var cancellables = Set<AnyCancellable>()
    
    init(apiClient: APIClient = APIClient.shared, coreDataManager: CoreDataManager = CoreDataManager.shared) {
        self.apiClient = apiClient
        self.coreDataManager = coreDataManager
        
        // Extract tags from local entries on initialization
        extractTagsFromEntries()
        
        // Subscribe to Core Data manager updates
        setupBindings()
    }
    
    // MARK: - Setup
    
    private func setupBindings() {
        coreDataManager.$lastSyncDate
            .sink { [weak self] syncDate in
                self?.lastSyncDate = syncDate
            }
            .store(in: &cancellables)
    }
    
    private func extractTagsFromEntries() {
        let userID = getCurrentUserID()
        let cdLogs = coreDataManager.fetchJournalEntries(userID: userID)
        let entries = cdLogs.map { $0.toJournalEntry() }
        
        // Extract unique tags from all entries
        var uniqueTags: [String: Tag] = [:]
        var tagLastUsed: [String: Date] = [:]
        
        for entry in entries {
            for tag in entry.tags {
                let key = tag.name.lowercased()
                
                // Update last used date (most recent)
                if let lastUsed = tagLastUsed[key] {
                    tagLastUsed[key] = max(lastUsed, entry.createdAt)
                } else {
                    tagLastUsed[key] = entry.createdAt
                }
                
                // Keep the tag (use the first one encountered to preserve original casing)
                if uniqueTags[key] == nil {
                    var updatedTag = tag
                    updatedTag.lastUsedAt = tagLastUsed[key]
                    uniqueTags[key] = updatedTag
                } else {
                    // Update last used date for existing tag
                    var existingTag = uniqueTags[key]!
                    existingTag.lastUsedAt = tagLastUsed[key]
                    uniqueTags[key] = existingTag
                }
            }
        }
        
        // Convert to array and sort by usage
        tags = Array(uniqueTags.values).sortedByUsage()
    }
    
    // MARK: - Tag Management
    
    /// Fetch/extract all tags from current entries (no separate server call needed)
    func fetchTags() async throws {
        isLoading = true
        errorMessage = nil
        
        do {
            // Simply extract tags from current entries
            extractTagsFromEntries()
            isLoading = false
        } catch {
            isLoading = false
            errorMessage = "Failed to extract tags: \(error.localizedDescription)"
            throw error
        }
    }
    
    /// Extract tags from a specific set of entries (useful for real-time updates)
    func extractTags(from entries: [JournalEntry]) {
        var uniqueTags: [String: Tag] = [:]
        var tagLastUsed: [String: Date] = [:]
        
        for entry in entries {
            for tag in entry.tags {
                let key = tag.name.lowercased()
                
                // Update last used date (most recent)
                if let lastUsed = tagLastUsed[key] {
                    tagLastUsed[key] = max(lastUsed, entry.createdAt)
                } else {
                    tagLastUsed[key] = entry.createdAt
                }
                
                // Keep the tag (use the first one encountered to preserve original casing)
                if uniqueTags[key] == nil {
                    var updatedTag = tag
                    updatedTag.lastUsedAt = tagLastUsed[key]
                    uniqueTags[key] = updatedTag
                } else {
                    // Update last used date for existing tag
                    var existingTag = uniqueTags[key]!
                    existingTag.lastUsedAt = tagLastUsed[key]
                    uniqueTags[key] = existingTag
                }
            }
        }
        
        // Convert to array and sort by usage
        tags = Array(uniqueTags.values).sortedByUsage()
    }
    
    /// Create a new tag (this will be used when creating/editing entries)
    func createTag(name: String, color: String? = nil) async throws -> Tag {
        // Check if tag already exists in current tags
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if let existingTag = tags.first(where: { $0.name.lowercased() == trimmedName.lowercased() }) {
            return existingTag
        }
        
        // Create new tag (it will be added to the collection when used in an entry)
        let newTag = Tag(
            name: trimmedName,
            color: color ?? Tag.generateRandomColor()
        )
        
        return newTag
    }
    
    /// Get or create a tag by name (for hashtag processing)
    func getOrCreateTag(name: String, color: String? = nil) async throws -> Tag {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Check if tag exists in current tags
        if let existingTag = tags.first(where: { $0.name.lowercased() == trimmedName.lowercased() }) {
            return existingTag
        } else {
            // Create new tag
            return try await createTag(name: trimmedName, color: color)
        }
    }
    
    /// Bulk create or update tags (for hashtag processing)
    func processHashtags(_ hashtags: [String]) async throws -> [Tag] {
        var processedTags: [Tag] = []
        
        for hashtag in hashtags {
            do {
                let tag = try await getOrCreateTag(name: hashtag)
                processedTags.append(tag)
            } catch {
                print("Failed to process hashtag '\(hashtag)': \(error)")
            }
        }
        
        return processedTags
    }
    
    // MARK: - Search and Filtering
    
    /// Search tags by name
    func searchTags(_ query: String) -> [Tag] {
        if query.isEmpty {
            return tags
        }
        return tags.filtered(by: query)
    }
    
    /// Get popular tags (most recently used)
    func getPopularTags(limit: Int = 10) -> [Tag] {
        return Array(tags.sortedByUsage().prefix(limit))
    }
    
    /// Get tags by color
    func getTagsByColor(_ color: String) -> [Tag] {
        return tags.filter { $0.color.lowercased() == color.lowercased() }
    }
    
    /// Get unused tags (never used or not used recently)
    func getUnusedTags(daysSince: Int = 30) -> [Tag] {
        let cutoffDate = Calendar.current.date(byAdding: .day, value: -daysSince, to: Date()) ?? Date()
        return tags.filter { tag in
            guard let lastUsed = tag.lastUsedAt else { return true }
            return lastUsed < cutoffDate
        }
    }
    
    // MARK: - Statistics
    
    /// Get tag usage statistics
    func getTagStats() -> TagStats {
        let totalTags = tags.count
        let recentlyUsed = tags.filter { tag in
            guard let lastUsed = tag.lastUsedAt else { return false }
            let weekAgo = Calendar.current.date(byAdding: .day, value: -7, to: Date()) ?? Date()
            return lastUsed >= weekAgo
        }.count
        
        let colorCounts = Dictionary(grouping: tags, by: { $0.color })
            .mapValues { $0.count }
        
        return TagStats(
            totalCount: totalTags,
            recentlyUsedCount: recentlyUsed,
            colorDistribution: colorCounts
        )
    }
    
    // MARK: - Real-time Updates
    
    /// Call this method when entries are updated to refresh tags
    func refreshFromEntries(_ entries: [JournalEntry]) {
        extractTags(from: entries)
    }
    
    // MARK: - Private Methods
    
    private func getCurrentUserID() -> UUID {
        // Get the current user ID from Keychain
        if let userIDString = Keychain.shared.getUserID(),
           let userID = UUID(uuidString: userIDString) {
            return userID
        }
        
        // Fallback for development/testing
        return UUID(uuidString: "00000000-0000-0000-0000-000000000000") ?? UUID()
    }
}

// MARK: - Supporting Types

enum TagError: LocalizedError {
    case duplicateName
    case invalidName
    case notFound
    
    var errorDescription: String? {
        switch self {
        case .duplicateName:
            return "A tag with this name already exists"
        case .invalidName:
            return "Tag name cannot be empty"
        case .notFound:
            return "Tag not found"
        }
    }
}

struct TagStats {
    let totalCount: Int
    let recentlyUsedCount: Int
    let colorDistribution: [String: Int]
}

// MARK: - Tag Service Error Types
enum TagServiceError: LocalizedError {
    case tagAlreadyExists(String)
    case invalidTagName(String)
    case networkError(String)
    case unknownError
    
    var errorDescription: String? {
        switch self {
        case .tagAlreadyExists(let name):
            return "Tag '\(name)' already exists"
        case .invalidTagName(let name):
            return "Invalid tag name: '\(name)'"
        case .networkError(let message):
            return "Network error: \(message)"
        case .unknownError:
            return "An unknown error occurred"
        }
    }
}

// MARK: - Tag Validation
extension TagService {
    /// Validate tag name
    static func isValidTagName(_ name: String) -> Bool {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Check if empty
        guard !trimmed.isEmpty else { return false }
        
        // Check length (1-50 characters)
        guard trimmed.count >= 1 && trimmed.count <= 50 else { return false }
        
        // Check for valid characters (alphanumeric, underscore, hyphen)
        let validPattern = "^[a-zA-Z0-9_-]+$"
        let regex = try! NSRegularExpression(pattern: validPattern)
        let range = NSRange(location: 0, length: trimmed.count)
        
        return regex.firstMatch(in: trimmed, options: [], range: range) != nil
    }
    
    /// Get validation error message for tag name
    static func getTagNameValidationError(_ name: String) -> String? {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        
        if trimmed.isEmpty {
            return "Tag name cannot be empty"
        }
        
        if trimmed.count > 50 {
            return "Tag name must be 50 characters or less"
        }
        
        if !isValidTagName(trimmed) {
            return "Tag name can only contain letters, numbers, underscores, and hyphens"
        }
        
        return nil
    }
} 