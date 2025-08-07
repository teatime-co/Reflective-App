import SwiftUI

struct EntryListView: View {
    @StateObject private var journalService = JournalService.shared
    @StateObject private var tagService = TagService.shared
    @EnvironmentObject var navigationManager: NavigationManager
    
    @State private var searchText = ""
    @State private var selectedStatus: CompletionStatus? = nil
    @State private var selectedTag: Tag? = nil
    @State private var selectedEntry: JournalEntry? = nil
    @State private var showingDeleteAlert = false
    @State private var entryToDelete: JournalEntry? = nil
    
    // MARK: - Computed Properties
    private var filteredEntries: [JournalEntry] {
        var entries = journalService.entries
        
        // Filter by search text
        if !searchText.isEmpty {
            entries = journalService.searchEntries(searchText)
        }
        
        // Filter by status
        if let status = selectedStatus {
            entries = entries.filter { $0.completionStatus == status }
        }
        
        // Filter by tag
        if let tag = selectedTag {
            entries = entries.filter { entry in
                entry.tags.contains { $0.id == tag.id }
            }
        }
        
        return entries.sorted { $0.createdAt > $1.createdAt }
    }
    
    var body: some View {
        NavigationSplitView {
            // MARK: - Sidebar
            VStack(spacing: 15) {
                // Search bar
                searchSection
                
                // Filters
                filtersSection
                
                // Entries list
                entriesListSection
                
                // Bottom toolbar
                bottomToolbar
            }
            .navigationTitle("Journal")
        } detail: {
            // MARK: - Detail View
            if let entry = selectedEntry {
                EntryDetailView(entry: entry)
                    .id(entry.id)
                    .environmentObject(navigationManager)
            } else {
                ContentUnavailableView(
                    "Select an Entry",
                    systemImage: "doc.text",
                    description: Text("Choose an entry from the sidebar to view and edit it.")
                )
            }
        }
        .onChange(of: selectedEntry) { oldValue, newValue in
            // Selection tracking for debugging - can be removed
        }
        .alert("Delete Entry", isPresented: $showingDeleteAlert) {
            Button("Delete", role: .destructive) {
                if let entry = entryToDelete {
                    deleteEntry(entry)
                }
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Are you sure you want to delete this entry? This action cannot be undone.")
        }
        .task {
            await loadData()
        }
        .refreshable {
            await loadData()
        }
    }
    
    // MARK: - Search Section
    private var searchSection: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                
                TextField("Search entries...", text: $searchText)
                    .textFieldStyle(.plain)
                
                if !searchText.isEmpty {
                    Button(action: { searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color(NSColor.controlBackgroundColor))
            .cornerRadius(8)
            .padding(.horizontal)
            .padding(.top)
        }
    }
    
    // MARK: - Filters Section
    private var filtersSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Status filter
            HStack {
                Text("Status:")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Picker("Status", selection: $selectedStatus) {
                    Text("All").tag(nil as CompletionStatus?)
                    ForEach(CompletionStatus.allCases, id: \.self) { status in
                        Text(status.displayName).tag(status as CompletionStatus?)
                    }
                }
                .pickerStyle(.menu)
                .font(.caption)
            }
            
            // Tag filter
            if !tagService.tags.isEmpty {
                HStack {
                    Text("Tag:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Picker("Tag", selection: $selectedTag) {
                        Text("All").tag(nil as Tag?)
                        ForEach(tagService.tags.sortedByUsage(), id: \.id) { tag in
                            Text(tag.name).tag(tag as Tag?)
                        }
                    }
                    .pickerStyle(.menu)
                    .font(.caption)
                }
            }
            
            // Clear filters button
            if selectedStatus != nil || selectedTag != nil {
                Button("Clear Filters") {
                    selectedStatus = nil
                    selectedTag = nil
                }
                .font(.caption)
                .foregroundColor(.accentColor)
            }
        }
        .padding(.horizontal)
        .padding(.bottom, 8)
    }
    
    // MARK: - Entries List Section
    private var entriesListSection: some View {
        ScrollViewReader { proxy in
            List {
                if filteredEntries.isEmpty {
                    if journalService.isLoading {
                        ProgressView("Loading entries...")
                            .frame(maxWidth: .infinity)
                            .listRowSeparator(.hidden)
                    } else {
                        ContentUnavailableView(
                            "No Entries",
                            systemImage: "doc.text",
                            description: Text(getEmptyStateMessage())
                        )
                        .listRowSeparator(.hidden)
                    }
                } else {
                    ForEach(filteredEntries) { entry in
                        Button(action: {
                            selectedEntry = entry
                        }) {
                            EntryRowView(
                                entry: entry, 
                                isSelected: selectedEntry?.id == entry.id,
                                onDelete: {
                                    entryToDelete = entry
                                    showingDeleteAlert = true
                                }
                            )
                        }
                        .buttonStyle(.plain)
                        .id(entry.id)
                    }
                }
            }
            .listStyle(.sidebar)
            .onChange(of: searchText) { _, _ in
                clearSelectionIfNeeded()
                scrollToTop(proxy: proxy)
            }
            .onChange(of: selectedStatus) { _, _ in
                clearSelectionIfNeeded()
                scrollToTop(proxy: proxy)
            }
            .onChange(of: selectedTag) { _, _ in
                clearSelectionIfNeeded()
                scrollToTop(proxy: proxy)
            }
        }
    }
    
    // MARK: - Bottom Toolbar
    private var bottomToolbar: some View {
        HStack {
            Text("\(filteredEntries.count) entries")
                .font(.caption)
                .foregroundColor(.secondary)
            
            Spacer()
            
            if journalService.isLoading {
                ProgressView()
                    .scaleEffect(0.8)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color(NSColor.controlBackgroundColor))
    }
    
    // MARK: - Helper Methods
    private func loadData() async {
        do {
            try await journalService.fetchEntries()
            try await tagService.fetchTags()
        } catch {
            print("Failed to load data: \(error)")
        }
    }
    
    private func deleteEntry(_ entry: JournalEntry) {
        Task {
            do {
                try await journalService.deleteEntry(entry)
                if selectedEntry?.id == entry.id {
                    selectedEntry = nil
                }
                
                // Tags are now automatically refreshed by JournalService
                // when entries are updated, so no manual refresh needed
            } catch {
                print("Failed to delete entry: \(error)")
            }
        }
    }
    
    private func getEmptyStateMessage() -> String {
        if !searchText.isEmpty {
            return "No entries match your search."
        } else if selectedStatus != nil || selectedTag != nil {
            return "No entries match your filters."
        } else {
            return "Start writing your first journal entry!"
        }
    }
    
    private func clearSelectionIfNeeded() {
        if let currentEntry = selectedEntry, !filteredEntries.contains(where: { $0.id == currentEntry.id }) {
            selectedEntry = nil
        }
    }
    
    private func scrollToTop(proxy: ScrollViewProxy) {
        if let firstEntryId = filteredEntries.first?.id {
            proxy.scrollTo(firstEntryId, anchor: .top)
        }
    }
}

// MARK: - Entry Row View
struct EntryRowView: View {
    let entry: JournalEntry
    let isSelected: Bool
    let onDelete: () -> Void
    
    init(entry: JournalEntry, isSelected: Bool = false, onDelete: @escaping () -> Void) {
        self.entry = entry
        self.isSelected = isSelected
        self.onDelete = onDelete
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Header with date and status
            HStack {
                Text(entry.formattedCreatedDate)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                // Status indicator
                Text(entry.completionStatus.displayName)
                    .font(.caption2)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(entry.completionStatus.color.opacity(0.2))
                    .foregroundColor(entry.completionStatus.color)
                    .cornerRadius(4)
            }
            
            // Content preview
            Text(entry.content)
                .font(.body)
                .lineLimit(3)
                .multilineTextAlignment(.leading)
            
            // Tags and metadata
            HStack {
                // Tags
                if !entry.tags.isEmpty {
                    ForEach(entry.tags.prefix(3), id: \.id) { tag in
                        TagPillView(tag: tag, size: .small)
                    }
                    
                    if entry.tags.count > 3 {
                        Text("+\(entry.tags.count - 3)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                // Word count and mood
                HStack(spacing: 8) {
                    Text("\(entry.actualWordCount) words")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
        .padding(.horizontal, 8)
        .contentShape(Rectangle())
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isSelected ? Color(NSColor.unemphasizedSelectedContentBackgroundColor) : Color.clear)
        )
        .contextMenu {
            Button("Archive", systemImage: "archivebox") {
                // Archive entry
            }
            
            Button("Mark Complete", systemImage: "checkmark.circle") {
                // Mark complete
            }
            
            Divider()
            
            Button("Delete", systemImage: "trash", role: .destructive) {
                onDelete()
            }
        }
    }
}

// MARK: - Preview
#Preview {
    EntryListView()
        .frame(width: 800, height: 600)
} 
