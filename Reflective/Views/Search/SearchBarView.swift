import SwiftUI

struct SearchBarView: View {
    @Binding var text: String
    let isSearching: Bool
    let onSubmit: () -> Void
    
    @FocusState private var isFocused: Bool
    
    var body: some View {
        HStack(spacing: 12) {
            // Search icon
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)
                .font(.system(size: 16, weight: .medium))
            
            // Search text field
            TextField("Search your entries...", text: $text)
                .textFieldStyle(.plain)
                .font(.system(size: 14))
                .focused($isFocused)
                .onSubmit {
                    onSubmit()
                }
                .submitLabel(.search)
            
            // Clear button or loading indicator
            if isSearching {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .accentColor))
                    .scaleEffect(0.7)
                    .frame(width: 16, height: 16)
            } else if !text.isEmpty {
                Button(action: {
                    text = ""
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                        .font(.system(size: 16))
                }
                .buttonStyle(.plain)
                .help("Clear search")
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color(.controlBackgroundColor))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(isFocused ? Color.accentColor : Color(.separatorColor), lineWidth: 1)
                )
        )
        .animation(.easeInOut(duration: 0.2), value: isFocused)
        .onAppear {
            // Auto-focus the search field when the view appears
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                isFocused = true
            }
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        SearchBarView(
            text: .constant(""),
            isSearching: false,
            onSubmit: {}
        )
        
        SearchBarView(
            text: .constant("test query"),
            isSearching: false,
            onSubmit: {}
        )
        
        SearchBarView(
            text: .constant("searching..."),
            isSearching: true,
            onSubmit: {}
        )
    }
    .padding()
    .frame(width: 400)
} 