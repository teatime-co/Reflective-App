import SwiftUI

struct EntryDetailView: View {
    let entry: JournalEntry
    @StateObject private var journalService = JournalService.shared
    @StateObject private var tagService = TagService.shared
    @EnvironmentObject var navigationManager: NavigationManager
    
    @State private var currentEntry: JournalEntry
    @State private var showingDeleteAlert = false
    @State private var showingShareSheet = false
    @State private var isUpdatingStatus = false
    
    // Check if the entry still exists in the shared service
    private var entryStillExists: Bool {
        journalService.entries.contains { $0.id == currentEntry.id }
    }
    
    init(entry: JournalEntry) {
        self.entry = entry
        self._currentEntry = State(initialValue: entry)
    }
    
    var body: some View {
        Group {
            if entryStillExists {
                // Show normal entry detail view
                entryDetailContent
            } else {
                // Show deleted entry state
                deletedEntryView
            }
        }
        .navigationTitle("Entry")
    }
    
    // MARK: - Entry Detail Content
    private var entryDetailContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header section
                headerSection
                
                // Content section
                contentSection
                
                // Themes section
                if !currentEntry.themes.isEmpty {
                    themesSection
                }
                
                // Metadata section
                metadataSection
                
                // Linguistic metrics section
                if let metrics = currentEntry.linguisticMetrics {
                    linguisticMetricsSection(metrics)
                }
                
                // Revisions section
                if !currentEntry.revisions.isEmpty {
                    revisionsSection
                }
            }
            .padding()
        }
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Menu {
                    // Status actions
                    Section("Status") {
                        ForEach(CompletionStatus.allCases, id: \.self) { status in
                            if status != currentEntry.completionStatus {
                                Button(action: {
                                    updateStatus(to: status)
                                }) {
                                    Label(status.displayName, systemImage: getStatusIcon(status))
                                }
                            }
                        }
                    }
                    
                    Divider()
                    
                    // Actions
                    Section("Actions") {
                        Button(action: { 
                            navigationManager.navigateToEditor(mode: .edit(currentEntry))
                        }) {
                            Label("Edit", systemImage: "pencil")
                        }
                        
                        Button(action: { showingShareSheet = true }) {
                            Label("Share", systemImage: "square.and.arrow.up")
                        }
                        
                        Button(action: { duplicateEntry() }) {
                            Label("Duplicate", systemImage: "doc.on.doc")
                        }
                    }
                    
                    Divider()
                    
                    // Danger zone
                    Section {
                        Button(role: .destructive, action: { showingDeleteAlert = true }) {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
                
                Button("Edit") {
                    navigationManager.navigateToEditor(mode: .edit(currentEntry))
                }
                .keyboardShortcut("e", modifiers: .command)
            }
        }
        .alert("Delete Entry", isPresented: $showingDeleteAlert) {
            Button("Delete", role: .destructive) {
                deleteEntry()
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Are you sure you want to delete this entry? This action cannot be undone.")
        }
    }
    
    // MARK: - Deleted Entry View
    private var deletedEntryView: some View {
        VStack {
            Image(systemName: "trash.slash")
                .font(.largeTitle)
                .foregroundColor(.secondary)
            
            Text("Entry not found")
                .font(.headline)
                .foregroundColor(.secondary)
            
            Text("This entry has been deleted or moved.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .padding()
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(currentEntry.formattedCreatedDate)
                        .font(.title2)
                        .fontWeight(.semibold)
                    
                    Text("Last updated: \(currentEntry.updatedAt, style: .relative) ago")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Status badge
                HStack(spacing: 8) {
                    if isUpdatingStatus {
                        ProgressView()
                            .scaleEffect(0.6)
                    }
                    
                    Text(currentEntry.completionStatus.displayName)
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(currentEntry.completionStatus.color.opacity(0.2))
                        .foregroundColor(currentEntry.completionStatus.color)
                        .cornerRadius(6)
                }
            }
            
            // Mood indicator
            if let moodScore = currentEntry.moodScore {
                HStack(spacing: 8) {
                    Text("Mood:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text(currentEntry.moodEmoji)
                        .font(.title3)
                    
                    Text(getMoodDescription(for: moodScore))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(12)
    }
    
    // MARK: - Content Section
    private var contentSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Progress indicator with word count
            if currentEntry.targetWordCount > 0 {
                HStack {
                    ProgressView(value: currentEntry.completionPercentage)
                        .tint(currentEntry.completionPercentage >= 1.0 ? .green : .accentColor)
                    
                    Text("\(currentEntry.actualWordCount) of \(currentEntry.targetWordCount) words")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .fixedSize()
                }
            }
            
            // Tags inline display
            if !currentEntry.tags.isEmpty {
                TagCollectionView(
                    tags: currentEntry.tags,
                    size: .small,
                    onTagTap: { tag in
                        // Navigate to tag filter
                        print("Navigate to tag: \(tag.name)")
                    }
                )
            } else {
                // Show "No tags" pill when there are no tags
                HStack {
                    HStack(spacing: 4) {
                        Image(systemName: "tag.slash")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Text("No tags")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(8)
                    
                    Spacer()
                }
            }
            
            // Content text
            SelectableText(text: currentEntry.content)
                .font(.body)
                .lineSpacing(4)
                .textSelection(.enabled)
        }
        .padding()
        .background(Color(NSColor.textBackgroundColor))
        .cornerRadius(12)
    }
    
    // MARK: - Themes Section
    private var themesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("AI-Detected Themes")
                .font(.headline)
            
            ForEach(currentEntry.themes, id: \.id) { theme in
                ThemeCardView(theme: theme)
            }
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(12)
    }
    
    // MARK: - Metadata Section
    private var metadataSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Metadata")
                .font(.headline)
            
            VStack(spacing: 8) {
                MetadataRow(
                    title: "Entry ID",
                    value: currentEntry.id.uuidString.prefix(8).uppercased(),
                    icon: "number"
                )
                
                MetadataRow(
                    title: "Created",
                    value: currentEntry.createdAt.formatted(date: .abbreviated, time: .shortened),
                    icon: "calendar"
                )
                
                MetadataRow(
                    title: "Last Modified",
                    value: currentEntry.updatedAt.formatted(date: .abbreviated, time: .shortened),
                    icon: "clock"
                )
                
                if let duration = currentEntry.writingDuration {
                    MetadataRow(
                        title: "Writing Time",
                        value: formatDuration(duration),
                        icon: "timer"
                    )
                }
                
                if let processingStatus = currentEntry.processingStatus {
                    MetadataRow(
                        title: "Processing",
                        value: processingStatus.displayName,
                        icon: "gear"
                    )
                }
            }
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(12)
    }
    
    // MARK: - Linguistic Metrics Section
    private func linguisticMetricsSection(_ metrics: LinguisticMetrics) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Language Analysis")
                .font(.headline)
            
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 12) {
                if let sentiment = metrics.sentimentScore {
                    MetricCard(
                        title: "Sentiment",
                        value: String(format: "%.1f", sentiment),
                        subtitle: getSentimentDescription(sentiment),
                        color: getSentimentColor(sentiment)
                    )
                }
                
                if let vocabulary = metrics.vocabularyDiversityScore {
                    MetricCard(
                        title: "Vocabulary Diversity",
                        value: String(format: "%.1f", vocabulary),
                        subtitle: getVocabularyDescription(vocabulary),
                        color: .blue
                    )
                }
                
                if let complexity = metrics.complexityScore {
                    MetricCard(
                        title: "Complexity",
                        value: String(format: "%.1f", complexity),
                        subtitle: getComplexityDescription(complexity),
                        color: .purple
                    )
                }
                
                if let readability = metrics.readabilityLevel {
                    MetricCard(
                        title: "Readability",
                        value: String(format: "%.1f", readability),
                        subtitle: getReadabilityDescription(readability),
                        color: .green
                    )
                }
            }
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(12)
    }
    
    // MARK: - Revisions Section
    private var revisionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Revision History")
                .font(.headline)
            
            ForEach(currentEntry.revisions, id: \.id) { revision in
                RevisionRowView(revision: revision)
            }
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(12)
    }
    
    // MARK: - Helper Methods
    private func updateStatus(to status: CompletionStatus) {
        isUpdatingStatus = true
        
        Task {
            do {
                let updatedEntry = try await journalService.updateEntry(
                    currentEntry,
                    content: currentEntry.content,
                    moodScore: currentEntry.moodScore,
                    targetWordCount: currentEntry.targetWordCount
                )
                await MainActor.run {
                    currentEntry = updatedEntry
                    isUpdatingStatus = false
                }
            } catch {
                await MainActor.run {
                    isUpdatingStatus = false
                }
                print("Failed to update status: \(error)")
            }
        }
    }
    
    private func deleteEntry() {
        Task {
            do {
                try await journalService.deleteEntry(currentEntry)
                // Navigation should be handled by parent view
                
                // Tags are now automatically refreshed by JournalService
                // when entries are updated, so no manual refresh needed
            } catch {
                print("Failed to delete entry: \(error)")
            }
        }
    }
    
    private func duplicateEntry() {
        // Create a copy of the entry for editing
        navigationManager.navigateToEditor(mode: .edit(currentEntry))
    }
    
    private func getStatusIcon(_ status: CompletionStatus) -> String {
        switch status {
        case .draft:
            return "doc.text"
        case .complete:
            return "checkmark.circle"
        case .archived:
            return "archivebox"
        }
    }
    
    private func getMoodDescription(for score: Float) -> String {
        switch score {
        case 0.8...1.0: return "Fantastic"
        case 0.6..<0.8: return "Great"
        case 0.3..<0.6: return "Good"
        case 0.1..<0.3: return "Okay"
        case -0.1..<0.1: return "Neutral"
        case -0.3..<(-0.1): return "Not great"
        case -0.6..<(-0.3): return "Bad"
        case -0.8..<(-0.6): return "Terrible"
        default: return "Awful"
        }
    }
    
    private func formatDuration(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let remainingSeconds = seconds % 60
        
        if minutes > 0 {
            return "\(minutes)m \(remainingSeconds)s"
        } else {
            return "\(remainingSeconds)s"
        }
    }
    
    private func getSentimentDescription(_ score: Float) -> String {
        switch score {
        case 0.3...1.0: return "Positive"
        case -0.3..<0.3: return "Neutral"
        default: return "Negative"
        }
    }
    
    private func getSentimentColor(_ score: Float) -> Color {
        switch score {
        case 0.3...1.0: return .green
        case -0.3..<0.3: return .gray
        default: return .red
        }
    }
    
    private func getVocabularyDescription(_ score: Float) -> String {
        switch score {
        case 0.8...1.0: return "Very Rich"
        case 0.6..<0.8: return "Rich"
        case 0.4..<0.6: return "Moderate"
        case 0.2..<0.4: return "Limited"
        default: return "Basic"
        }
    }
    
    private func getComplexityDescription(_ score: Float) -> String {
        switch score {
        case 0.8...1.0: return "Very Complex"
        case 0.6..<0.8: return "Complex"
        case 0.4..<0.6: return "Moderate"
        case 0.2..<0.4: return "Simple"
        default: return "Basic"
        }
    }
    
    private func getReadabilityDescription(_ score: Float) -> String {
        switch score {
        case 0.8...1.0: return "Very Easy"
        case 0.6..<0.8: return "Easy"
        case 0.4..<0.6: return "Moderate"
        case 0.2..<0.4: return "Difficult"
        default: return "Very Difficult"
        }
    }
}

// MARK: - Supporting Views

struct ThemeCardView: View {
    let theme: Theme
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(theme.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                if let description = theme.description {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 2) {
                Text(theme.displayConfidence)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.accentColor)
                
                Text("confidence")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 8)
    }
}

struct MetadataRow: View {
    let title: String
    let value: String
    let icon: String
    
    var body: some View {
        HStack {
            Label(title, systemImage: icon)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Spacer()
            
            Text(value)
                .font(.caption)
                .fontWeight(.medium)
        }
    }
}

struct MetricCard: View {
    let title: String
    let value: String
    let subtitle: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            
            Text(subtitle)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(NSColor.textBackgroundColor))
        .cornerRadius(8)
    }
}

struct RevisionRowView: View {
    let revision: EntryRevision
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Revision \(revision.revisionNumber)")
                    .font(.caption)
                    .fontWeight(.medium)
                
                Text(revision.revisionType.capitalized)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Text(revision.createdAt, style: .relative)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

struct SelectableText: View {
    let text: String
    
    var body: some View {
        Text(text)
            .textSelection(.enabled)
    }
}

// MARK: - Preview
#Preview {
    NavigationView {
        EntryDetailView(
            entry: JournalEntry(
                userID: UUID(),
                content: "Today was an amazing day! I managed to complete all my tasks and even had time for a walk in the park. #productivity #wellness #gratitude",
                moodScore: 0.8,
                targetWordCount: 100,
                tags: [
                    Tag(name: "productivity", color: "#FF6B6B"),
                    Tag(name: "wellness", color: "#4ECDC4"),
                    Tag(name: "gratitude", color: "#45B7D1")
                ]
            )
        )
    }
} 