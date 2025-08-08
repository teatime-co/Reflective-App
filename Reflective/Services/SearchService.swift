import Foundation

// MARK: - Search Service
@MainActor
class SearchService: ObservableObject {
    static let shared = SearchService()
    
    @Published var isSearching = false
    @Published var lastError: String?
    
    private let apiClient = APIClient.shared
    
    private init() {}
    
    // MARK: - Search Methods
    
    /// Perform semantic search
    func search(query: String, maxResults: Int = 5) async throws -> [SearchResult] {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw SearchError.emptyQuery
        }
        
        isSearching = true
        lastError = nil
        
        defer { isSearching = false }
        
        do {
            let requestBody = SearchRequest(query: query, top_k: maxResults)
            let results: [SearchResult] = try await apiClient.post(
                endpoint: "logs/search",
                body: requestBody,
                requiresAuth: true
            )
            
            if AppEnvironment.current.enableLogging {
                print("🔍 SearchService: Found \(results.count) results for query: '\(query)'")
            }
            
            return results
            
        } catch let error as APIError {
            lastError = error.localizedDescription
            
            if AppEnvironment.current.enableLogging {
                print("❌ SearchService: Search failed with error: \(error)")
            }
            
            throw error
        } catch {
            lastError = error.localizedDescription
            
            if AppEnvironment.current.enableLogging {
                print("❌ SearchService: Unexpected search error: \(error)")
            }
            
            throw SearchError.unknown(error)
        }
    }
    
    /// Search for related entries based on content
    func findRelatedEntries(for content: String, maxResults: Int = 3, excludeId: UUID? = nil) async throws -> [SearchResult] {
        let results = try await search(query: content, maxResults: maxResults + 1)
        
        // Filter out the excluded entry if provided
        if let excludeId = excludeId {
            return results.filter { $0.id != excludeId }.prefix(maxResults).map { $0 }
        }
        
        return Array(results.prefix(maxResults))
    }
}

// MARK: - Search Request Model
struct SearchRequest: Codable {
    let query: String
    let top_k: Int
    
    enum CodingKeys: String, CodingKey {
        case query
        case top_k
    }
}

// MARK: - Search Errors
enum SearchError: LocalizedError {
    case emptyQuery
    case noResults
    case unknown(Error)
    
    var errorDescription: String? {
        switch self {
        case .emptyQuery:
            return "Please enter a search query"
        case .noResults:
            return "No matching entries found"
        case .unknown(let error):
            return "Search error: \(error.localizedDescription)"
        }
    }
} 