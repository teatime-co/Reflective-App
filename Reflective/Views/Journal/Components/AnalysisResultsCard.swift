//
//  AnalysisResultsCard.swift
//  Reflective
//
//  Created by Assistant on 1/10/25.
//

import SwiftUI

struct AnalysisResultsCard: View {
    @ObservedObject var aiViewModel: AIFeaturesViewModel
    let entryId: UUID
    let directResults: (themes: [Theme], linguistics: LinguisticMetrics?)?
    @State private var isExpanded = true
    @State private var refreshTimer: Timer?
    
    // Force re-render trigger
    @State private var forceRenderTrigger = 0
    
    // Observe the journal service directly
    @StateObject private var journalService = JournalService.shared
    
    // Store the actual data we want to display
    @State private var displayThemes: [Theme] = []
    @State private var displayLinguistics: LinguisticMetrics?
    
    // Convenience initializer for backwards compatibility
    init(aiViewModel: AIFeaturesViewModel, entryId: UUID) {
        self.aiViewModel = aiViewModel
        self.entryId = entryId
        self.directResults = nil
    }
    
    // Full initializer with direct results
    init(aiViewModel: AIFeaturesViewModel, entryId: UUID, directResults: (themes: [Theme], linguistics: LinguisticMetrics?)?) {
        self.aiViewModel = aiViewModel
        self.entryId = entryId
        self.directResults = directResults
    }
    
    // Get the current entry directly from the observed journal service
    private var currentEntry: JournalEntry? {
        journalService.entries.first(where: { $0.id == entryId })
    }
    
    // Computed property to get the themes to display (direct results take precedence)
    private var themesToDisplay: [Theme] {
        if let directResults = directResults {
            return directResults.themes
        }
        return displayThemes
    }
    
    // Computed property to get the linguistics to display (direct results take precedence)
    private var linguisticsToDisplay: LinguisticMetrics? {
        if let directResults = directResults {
            return directResults.linguistics
        }
        return displayLinguistics
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            headerView
            
            if isExpanded {
                VStack(spacing: 16) {
                    // Processing status
                    if aiViewModel.isProcessingEntry(entryId) {
                        processingSection
                    }
                    
                    // Errors if any
                    let errors = aiViewModel.getErrorsForEntry(entryId)
                    if !errors.isEmpty {
                        errorSection(errors: errors)
                    }
                    
                    // Show actual analysis results
                    if !aiViewModel.isProcessingEntry(entryId) {
                        analysisResultsSection
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
        }
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(NSColor.separatorColor), lineWidth: 1)
        )
        .onAppear {
            print("🔍 DEBUG: Card appeared for entry \(entryId)")
            updateDisplayData()
            forceRefreshData()
        }
        .onDisappear {
            stopRefreshTimer()
        }
        .onChange(of: forceRenderTrigger) { _, _ in
            // This will force re-render when we increment the trigger
            updateDisplayData()
        }
        .onChange(of: aiViewModel.isProcessingEntry(entryId)) { _, isProcessing in
            print("🔍 DEBUG: Processing state changed to: \(isProcessing)")
            if isProcessing {
                // Only start timer-based refresh if we don't have direct results
                if directResults == nil {
                    startRefreshTimer()
                }
            } else {
                stopRefreshTimer()
                // Only force refresh if we don't have direct results (since direct results come from API)
                if directResults == nil {
                    forceRefreshData()
                    
                    // Schedule additional refreshes to catch delayed updates
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                        self.forceRefreshData()
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                        self.forceRefreshData()
                    }
                }
            }
        }
    }
    
    private var headerView: some View {
        HStack {
            Image(systemName: "brain.head.profile")
                .foregroundColor(.blue)
                .font(.title2)
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Analysis")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Text(statusText)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Status indicators
            HStack(spacing: 8) {
                if aiViewModel.isProcessingEntry(entryId) {
                    statusBadge("Processing", color: .blue)
                } else if !aiViewModel.getErrorsForEntry(entryId).isEmpty {
                    statusBadge("Errors", color: .orange)
                } else {
                    statusBadge("Completed", color: .green)
                }
            }
            
            Button(action: { 
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            }) {
                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                    .foregroundColor(.secondary)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding(16)
        .background(Color(NSColor.controlBackgroundColor).opacity(0.5))
    }
    
    private var analysisResultsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Theme Detection Results
            if !themesToDisplay.isEmpty {
                themeResultsSection
            }
            
            // Linguistic Analysis Results
            if let linguistics = linguisticsToDisplay {
                linguisticResultsSection(linguistics)
            }
            
            // Show message if no results
            if themesToDisplay.isEmpty && linguisticsToDisplay == nil && !aiViewModel.isProcessingEntry(entryId) {
                noResultsSection
            }
        }
    }
    
    private var themeResultsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "tag.fill")
                    .foregroundColor(.purple)
                Text("Detected Themes")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                Text("\(themesToDisplay.count) themes")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            VStack(spacing: 6) {
                ForEach(themesToDisplay.prefix(3), id: \.id) { theme in
                    HStack {
                        Circle()
                            .fill(theme.swiftUIColor)
                            .frame(width: 8, height: 8)
                        
                        Text(theme.name)
                            .font(.caption)
                            .fontWeight(.medium)
                        
                        Spacer()
                        
                        Text(theme.formattedConfidence)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 1)
                            .background(Color.secondary.opacity(0.1))
                            .cornerRadius(4)
                    }
                }
                
                if themesToDisplay.count > 3 {
                    Text("+ \(themesToDisplay.count - 3) more themes")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
        .padding(12)
        .background(Color.purple.opacity(0.1))
        .cornerRadius(8)
    }
    
    private func linguisticResultsSection(_ metrics: LinguisticMetrics) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "textformat.abc")
                    .foregroundColor(.green)
                Text("Linguistic Analysis")
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }
            
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 8) {
                if let sentiment = metrics.sentiment_score {
                    VStack(alignment: .leading, spacing: 4) {
                        Label {
                            Text("Sentiment")
                                .font(.caption)
                                .fontWeight(.medium)
                        } icon: {
                            Image(systemName: "heart.text.square")
                                .foregroundColor(.red)
                        }
                        
                        HStack(alignment: .bottom, spacing: 4) {
                            Text(String(format: "%.2f", sentiment))
                                .font(.title3)
                                .fontWeight(.semibold)
                                .foregroundColor(.secondary)
                            
                            Text(sentimentDescription(sentiment))
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        Text("Range: -1.0 (negative) to +1.0 (positive)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .opacity(0.8)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(6)
                    .help("Measures emotional tone: negative values indicate sad/angry content, positive values indicate happy/optimistic content")
                }
                
                if let vocabulary = metrics.vocabulary_diversity_score {
                    VStack(alignment: .leading, spacing: 4) {
                        Label {
                            Text("Vocabulary")
                                .font(.caption)
                                .fontWeight(.medium)
                        } icon: {
                            Image(systemName: "text.book.closed")
                                .foregroundColor(.blue)
                        }
                        
                        HStack(alignment: .bottom, spacing: 4) {
                            Text(String(format: "%.2f", vocabulary))
                                .font(.title3)
                                .fontWeight(.semibold)
                                .foregroundColor(.secondary)
                            
                            Text(vocabularyDescription(vocabulary))
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        Text("Range: 0.0 (basic) to 1.0 (very diverse)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .opacity(0.8)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(6)
                    .help("Measures word variety: higher values indicate richer vocabulary and more unique word usage")
                }
                
                if let complexity = metrics.complexity_score {
                    VStack(alignment: .leading, spacing: 4) {
                        Label {
                            Text("Complexity")
                                .font(.caption)
                                .fontWeight(.medium)
                        } icon: {
                            Image(systemName: "brain.head.profile")
                                .foregroundColor(.purple)
                        }
                        
                        HStack(alignment: .bottom, spacing: 4) {
                            Text(String(format: "%.2f", complexity))
                                .font(.title3)
                                .fontWeight(.semibold)
                                .foregroundColor(.secondary)
                            
                            Text(complexityDescription(complexity))
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        Text("Range: 0.0 (simple) to 1.0 (very complex)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .opacity(0.8)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                    .background(Color.purple.opacity(0.1))
                    .cornerRadius(6)
                    .help("Measures sentence structure and language sophistication: higher values indicate more complex thoughts and expressions")
                }
                
                if let readability = metrics.readability_level {
                    VStack(alignment: .leading, spacing: 4) {
                        Label {
                            Text("Readability")
                                .font(.caption)
                                .fontWeight(.medium)
                        } icon: {
                            Image(systemName: "doc.text")
                                .foregroundColor(.orange)
                        }
                        
                        HStack(alignment: .bottom, spacing: 4) {
                            Text(String(format: "%.1f", readability))
                                .font(.title3)
                                .fontWeight(.semibold)
                                .foregroundColor(.secondary)
                            
                            Text(readabilityDescription(readability))
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        Text("Range: 1-20+ (grade level equivalent)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .opacity(0.8)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(6)
                    .help("Measures reading difficulty: lower values are easier to read, higher values require more advanced reading skills")
                }
            }
        }
        .padding(12)
        .background(Color.green.opacity(0.1))
        .cornerRadius(8)
    }
    
    // MARK: - Helper functions for metric descriptions
    
    private func sentimentDescription(_ score: Float) -> String {
        switch score {
        case 0.6...1.0: return "Very Positive"
        case 0.3..<0.6: return "Positive"
        case 0.1..<0.3: return "Slightly Positive"
        case -0.1..<0.1: return "Neutral"
        case -0.3..<(-0.1): return "Slightly Negative"
        case -0.6..<(-0.3): return "Negative"
        default: return "Very Negative"
        }
    }
    
    private func vocabularyDescription(_ score: Float) -> String {
        switch score {
        case 0.8...1.0: return "Excellent"
        case 0.6..<0.8: return "Good"
        case 0.4..<0.6: return "Moderate"
        case 0.2..<0.4: return "Basic"
        default: return "Limited"
        }
    }
    
    private func complexityDescription(_ score: Float) -> String {
        switch score {
        case 0.8...1.0: return "Very Complex"
        case 0.6..<0.8: return "Complex"
        case 0.4..<0.6: return "Moderate"
        case 0.2..<0.4: return "Simple"
        default: return "Very Simple"
        }
    }
    
    private func readabilityDescription(_ level: Float) -> String {
        switch level {
        case 1.0..<6.0: return "Elementary"
        case 6.0..<9.0: return "Middle School"
        case 9.0..<13.0: return "High School"
        case 13.0..<16.0: return "College"
        case 16.0..<20.0: return "Graduate"
        default: return "Professional"
        }
    }
    
    private func metricBadge(title: String, value: String, color: Color) -> some View {
        VStack(spacing: 2) {
            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)
            Text(value)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 4)
        .background(Color(NSColor.textBackgroundColor))
        .cornerRadius(6)
    }
    
    private var noResultsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "info.circle")
                    .foregroundColor(.blue)
                Text("No Analysis Results")
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }
            
            Text("Click the 'Analyze with AI' button to analyze this entry for themes and linguistic patterns.")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(12)
        .background(Color.blue.opacity(0.1))
        .cornerRadius(8)
    }
    
    private func getSentimentColor(_ score: Float) -> Color {
        switch score {
        case 0.3...1.0: return .green
        case -0.3..<0.3: return .gray
        default: return .red
        }
    }
    
    private var statusText: String {
        if aiViewModel.isProcessingEntry(entryId) {
            let progress = aiViewModel.getProcessingProgress(for: entryId)
            return "Processing... \(Int(progress * 100))%"
        } else if !aiViewModel.getErrorsForEntry(entryId).isEmpty {
            return "Analysis completed with errors"
        } else if !themesToDisplay.isEmpty || linguisticsToDisplay != nil {
            return "Analysis results available"
        } else {
            return "No analysis data"
        }
    }
    
    private func statusBadge(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.2))
            .foregroundColor(color)
            .cornerRadius(8)
    }
    
    private var processingSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                ProgressView()
                    .scaleEffect(0.8)
                Text("Running AI Analysis...")
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }
            
            let tasks = aiViewModel.getTasksForEntry(entryId)
            VStack(alignment: .leading, spacing: 4) {
                ForEach(tasks, id: \.id) { task in
                    HStack {
                        Image(systemName: taskIcon(for: task.feature))
                            .foregroundColor(taskColor(for: task.status))
                        Text(task.feature.displayName)
                            .font(.caption)
                        Spacer()
                        Text(taskStatusText(for: task.status))
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding(12)
        .background(Color.blue.opacity(0.1))
        .cornerRadius(8)
    }
    
    private func errorSection(errors: [AIError]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.orange)
                Text("Analysis Warnings")
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                ForEach(errors, id: \.id) { error in
                    Text("• \(error.localizedDescription)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(12)
        .background(Color.orange.opacity(0.1))
        .cornerRadius(8)
    }
    
    private func taskIcon(for feature: AIFeature) -> String {
        switch feature {
        case .themeDetection:
            return "tag.fill"
        case .linguisticAnalysis:
            return "textformat.abc"
        }
    }
    
    private func taskColor(for status: ProcessingTask.TaskStatus) -> Color {
        switch status {
        case .pending:
            return .gray
        case .processing:
            return .blue
        case .completed:
            return .green
        case .failed:
            return .red
        case .retrying:
            return .orange
        }
    }
    
    private func taskStatusText(for status: ProcessingTask.TaskStatus) -> String {
        switch status {
        case .pending:
            return "Pending"
        case .processing:
            return "Processing"
        case .completed:
            return "Complete"
        case .failed:
            return "Failed"
        case .retrying(let attempt):
            return "Retry \(attempt)"
        }
    }
    
    private func updateDisplayData() {
        // Only update if we don't have direct results (direct results take precedence)
        if directResults == nil {
            if let entry = currentEntry {
                print("🔍 DEBUG: Updating display data from Core Data - themes: \(entry.themes.count), linguistics: \(entry.linguisticMetrics != nil)")
                displayThemes = entry.themes
                displayLinguistics = entry.linguisticMetrics
            } else {
                print("🔍 DEBUG: No current entry found for user")
                displayThemes = []
                displayLinguistics = nil
            }
        } else {
            print("🔍 DEBUG: Skipping Core Data update - using direct API results")
        }
    }
    
    private func startRefreshTimer() {
        stopRefreshTimer()
        // Only start timer if we don't have direct results
        if directResults == nil {
            refreshTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { _ in
                forceRefreshData()
            }
        }
    }
    
    private func stopRefreshTimer() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }
    
    private func forceRefreshData() {
        print("🔍 DEBUG: Force refreshing data for entry \(entryId)")
        Task {
            do {
                // Get the specific entry directly from the API instead of fetching all entries
                // This ensures we only get data for the current user
                let refreshedEntry = try await journalService.getEntry(id: entryId)
                print("🔍 DEBUG: Successfully refreshed entry from API")
                
                await MainActor.run {
                    // Update display data from the refreshed entry
                    displayThemes = refreshedEntry.themes
                    displayLinguistics = refreshedEntry.linguisticMetrics
                    
                    // Force a re-render by incrementing the trigger
                    forceRenderTrigger += 1
                    print("🔍 DEBUG: Updated display data - themes: \(displayThemes.count), linguistics: \(displayLinguistics != nil)")
                }
            } catch {
                print("🔍 DEBUG: Failed to refresh entry: \(error)")
            }
        }
    }
}

// MARK: - Preview

struct AnalysisResultsCard_Previews: PreviewProvider {
    static var previews: some View {
        AnalysisResultsCard(
            aiViewModel: AIFeaturesViewModel(),
            entryId: UUID(),
            directResults: (themes: [], linguistics: nil)
        )
        .frame(width: 400)
        .padding()
    }
} 