import SwiftUI

struct SearchResultCard: View {
    let result: SearchResult
    let searchQuery: String
    let onTap: () -> Void
    
    @State private var isHovered = false
    
    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 16) {
                // Header with date and relevance
                HStack {
                    Text(result.formattedDate)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    Spacer()
                    
                    HStack(spacing: 6) {
                        Image(systemName: "target")
                            .font(.caption)
                            .foregroundColor(.accentColor)
                        Text(result.formattedRelevance)
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.accentColor)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color.accentColor.opacity(0.1))
                    )
                }
                
                // Content snippet with highlighting
                HighlightedText(
                    text: result.snippetText,
                    highlight: searchQuery
                )
                .font(.body)
                .lineLimit(4)
                .multilineTextAlignment(.leading)
                
                // Tags section
                if !result.tags.isEmpty {
                    HStack {
                        Image(systemName: "tag")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        TagFlowLayout(tags: Array(result.tags.prefix(4)))
                    }
                }
                
                // Footer with mood and status
                HStack {
                    // Mood indicator
                    if let moodScore = result.moodScore {
                        HStack(spacing: 6) {
                            Text(result.moodEmoji)
                                .font(.caption)
                            Text(result.moodDescription)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Spacer()
                    
                    // Completion status
                    Text(result.completionStatus.displayName)
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(result.completionStatus.color.opacity(0.2))
                        .foregroundColor(result.completionStatus.color)
                        .cornerRadius(6)
                    
                    // Arrow indicator on hover
                    if isHovered {
                        Image(systemName: "arrow.right")
                            .font(.caption)
                            .foregroundColor(.accentColor)
                            .transition(.opacity.combined(with: .move(edge: .trailing)))
                    }
                }
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.textBackgroundColor))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(
                                isHovered ? Color.accentColor.opacity(0.5) : Color(.separatorColor),
                                lineWidth: isHovered ? 2 : 1
                            )
                    )
            )
            .scaleEffect(isHovered ? 1.02 : 1.0)
            .shadow(
                color: .black.opacity(isHovered ? 0.1 : 0.05),
                radius: isHovered ? 8 : 4,
                x: 0,
                y: isHovered ? 4 : 2
            )
        }
        .buttonStyle(.plain)
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.2)) {
                isHovered = hovering
            }
        }
        .help("Open entry")
    }
}

// MARK: - Highlighted Text Component
struct HighlightedText: View {
    let text: String
    let highlight: String
    
    var body: some View {
        if highlight.isEmpty {
            Text(text)
        } else {
            // Create attributed text with highlighting
            Text(attributedString)
        }
    }
    
    private var attributedString: AttributedString {
        var attributed = AttributedString(text)
        
        // Find and highlight search terms
        let searchTerms = highlight.lowercased().components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
        
        for term in searchTerms {
            let ranges = text.lowercased().ranges(of: term)
            for range in ranges {
                let nsRange = NSRange(range, in: text)
                if let attributedRange = Range(nsRange, in: attributed) {
                    attributed[attributedRange].backgroundColor = .yellow.opacity(0.3)
                    attributed[attributedRange].foregroundColor = .primary
                }
            }
        }
        
        return attributed
    }
}

// MARK: - Tag Flow Layout
struct TagFlowLayout: View {
    let tags: [Tag]
    
    var body: some View {
        HStack(spacing: 6) {
            ForEach(tags.prefix(3), id: \.id) { tag in
                Text(tag.name)
                    .font(.caption)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(tag.swiftUIColor.opacity(0.2))
                    .foregroundColor(tag.swiftUIColor)
                    .cornerRadius(4)
            }
            
            if tags.count > 3 {
                Text("+\(tags.count - 3)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

// Extension to find ranges of substring
extension String {
    func ranges(of substring: String) -> [Range<String.Index>] {
        var ranges: [Range<String.Index>] = []
        var start = startIndex
        
        while let range = range(of: substring, options: [.caseInsensitive], range: start..<endIndex) {
            ranges.append(range)
            start = range.upperBound
        }
        
        return ranges
    }
}

//#Preview {
//    VStack(spacing: 16) {
//        SearchResultCard(
//            result: SearchResult(
//                id: UUID(),
//                content: "Today I learned about machine learning and how it can help with daily tasks. The concepts were fascinating and I'm excited to explore more.",
//                createdAt: Date().addingTimeInterval(-86400),
//                updatedAt: Date(),
//                tags: [
//                    Tag(name: "learning", color: "#FF6B6B"),
//                    Tag(name: "technology", color: "#4ECDC4"),
//                    Tag(name: "ai", color: "#45B7D1")
//                ],
//                moodScore: 0.7,
//                completionStatus: .complete,
//                relevanceScore: 0.85,
//                snippetText: "Today I learned about machine learning and how it can help with daily tasks...",
//                snippetStartIndex: 0,
//                snippetEndIndex: 50,
//                contextBefore: nil,
//                contextAfter: nil,
//                rank: 1
//            ),
//            searchQuery: "machine learning",
//            onTap: {}
//        )
//    }
//    .padding()
//    .frame(width: 500)
//} 
