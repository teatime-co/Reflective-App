import SwiftUI

struct SearchResultsView: View {
    @ObservedObject var viewModel: SearchViewModel
    let onResultTap: (SearchResult) -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            // Results header
            resultsHeader
                .background(Color(.windowBackgroundColor))
            
            Divider()
            
            // Results content
            Group {
                if viewModel.isSearching {
                    loadingView
                } else if viewModel.searchResults.isEmpty && viewModel.hasSearched {
                    EmptySearchStateView(query: viewModel.searchText)
                } else if !viewModel.searchResults.isEmpty {
                    resultsList
                } else {
                    // Initial state before any search
                    searchWelcomeView
                }
            }
        }
    }
    
    private var resultsHeader: some View {
        HStack {
            if viewModel.hasSearched {
                Text("\(viewModel.searchResults.count) result\(viewModel.searchResults.count == 1 ? "" : "s")")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
            } else {
                Text("Search Results")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
            }
            
            Spacer()
            
            if !viewModel.searchResults.isEmpty {
                Text("Sorted by relevance")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
    }
    
    private var loadingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .accentColor))
                .scaleEffect(1.5)
            
            Text("Searching your entries...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
    
    private var searchWelcomeView: some View {
        VStack(spacing: 24) {
            Image(systemName: "magnifyingglass.circle")
                .font(.system(size: 64))
                .foregroundColor(.accentColor)
            
            VStack(spacing: 12) {
                Text("Search Your Journal")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                
                Text("Find entries by meaning, not just keywords")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            
            // Search tips
            VStack(alignment: .leading, spacing: 16) {
                Text("Search Tips:")
                    .font(.headline)
                    .foregroundColor(.primary)
                
                VStack(alignment: .leading, spacing: 12) {
                    searchTip(
                        icon: "brain.head.profile",
                        title: "Semantic Search",
                        description: "Search by concepts and meanings, not just exact words"
                    )
                    
                    searchTip(
                        icon: "heart.text.square",
                        title: "Emotions & Feelings",
                        description: "Find entries by the emotions you expressed"
                    )
                    
                    searchTip(
                        icon: "lightbulb",
                        title: "Themes & Ideas",
                        description: "Discover patterns and recurring themes in your writing"
                    )
                }
            }
            .padding(.vertical, 20)
            .padding(.horizontal, 24)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(.controlBackgroundColor))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color(.separatorColor), lineWidth: 1)
                    )
            )
            .frame(maxWidth: 500)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
    
    private var resultsList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(viewModel.searchResults) { result in
                    SearchResultCard(
                        result: result,
                        searchQuery: viewModel.searchText,
                        onTap: {
                            onResultTap(result)
                        }
                    )
                }
            }
            .padding(20)
        }
        .background(Color(.windowBackgroundColor))
    }
    
    private func searchTip(icon: String, title: String, description: String) -> some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.accentColor)
                .frame(width: 24, height: 24)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            
            Spacer()
        }
    }
}

#Preview {
    let viewModel = SearchViewModel()
    
    return SearchResultsView(
        viewModel: viewModel,
        onResultTap: { _ in }
    )
    .frame(width: 600, height: 400)
} 