import SwiftUI

struct SearchView: View {
    @StateObject private var viewModel = SearchViewModel()
    @EnvironmentObject var navigationManager: NavigationManager
    @State private var selectedResult: SearchResult?
    
    var body: some View {
        NavigationSplitView {
            // Search sidebar with results
            VStack(spacing: 0) {
                // Search header with input
                searchHeader
                
                Divider()
                
                // Search results list
                searchResultsList
            }
            .navigationTitle("Search")
            .frame(minWidth: 300)
        } detail: {
            // Detail view for selected search result
            if let result = selectedResult {
                EntryDetailView(entry: result.toJournalEntry())
                    .id(result.id)
                    .environmentObject(navigationManager)
            } else {
                searchDetailPlaceholder
            }
        }
        .navigationSplitViewStyle(.balanced)
        .alert("Search Error", isPresented: .constant(viewModel.errorMessage != nil)) {
            Button("OK") {
                viewModel.errorMessage = nil
            }
        } message: {
            if let error = viewModel.errorMessage {
                Text(error)
            }
        }
    }
    
    private var searchHeader: some View {
        VStack(spacing: 16) {
            SearchBarView(
                text: $viewModel.searchText,
                isSearching: viewModel.isSearching,
                onSubmit: {
                    Task {
                        await viewModel.performSearch(query: viewModel.searchText)
                    }
                }
            )
            
            // Search history section
            if !viewModel.searchHistory.isEmpty && viewModel.searchText.isEmpty {
                searchHistorySection
            }
            
            // Error message display
            if let errorMessage = viewModel.errorMessage {
                HStack {
                    Image(systemName: "exclamationmark.triangle")
                        .foregroundColor(.orange)
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.orange.opacity(0.1))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color.orange.opacity(0.3), lineWidth: 1)
                        )
                )
            }
        }
        .padding()
        .background(Color(.windowBackgroundColor))
    }
    
    private var searchHistorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Searches")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                
                Spacer()
                
                Button("Clear") {
                    viewModel.clearSearchHistory()
                }
                .font(.caption)
                .foregroundColor(.accentColor)
            }
            
            LazyVStack(spacing: 8) {
                ForEach(viewModel.searchHistory) { query in
                    SearchHistoryRow(query: query) {
                        viewModel.selectHistoryQuery(query)
                    } onRemove: {
                        viewModel.removeFromHistory(query)
                    }
                }
            }
        }
    }
    
    private var searchResultsList: some View {
        Group {
            if viewModel.isSearching {
                loadingView
            } else if viewModel.searchResults.isEmpty && viewModel.hasSearched {
                EmptySearchStateView(query: viewModel.searchText)
            } else if !viewModel.searchResults.isEmpty {
                resultsList
            } else {
                searchWelcomeView
            }
        }
    }
    
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .accentColor))
                .scaleEffect(1.2)
            
            Text("Searching your entries...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var searchWelcomeView: some View {
        VStack(spacing: 24) {
            Image(systemName: "magnifyingglass.circle")
                .font(.system(size: 48))
                .foregroundColor(.accentColor)
            
            VStack(spacing: 8) {
                Text("Search Your Journal")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Text("Find entries by meaning, not just keywords")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
    
    private var resultsList: some View {
        List(viewModel.searchResults, id: \.id, selection: $selectedResult) { result in
            SearchResultListItem(
                result: result,
                searchQuery: viewModel.searchText,
                isSelected: selectedResult?.id == result.id
            )
            .listRowSeparator(.hidden)
            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
            .tag(result)
        }
        .listStyle(.sidebar)
        .scrollContentBackground(.hidden)
        .background(Color(.windowBackgroundColor))
    }
    
    private var searchDetailPlaceholder: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text")
                .font(.system(size: 48))
                .foregroundColor(.secondary)
            
            Text("Select a Search Result")
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundColor(.primary)
            
            Text("Choose an entry from the search results to view its details.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.windowBackgroundColor))
    }
}

// MARK: - Search History Row
struct SearchHistoryRow: View {
    let query: SearchQuery
    let onTap: () -> Void
    let onRemove: () -> Void
    
    @State private var isHovered = false
    
    var body: some View {
        HStack {
            Button(action: onTap) {
                HStack {
                    Image(systemName: "clock")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text(query.text)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                        .lineLimit(1)
                    
                    Spacer()
                    
                    Text(query.resultText)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            
            if isHovered {
                Button(action: onRemove) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .buttonStyle(.plain)
                .help("Remove from history")
                .transition(.opacity.combined(with: .scale))
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isHovered ? Color(.controlAccentColor).opacity(0.1) : Color.clear)
        )
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.2)) {
                isHovered = hovering
            }
        }
    }
}

// MARK: - Search Result List Item
struct SearchResultListItem: View {
    let result: SearchResult
    let searchQuery: String
    let isSelected: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with date and relevance
            HStack {
                Text(result.formattedDate)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                
                Spacer()
                
                Text(result.formattedRelevance)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.accentColor)
            }
            
            // Content snippet
            HighlightedText(
                text: result.snippetText,
                highlight: searchQuery
            )
            .font(.subheadline)
            .lineLimit(3)
            .multilineTextAlignment(.leading)
            
            // Tags and status
            HStack {
                if !result.tags.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "tag")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        
                        Text(result.tags.prefix(2).map(\.name).joined(separator: ", "))
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }
                
                Spacer()
                
                // Completion status
                Text(result.completionStatus.displayName)
                    .font(.caption2)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(result.completionStatus.color.opacity(0.2))
                    .foregroundColor(result.completionStatus.color)
                    .cornerRadius(4)
            }
        }
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isSelected ? Color.accentColor.opacity(0.15) : Color.clear)
        )
    }
}

#Preview {
    SearchView()
        .environmentObject(NavigationManager.shared)
        .frame(width: 800, height: 600)
} 