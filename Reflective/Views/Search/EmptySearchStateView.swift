import SwiftUI

struct EmptySearchStateView: View {
    let query: String
    
    var body: some View {
        VStack(spacing: 24) {
            // Icon
            Image(systemName: "magnifyingglass.circle")
                .font(.system(size: 64))
                .foregroundColor(.secondary)
            
            // Main message
            VStack(spacing: 8) {
                Text("No Results Found")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                
                Text("No entries match '\(query)'")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            
            // Suggestions
            VStack(alignment: .leading, spacing: 12) {
                Text("Try:")
                    .font(.headline)
                    .foregroundColor(.primary)
                
                VStack(alignment: .leading, spacing: 8) {
                    suggestionItem(
                        icon: "textformat.abc",
                        text: "Different keywords or phrases"
                    )
                    
                    suggestionItem(
                        icon: "text.word.spacing",
                        text: "Fewer or more general terms"
                    )
                    
                    suggestionItem(
                        icon: "quote.bubble",
                        text: "Concepts or themes instead of exact words"
                    )
                    
                    suggestionItem(
                        icon: "brain.head.profile",
                        text: "Emotions or feelings you wrote about"
                    )
                }
            }
            .padding(.vertical, 16)
            .padding(.horizontal, 20)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.controlBackgroundColor))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color(.separatorColor), lineWidth: 1)
                    )
            )
            .frame(maxWidth: 400)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
    
    private func suggestionItem(icon: String, text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(.accentColor)
                .frame(width: 16, height: 16)
            
            Text(text)
                .font(.subheadline)
                .foregroundColor(.primary)
            
            Spacer()
        }
    }
}

#Preview {
    EmptySearchStateView(query: "machine learning")
        .frame(width: 600, height: 400)
} 