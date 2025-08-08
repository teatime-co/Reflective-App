import Foundation
import Combine

// MARK: - Search View Model
@MainActor
class SearchViewModel: ObservableObject {
    @Published var searchText = ""
    @Published var searchResults: [SearchResult] = []
    @Published var isSearching = false
    @Published var searchHistory: [SearchQuery] = []
    @Published var errorMessage: String?
    @Published var hasSearched = false
    
    private let searchService = SearchService.shared
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    init() {
        setupSearchTextObserver()
        loadSearchHistory()
    }
    
    // MARK: - Private Setup Methods
    private func setupSearchTextObserver() {
        // Auto-search with debounce
        $searchText
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
            .removeDuplicates()
            .sink { [weak self] query in
                if !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    Task {
                        await self?.performSearch(query: query)
                    }
                } else {
                    self?.clearResults()
                }
            }
            .store(in: &cancellables)
    }
    
    private func loadSearchHistory() {
        // Load search history from UserDefaults
        if let data = UserDefaults.standard.data(forKey: "SearchHistory"),
           let history = try? JSONDecoder().decode([SearchQueryStorage].self, from: data) {
            searchHistory = history.map { $0.toSearchQuery() }
        }
    }
    
    private func saveSearchHistory() {
        // Save search history to UserDefaults
        let storageHistory = searchHistory.map { SearchQueryStorage(from: $0) }
        if let data = try? JSONEncoder().encode(storageHistory) {
            UserDefaults.standard.set(data, forKey: "SearchHistory")
        }
    }
    
    // MARK: - Public Methods
    
    /// Perform search with the given query
    func performSearch(query: String) async {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        
        isSearching = true
        errorMessage = nil
        
        do {
            let results = try await searchService.search(query: query)
            
            searchResults = results
            hasSearched = true
            
            // Add to search history
            addToSearchHistory(query: query, resultCount: results.count)
            
            if AppEnvironment.current.enableLogging {
                print("🔍 SearchViewModel: Search completed with \(results.count) results")
            }
            
        } catch {
            errorMessage = error.localizedDescription
            searchResults = []
            
            // Still add to history even if search failed
            addToSearchHistory(query: query, resultCount: 0)
            
            if AppEnvironment.current.enableLogging {
                print("❌ SearchViewModel: Search failed: \(error)")
            }
        }
        
        isSearching = false
    }
    
    /// Clear search results and reset state
    func clearResults() {
        searchResults = []
        hasSearched = false
        errorMessage = nil
    }
    
    /// Select a query from search history
    func selectHistoryQuery(_ query: SearchQuery) {
        searchText = query.text
        // The debounced observer will automatically trigger the search
    }
    
    /// Clear all search history
    func clearSearchHistory() {
        searchHistory = []
        saveSearchHistory()
    }
    
    /// Remove a specific query from history
    func removeFromHistory(_ query: SearchQuery) {
        searchHistory.removeAll { $0.id == query.id }
        saveSearchHistory()
    }
    
    // MARK: - Private Helper Methods
    private func addToSearchHistory(query: String, resultCount: Int) {
        let searchQuery = SearchQuery(text: query, resultCount: resultCount)
        
        // Remove existing query with same text if it exists
        searchHistory.removeAll { $0.text == query }
        
        // Add new query at the beginning
        searchHistory.insert(searchQuery, at: 0)
        
        // Keep only the last 10 searches
        if searchHistory.count > 10 {
            searchHistory.removeLast()
        }
        
        saveSearchHistory()
    }
}

// MARK: - Search Query Storage
// Helper struct for persisting SearchQuery to UserDefaults
private struct SearchQueryStorage: Codable {
    let text: String
    let timestamp: Date
    let resultCount: Int
    
    init(from searchQuery: SearchQuery) {
        self.text = searchQuery.text
        self.timestamp = searchQuery.timestamp
        self.resultCount = searchQuery.resultCount
    }
    
    func toSearchQuery() -> SearchQuery {
        return SearchQuery(text: text, resultCount: resultCount)
    }
} 