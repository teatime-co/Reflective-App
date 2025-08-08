import Foundation

// MARK: - Search Query Model
struct SearchQuery: Identifiable {
    let id = UUID()
    let text: String
    let timestamp: Date
    let resultCount: Int
    
    // MARK: - Computed Properties
    var formattedTimestamp: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: timestamp, relativeTo: Date())
    }
    
    var resultText: String {
        switch resultCount {
        case 0:
            return "No results"
        case 1:
            return "1 result"
        default:
            return "\(resultCount) results"
        }
    }
    
    // MARK: - Initializers
    init(text: String, resultCount: Int = 0) {
        self.text = text
        self.timestamp = Date()
        self.resultCount = resultCount
    }
}

// MARK: - Search Query Extensions
extension SearchQuery: Hashable {
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
        hasher.combine(text)
        hasher.combine(timestamp)
    }
}

extension SearchQuery: Equatable {
    static func == (lhs: SearchQuery, rhs: SearchQuery) -> Bool {
        return lhs.id == rhs.id
    }
} 