import SwiftUI
import AppKit

struct EntryEditorView: View {
    let mode: EditorMode
    let existingEntry: JournalEntry?
    
    @EnvironmentObject var navigationManager: NavigationManager
    @StateObject private var journalService = JournalService.shared
    @StateObject private var tagService = TagService.shared
    
    @State private var content: String = ""
    @State private var tags: [Tag] = []
    @State private var targetWordCount: Int = 750
    @State private var showingTagEditor = false
    @State private var isSaving = false
    @State private var lastSavedAt: Date?
    @State private var showingExitConfirmation = false
    
    @FocusState private var isTextEditorFocused: Bool
    
    // Computed properties
    private var currentWordCount: Int {
        content.split(separator: " ").count
    }
    
    private var completionPercentage: Double {
        targetWordCount > 0 ? min(Double(currentWordCount) / Double(targetWordCount), 1.0) : 1.0
    }
    
    private var hasUnsavedChanges: Bool {
        if case .edit(let entry) = mode {
            return content != entry.content || tags != entry.tags
        }
        return !content.isEmpty || !tags.isEmpty
    }
    
    init(mode: EditorMode, entry: JournalEntry? = nil) {
        self.mode = mode
        self.existingEntry = entry
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Toolbar
            editorToolbar
            
            Divider()
            
            // Main text editor area
            textEditorSection
        }
        .frame(minWidth: 600, minHeight: 400)
        .navigationTitle(mode.title)
        .onAppear {
            setupEditor()
        }
        .onChange(of: content) { _, _ in
            scheduleAutoSave()
            updateUnsavedChangesState()
        }
        .onChange(of: tags) { _, _ in
            updateUnsavedChangesState()
        }
        .onChange(of: showingTagEditor) { _, isShowing in
            if !isShowing {
                // Return focus to text editor only when popover is completely closed
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                    isTextEditorFocused = true
                }
            }
        }
        .alert("Unsaved Changes", isPresented: $showingExitConfirmation) {
            Button("Save and Exit") {
                Task {
                    await saveEntry()
                }
            }
            Button("Discard Changes", role: .destructive) {
                navigationManager.navigateToEntries()
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("You have unsaved changes. What would you like to do?")
        }
        .alert("Unsaved Changes", isPresented: $navigationManager.showingNavigationConfirmation) {
            Button("Save and Continue") {
                navigationManager.saveAndNavigate()
            }
            Button("Discard Changes", role: .destructive) {
                navigationManager.discardAndNavigate()
            }
            Button("Cancel", role: .cancel) {
                navigationManager.cancelNavigation()
            }
        } message: {
            Text("You have unsaved changes. What would you like to do?")
        }
        .onDisappear {
            // Clear unsaved changes state when leaving the editor
            navigationManager.setUnsavedChanges(false)
        }
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Back to Entries") {
                    if hasUnsavedChanges {
                        showingExitConfirmation = true
                    } else {
                        navigationManager.navigateToEntries()
                    }
                }
            }
            
            ToolbarItem(placement: .confirmationAction) {
                Button(mode.saveButtonTitle) {
                    Task {
                        await saveEntry()
                    }
                }
                .disabled(content.isEmpty || isSaving)
            }
        }
    }
    
    // MARK: - Editor Toolbar
    private var editorToolbar: some View {
        HStack {
            // Word count and progress
            HStack(spacing: 12) {
                Text("\(currentWordCount) / \(targetWordCount) words")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                ProgressView(value: completionPercentage)
                    .frame(width: 100)
                
                Text("\(Int(completionPercentage * 100))%")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(width: 30)
            }
            
            Spacer()
            
            // Toolbar buttons
            HStack(spacing: 8) {
                // Tags button with popover
                Button(action: {
                    showingTagEditor.toggle()
                    // When opening tag editor, shift focus away from text editor
                    if showingTagEditor {
                        isTextEditorFocused = false
                    }
                }) {
                    Label("Tags (\(tags.count))", systemImage: "tag")
                        .foregroundColor(showingTagEditor ? .accentColor : .secondary)
                }
                .buttonStyle(.bordered)
                .popover(isPresented: $showingTagEditor, arrowEdge: .bottom) {
                    tagEditorSection
                }
                
                // Auto-save status
                if let lastSaved = lastSavedAt {
                    Text("Saved \(timeAgoFormatter.string(for: lastSaved))")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                } else if isSaving {
                    HStack(spacing: 4) {
                        ProgressView()
                            .scaleEffect(0.6)
                        Text("Saving...")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color(NSColor.controlBackgroundColor))
    }
    
    // MARK: - Text Editor Section
    private var textEditorSection: some View {
        VStack(spacing: 0) {
            // Try using simple SwiftUI TextEditor for now to test
            TextEditor(text: $content)
                .focused($isTextEditorFocused)
                .font(.system(size: 16))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(NSColor.textBackgroundColor))
            
            // Bottom status bar with enhanced tag feedback
            HStack {
                if !tags.isEmpty {
                    TagCollectionView(
                        tags: Array(tags.prefix(5)),
                        size: .small
                    )
                    .id(tags.map { $0.id.uuidString }.joined(separator: "-")) // Force refresh when tags change
                    
                    if tags.count > 5 {
                        Text("+ \(tags.count - 5) more")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                } else {
                    Text("No tags added")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Show recent tag additions as feedback
                if !tags.isEmpty {
                    Text("\(tags.count) tag\(tags.count == 1 ? "" : "s")")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(Color(NSColor.controlBackgroundColor))
            .animation(.spring(response: 0.3, dampingFraction: 0.8), value: tags.count) // Animate tag count changes
        }
    }
    
    // MARK: - Tag Editor Section
    private var tagEditorSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Tags")
                .font(.headline)
            
            // Tag input component
            TagInputView(
                tags: $tags, 
                autoFocus: true
            )
            .environmentObject(tagService)
        }
        .padding()
        .background(Color(NSColor.windowBackgroundColor))
        .frame(minWidth: 300, maxWidth: 400)
        .fixedSize()
    }
    
    // MARK: - Helper Methods
    private func setupEditor() {
        if case .edit(let entry) = mode {
            content = entry.content
            tags = entry.tags
            targetWordCount = entry.targetWordCount
        }
        
        // Focus on text editor
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            isTextEditorFocused = true
        }
        
        // Register unsaved changes callbacks with NavigationManager
        updateUnsavedChangesState()
        
        Task {
            try? await tagService.fetchTags()
        }
    }
    
    private func scheduleAutoSave() {
        guard case .edit = mode else { return }
        
        journalService.startAutoSave(for: getCurrentEntry())
    }
    
    private func saveEntry() async {
        isSaving = true
        
        do {
            switch mode {
            case .create:
                _ = try await journalService.createEntry(
                    content: content,
                    tags: tags.map { $0.name },
                    moodScore: nil,
                    targetWordCount: targetWordCount
                )
                
            case .edit(let entry):
                _ = try await journalService.updateEntry(
                    entry,
                    content: content,
                    tags: tags.map { $0.name },
                    moodScore: nil,
                    targetWordCount: targetWordCount
                )
            }
            
            lastSavedAt = Date()
            
            // Dismiss after successful save
            navigationManager.navigateToEntries()
            
        } catch {
            print("Failed to save entry: \(error)")
        }
        
        isSaving = false
    }
    
    private func processHashtags(_ hashtags: [String]) async {
        for hashtagName in hashtags {
            do {
                let tag = try await tagService.getOrCreateTag(name: hashtagName)
                if !tags.contains(where: { $0.id == tag.id }) {
                    tags.append(tag)
                }
            } catch {
                print("Failed to process hashtag '\(hashtagName)': \(error)")
            }
        }
    }
    
    private func getCurrentEntry() -> JournalEntry {
        if case .edit(let entry) = mode {
            var updatedEntry = entry
            updatedEntry.content = content
            updatedEntry.tags = tags
            updatedEntry.targetWordCount = targetWordCount
            return updatedEntry
        } else {
            return JournalEntry(
                userID: UUID(), // This should be from current user
                content: content,
                moodScore: nil,
                targetWordCount: targetWordCount,
                tags: tags
                
            )
        }
    }
    
    // Removed mood-related methods
    
    private let timeAgoFormatter: RelativeDateTimeFormatter = {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter
    }()
    
    private func updateUnsavedChangesState() {
        navigationManager.setUnsavedChanges(
            hasUnsavedChanges,
            onSave: {
                Task {
                    await self.saveEntryForNavigation()
                }
            },
            onDiscard: {
                // Just clear the state, navigation will happen automatically
            }
        )
    }
    
    private func saveEntryForNavigation() async {
        isSaving = true
        
        do {
            switch mode {
            case .create:
                _ = try await journalService.createEntry(
                    content: content,
                    tags: tags.map { $0.name },
                    moodScore: nil,
                    targetWordCount: targetWordCount
                )
                
            case .edit(let entry):
                _ = try await journalService.updateEntry(
                    entry,
                    content: content,
                    tags: tags.map { $0.name },
                    moodScore: nil,
                    targetWordCount: targetWordCount
                )
            }
            
            lastSavedAt = Date()
            
            // Don't navigate here - let NavigationManager handle it
            
        } catch {
            print("Failed to save entry: \(error)")
        }
        
        isSaving = false
    }
}

// MARK: - Preview
#Preview {
    EntryEditorView(mode: .create)
        .frame(width: 800, height: 600)
} 
