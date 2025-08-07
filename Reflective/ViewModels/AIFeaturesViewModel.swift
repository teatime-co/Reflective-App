//
//  AIFeaturesViewModel.swift
//  Reflective
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation
import Combine
import SwiftUI

@MainActor
class AIFeaturesViewModel: ObservableObject {
    
    // MARK: - Published Properties
    @Published var aiSettings: AISettings = AISettings.default
    @Published var processingQueue: [ProcessingTask] = []
    @Published var processingErrors: [AIError] = []
    @Published var currentStatus: ProcessingStatus = .idle
    @Published var isShowingSettings = false
    @Published var isShowingErrors = false
    @Published var selectedTimeframe: TimeFrame = .month
    
    // Processing progress
    @Published var totalTasksCount: Int = 0
    @Published var completedTasksCount: Int = 0
    @Published var progressPercentage: Double = 0.0
    
    // UI state
    @Published var isRefreshing = false
    @Published var lastRefreshDate: Date?
    @Published var showSuccessToast = false
    @Published var successMessage = ""
    @Published var showErrorAlert = false
    @Published var errorMessage = ""
    
    // MARK: - Dependencies
    private let aiService: AIFeaturesService
    private let themeService: ThemeService
    private let linguisticService: LinguisticService
    private let coreDataManager: CoreDataManager
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    // REMOVED: All periodic refresh functionality disabled
    
    // MARK: - Initialization
    init(
        aiService: AIFeaturesService,
        themeService: ThemeService,
        linguisticService: LinguisticService,
        coreDataManager: CoreDataManager
    ) {
        self.aiService = aiService
        self.themeService = themeService
        self.linguisticService = linguisticService
        self.coreDataManager = coreDataManager
        
        setupBindings()
        // DISABLED: Periodic refresh was spamming the server with requests
        // Only enable if explicitly needed
        // if isPeriodicRefreshEnabled {
        //     startPeriodicRefresh()
        // }
    }
    
    // Convenience initializer that uses shared instances
    convenience init() {
        self.init(
            aiService: AIFeaturesService(),
            themeService: ThemeService.shared,
            linguisticService: LinguisticService.shared,
            coreDataManager: CoreDataManager.shared
        )
    }
    
    deinit {
        // Timer will be automatically invalidated when the object is deallocated
        // No explicit cleanup needed due to MainActor isolation constraints
    }
    
    // MARK: - Public Methods
    
    /// Process a single journal entry with AI features
    func processEntry(_ entry: JournalEntry) async {
        do {
            try await aiService.processEntry(entry)
            showSuccessMessage("Entry processed successfully")
        } catch {
            showErrorMessage("Failed to process entry: \(error.localizedDescription)")
        }
    }
    
    /// Analyze a single journal entry with both theme detection and linguistic analysis concurrently
    func analyzeEntry(_ entry: JournalEntry) async -> (themes: [Theme], linguistics: LinguisticMetrics?) {
        do {
            let results = try await aiService.analyzeEntry(entry)
            showSuccessMessage("Entry analysis completed successfully")
            return results
        } catch {
            showErrorMessage("Failed to analyze entry: \(error.localizedDescription)")
            return (themes: [], linguistics: nil)
        }
    }
    
    /// Process multiple entries in batch
    func batchProcessEntries(_ entries: [JournalEntry]) async {
        guard !entries.isEmpty else { return }
        
        do {
            try await aiService.batchProcessEntries(entries)
            showSuccessMessage("Successfully processed \(entries.count) entries")
        } catch {
            showErrorMessage("Failed to batch process entries: \(error.localizedDescription)")
        }
    }
    
    /// Update AI settings
    func updateSettings(_ settings: AISettings) async {
        do {
            try await aiService.updateAISettings(settings)
            self.aiSettings = settings
            showSuccessMessage("AI settings updated successfully")
        } catch {
            showErrorMessage("Failed to update settings: \(error.localizedDescription)")
        }
    }
    
    /// Retry failed processing tasks
    func retryFailedTasks() async {
        do {
            try await aiService.retryFailedProcessing()
            showSuccessMessage("Retrying failed tasks")
        } catch {
            showErrorMessage("Failed to retry tasks: \(error.localizedDescription)")
        }
    }
    
    /// Clear completed and failed tasks
    func clearCompletedTasks() {
        aiService.clearCompletedTasks()
        showSuccessMessage("Cleared completed tasks")
    }
    
    /// Clear processing errors
    func clearErrors() {
        aiService.clearErrors()
        processingErrors.removeAll()
    }
    
    /// Refresh AI data
    func refresh() async {
        isRefreshing = true
        defer { isRefreshing = false }
        
        do {
            // DISABLED: Removed automatic analytics refresh to prevent server spam
            // Only refresh analytics manually when user specifically requests it
            // let _ = try await linguisticService.getAnalyticsSummary(timeframe: selectedTimeframe)
            
            lastRefreshDate = Date()
            
        } catch {
            showErrorMessage("Failed to refresh AI data: \(error.localizedDescription)")
        }
    }
    
    /// Manual refresh for analytics data only when explicitly requested
    func refreshAnalytics() async {
        isRefreshing = true
        defer { isRefreshing = false }
        
        do {
            let _ = try await linguisticService.getAnalyticsSummary(timeframe: selectedTimeframe)
            lastRefreshDate = Date()
            
        } catch {
            showErrorMessage("Failed to refresh analytics: \(error.localizedDescription)")
        }
    }
    
    // REMOVED: Custom analyzeEntry method - using existing processEntry instead
    
    /// Toggle AI feature enable/disable
    func toggleFeature(_ feature: AIFeature) async {
        var updatedSettings = aiSettings
        
        switch feature {
        case .themeDetection:
            updatedSettings.isThemeDetectionEnabled.toggle()
        case .linguisticAnalysis:
            updatedSettings.isLinguisticAnalysisEnabled.toggle()
        }
        
        await updateSettings(updatedSettings)
    }
    
    /// Get processing tasks for a specific entry
    func getTasksForEntry(_ entryId: UUID) -> [ProcessingTask] {
        return processingQueue.filter { $0.entryId == entryId }
    }
    
    /// Get errors for a specific entry
    func getErrorsForEntry(_ entryId: UUID) -> [AIError] {
        return processingErrors.filter { $0.entryId == entryId }
    }
    
    /// Check if processing is active for an entry
    func isProcessingEntry(_ entryId: UUID) -> Bool {
        return getTasksForEntry(entryId).contains { task in
            switch task.status {
            case .pending, .processing, .retrying:
                return true
            default:
                return false
            }
        }
    }
    
    /// Get processing progress for an entry
    func getProcessingProgress(for entryId: UUID) -> Float {
        let tasks = getTasksForEntry(entryId)
        guard !tasks.isEmpty else { return 0.0 }
        
        let completedTasks = tasks.filter { task in
            if case .completed = task.status { return true }
            return false
        }
        
        return Float(completedTasks.count) / Float(tasks.count)
    }
    
    // MARK: - Settings Management
    
    /// Show AI settings view
    func showSettings() {
        isShowingSettings = true
    }
    
    /// Hide AI settings view
    func hideSettings() {
        isShowingSettings = false
    }
    
    /// Reset settings to default
    func resetSettingsToDefault() async {
        await updateSettings(AISettings.default)
    }
    
    /// Update confidence threshold
    func updateConfidenceThreshold(_ threshold: Float) async {
        var updatedSettings = aiSettings
        updatedSettings.themeConfidenceThreshold = threshold
        await updateSettings(updatedSettings)
    }
    
    /// Toggle auto-processing
    func toggleAutoProcessing() async {
        var updatedSettings = aiSettings
        updatedSettings.autoProcessNewEntries.toggle()
        await updateSettings(updatedSettings)
    }
    
    /// Toggle batch processing
    func toggleBatchProcessing() async {
        var updatedSettings = aiSettings
        updatedSettings.batchProcessingEnabled.toggle()
        await updateSettings(updatedSettings)
    }
    
    // MARK: - Error Handling
    
    /// Show error details view
    func showErrors() {
        isShowingErrors = true
    }
    
    /// Hide error details view
    func hideErrors() {
        isShowingErrors = false
    }
    
    /// Dismiss specific error
    func dismissError(_ error: AIError) {
        processingErrors.removeAll { $0.id == error.id }
    }
    
    /// Get error summary
    func getErrorSummary() -> String {
        let errorCount = processingErrors.count
        if errorCount == 0 {
            return "No errors"
        } else if errorCount == 1 {
            return "1 error"
        } else {
            return "\(errorCount) errors"
        }
    }
    
    // MARK: - Analytics & Insights
    
    /// Get processing statistics
    func getProcessingStatistics() -> ProcessingStatistics {
        let totalTasks = processingQueue.count
        let completedTasks = processingQueue.filter { task in
            if case .completed = task.status { return true }
            return false
        }.count
        let failedTasks = processingQueue.filter { task in
            if case .failed = task.status { return true }
            return false
        }.count
        let pendingTasks = processingQueue.filter { task in
            if case .pending = task.status { return true }
            return false
        }.count
        
        return ProcessingStatistics(
            totalTasks: totalTasks,
            completedTasks: completedTasks,
            failedTasks: failedTasks,
            pendingTasks: pendingTasks,
            errorCount: processingErrors.count
        )
    }
    
    /// Check if AI features are properly configured
    var isProperlyConfigured: Bool {
        return aiSettings.isThemeDetectionEnabled || aiSettings.isLinguisticAnalysisEnabled
    }
    
    /// Get recommendation for user
    func getRecommendation() -> String? {
        if !isProperlyConfigured {
            return "Enable AI features to get insights about your writing"
        }
        
        if processingErrors.count > 3 {
            return "Multiple processing errors detected. Check your network connection"
        }
        
        let stats = getProcessingStatistics()
        if stats.pendingTasks > 10 {
            return "Many entries are pending analysis. Consider batch processing"
        }
        
        return nil
    }
    
    // MARK: - Private Methods
    
    private func setupBindings() {
        // Bind AI service properties
        aiService.$aiSettings
            .receive(on: DispatchQueue.main)
            .assign(to: &$aiSettings)
        
        aiService.$processingQueue
            .receive(on: DispatchQueue.main)
            .assign(to: &$processingQueue)
        
        aiService.$processingErrors
            .receive(on: DispatchQueue.main)
            .assign(to: &$processingErrors)
        
        aiService.$currentStatus
            .receive(on: DispatchQueue.main)
            .assign(to: &$currentStatus)
        
        // Calculate progress
        $processingQueue
            .map { tasks in
                let completed = tasks.filter { task in
                    if case .completed = task.status { return true }
                    return false
                }.count
                return completed
            }
            .assign(to: &$completedTasksCount)
        
        $processingQueue
            .map { $0.count }
            .assign(to: &$totalTasksCount)
        
        Publishers.CombineLatest($completedTasksCount, $totalTasksCount)
            .map { completed, total in
                guard total > 0 else { return 0.0 }
                return Double(completed) / Double(total)
            }
            .assign(to: &$progressPercentage)
    }
    
    private func showSuccessMessage(_ message: String) {
        successMessage = message
        showSuccessToast = true
        
        // Auto-hide after 3 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            self.showSuccessToast = false
        }
    }
    
    private func showErrorMessage(_ message: String) {
        errorMessage = message
        showErrorAlert = true
    }
}

// MARK: - Supporting Types

struct ProcessingStatistics {
    let totalTasks: Int
    let completedTasks: Int
    let failedTasks: Int
    let pendingTasks: Int
    let errorCount: Int
    
    var successRate: Double {
        guard totalTasks > 0 else { return 0.0 }
        return Double(completedTasks) / Double(totalTasks)
    }
    
    var failureRate: Double {
        guard totalTasks > 0 else { return 0.0 }
        return Double(failedTasks) / Double(totalTasks)
    }
}

// MARK: - Extensions

extension AIFeaturesViewModel {
    /// Convenience computed properties for UI
    var hasActiveProcessing: Bool {
        return currentStatus.isProcessing
    }
    
    var hasErrors: Bool {
        return !processingErrors.isEmpty
    }
    
    var canRetry: Bool {
        return processingErrors.contains { _ in true } || 
               processingQueue.contains { task in
                   if case .failed = task.status { return true }
                   return false
               }
    }
    
    var processingStatusText: String {
        switch currentStatus {
        case .idle:
            return "Ready"
        case .processing(let count):
            return "Processing \(count) task\(count == 1 ? "" : "s")"
        case .completed:
            return "Completed"
        case .error(let message):
            return "Error: \(message)"
        }
    }
    
    var processingStatusColor: Color {
        switch currentStatus {
        case .idle:
            return .secondary
        case .processing:
            return .blue
        case .completed:
            return .green
        case .error:
            return .red
        }
    }
} 

// REMOVED: CombinedAnalysisResult struct - using existing analysis functionality instead 