//
//  AIFeaturesService.swift
//  Reflective
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation
import Combine

// MARK: - AI Processing Types
enum AIFeature: String, CaseIterable {
    case themeDetection = "theme_detection"
    case linguisticAnalysis = "linguistic_analysis"
    
    var displayName: String {
        switch self {
        case .themeDetection:
            return "Theme Detection"
        case .linguisticAnalysis:
            return "Linguistic Analysis"
        }
    }
}

enum ProcessingStatus: Equatable {
    case idle
    case processing(count: Int)
    case completed
    case error(String)
    
    var isProcessing: Bool {
        if case .processing = self { return true }
        return false
    }
}

struct ProcessingTask: Identifiable {
    let id = UUID()
    let entryId: UUID
    let feature: AIFeature
    let status: TaskStatus
    let createdAt: Date
    let updatedAt: Date
    
    enum TaskStatus: Equatable {
        case pending
        case processing
        case completed
        case failed(String)
        case retrying(attempt: Int)
        
        static func == (lhs: TaskStatus, rhs: TaskStatus) -> Bool {
            switch (lhs, rhs) {
            case (.pending, .pending), (.processing, .processing), (.completed, .completed):
                return true
            case (.failed(let lhsMessage), .failed(let rhsMessage)):
                return lhsMessage == rhsMessage
            case (.retrying(let lhsAttempt), .retrying(let rhsAttempt)):
                return lhsAttempt == rhsAttempt
            default:
                return false
            }
        }
    }
}

struct AISettings: Codable, Equatable {
    var isThemeDetectionEnabled: Bool
    var isLinguisticAnalysisEnabled: Bool
    var themeConfidenceThreshold: Float
    var autoProcessNewEntries: Bool
    var batchProcessingEnabled: Bool
    var maxRetryAttempts: Int
    
    static let `default` = AISettings(
        isThemeDetectionEnabled: true,
        isLinguisticAnalysisEnabled: true,
        themeConfidenceThreshold: 0.35,
        autoProcessNewEntries: false,
        batchProcessingEnabled: true,
        maxRetryAttempts: 3
    )
}

struct AIError: Error, Identifiable {
    let id = UUID()
    let feature: AIFeature
    let entryId: UUID
    let message: String
    let timestamp: Date
    let retryCount: Int
    
    var localizedDescription: String {
        return "\(feature.displayName): \(message)"
    }
}

// MARK: - AI Features Service
@MainActor
class AIFeaturesService: ObservableObject {
    
    // MARK: - Published Properties
    @Published var aiSettings: AISettings = AISettings.default
    @Published var processingQueue: [ProcessingTask] = []
    @Published var processingErrors: [AIError] = []
    @Published var currentStatus: ProcessingStatus = .idle
    
    // MARK: - Dependencies
    private let themeService: ThemeService
    private let linguisticService: LinguisticService
    private let coreDataManager: CoreDataManager
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    private let aiProcessingQueue = DispatchQueue(label: "ai.processing", qos: .background)
    private let maxConcurrentTasks = 3
    
    // MARK: - Initialization
    init(
        themeService: ThemeService? = nil,
        linguisticService: LinguisticService? = nil,
        coreDataManager: CoreDataManager? = nil
    ) {
        self.themeService = themeService ?? ThemeService.shared
        self.linguisticService = linguisticService ?? LinguisticService.shared
        self.coreDataManager = coreDataManager ?? CoreDataManager.shared
        
        loadAISettings()
        setupStatusMonitoring()
    }
    
    // MARK: - Public Methods
    
    /// Process a journal entry with specified AI features
    func processEntry(_ entry: JournalEntry, features: [AIFeature]? = nil) async throws {
        guard !entry.content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw AIError(
                feature: .themeDetection,
                entryId: entry.id,
                message: "Entry content is empty",
                timestamp: Date(),
                retryCount: 0
            )
        }
        
        let featuresToProcess = features ?? getEnabledFeatures()
        print("🤖 AIFeaturesService: Processing entry \(entry.id) with features: \(featuresToProcess.map { $0.displayName }.joined(separator: ", "))")
        
        for feature in featuresToProcess {
            await addProcessingTask(entryId: entry.id, feature: feature)
        }
        
        await processQueuedTasks()
    }
    
    /// Process both theme detection and linguistic analysis concurrently for a single entry
    func analyzeEntry(_ entry: JournalEntry) async throws -> (themes: [Theme], linguistics: LinguisticMetrics?) {
        guard !entry.content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw AIError(
                feature: .themeDetection,
                entryId: entry.id,
                message: "Entry content is empty",
                timestamp: Date(),
                retryCount: 0
            )
        }
        
        print("🔍 AIFeaturesService: Starting concurrent analysis for entry \(entry.id)")
        
        // Run both analyses concurrently
        async let themeResults = processThemeDetection(entryId: entry.id)
        async let linguisticResults = processLinguisticAnalysis(entryId: entry.id)
        
        // Wait for both to complete, but handle potential failures gracefully
        do {
            let themes = try await themeResults
            
            // Linguistic analysis might fail, so handle it separately
            let linguistics: LinguisticMetrics?
            do {
                linguistics = try await linguisticResults
            } catch {
                print("⚠️ AIFeaturesService: Linguistic analysis failed for entry \(entry.id): \(error)")
                linguistics = nil
            }
            
            print("✅ AIFeaturesService: Concurrent analysis completed for entry \(entry.id)")
            return (themes: themes, linguistics: linguistics)
            
        } catch {
            print("❌ AIFeaturesService: Concurrent analysis failed for entry \(entry.id): \(error)")
            throw error
        }
    }
    
    /// Process multiple entries in batch
    func batchProcessEntries(_ entries: [JournalEntry], features: [AIFeature]? = nil) async throws {
        guard aiSettings.batchProcessingEnabled else {
            // Process individually if batch processing is disabled
            for entry in entries {
                try await processEntry(entry, features: features)
            }
            return
        }
        
        let featuresToProcess = features ?? getEnabledFeatures()
        
        for entry in entries {
            for feature in featuresToProcess {
                await addProcessingTask(entryId: entry.id, feature: feature)
            }
        }
        
        await processQueuedTasks()
    }
    
    /// Get current processing status
    func getProcessingStatus() -> ProcessingStatus {
        return currentStatus
    }
    
    /// Update AI settings
    func updateAISettings(_ settings: AISettings) async throws {
        self.aiSettings = settings
        await saveAISettings()
    }
    
    /// Retry failed processing tasks
    func retryFailedProcessing() async throws {
        let failedTasks = processingQueue.filter {
            if case .failed = $0.status { return true }
            return false
        }
        
        for task in failedTasks {
            await retryTask(task)
        }
    }
    
    /// Clear completed and failed tasks
    func clearCompletedTasks() {
        processingQueue.removeAll { task in
            switch task.status {
            case .completed, .failed:
                return true
            default:
                return false
            }
        }
    }
    
    /// Clear processing errors
    func clearErrors() {
        processingErrors.removeAll()
    }
    
    // MARK: - Private Methods
    
    private func getEnabledFeatures() -> [AIFeature] {
        var features: [AIFeature] = []
        
        if aiSettings.isThemeDetectionEnabled {
            features.append(.themeDetection)
        }
        
        if aiSettings.isLinguisticAnalysisEnabled {
            features.append(.linguisticAnalysis)
        }
        
        return features
    }
    
    private func addProcessingTask(entryId: UUID, feature: AIFeature) async {
        // Check if a task with the same entryId and feature already exists and is not completed/failed
        let existingTask = processingQueue.first { task in
            let sameEntry = task.entryId == entryId
            let sameFeature = task.feature == feature
            let isPending = task.status == .pending
            let isProcessing = task.status == .processing
            let isRetrying = if case .retrying = task.status { true } else { false }
            let isActiveTask = isPending || isProcessing || isRetrying
            
            return sameEntry && sameFeature && isActiveTask
        }
        
        // If a duplicate task already exists, don't add another one
        if existingTask != nil {
            print("🔄 AIFeaturesService: Skipping duplicate task for entry \(entryId) and feature \(feature.displayName)")
            return
        }
        
        let task = ProcessingTask(
            entryId: entryId,
            feature: feature,
            status: .pending,
            createdAt: Date(),
            updatedAt: Date()
        )
        
        processingQueue.append(task)
        print("➕ AIFeaturesService: Added new task for entry \(entryId) and feature \(feature.displayName)")
    }
    
    private func processQueuedTasks() async {
        let pendingTasks = processingQueue.filter {
            if case .pending = $0.status { return true }
            return false
        }
        
        currentStatus = .processing(count: pendingTasks.count)
        
        // Process tasks with concurrency limit
        await withTaskGroup(of: Void.self) { group in
            var taskIterator = pendingTasks.makeIterator()
            var activeTasks = 0
            
            // Start initial batch of tasks
            while activeTasks < maxConcurrentTasks, let task = taskIterator.next() {
                group.addTask {
                    await self.processTask(task)
                }
                activeTasks += 1
            }
            
            // Continue processing as tasks complete
            for await _ in group {
                activeTasks -= 1
                
                if let nextTask = taskIterator.next() {
                    group.addTask {
                        await self.processTask(nextTask)
                    }
                    activeTasks += 1
                }
            }
        }
        
        updateProcessingStatus()
        
        // Clean up old completed tasks to prevent memory bloat
        await cleanupCompletedTasks()
    }
    
    /// Remove completed tasks older than 1 hour to prevent memory issues
    private func cleanupCompletedTasks() async {
        let oneHourAgo = Date().addingTimeInterval(-3600) // 1 hour ago
        
        let initialCount = processingQueue.count
        processingQueue.removeAll { task in
            // Remove completed or failed tasks that are older than 1 hour
            switch task.status {
            case .completed, .failed:
                return task.updatedAt < oneHourAgo
            default:
                return false
            }
        }
        
        let removedCount = initialCount - processingQueue.count
        if removedCount > 0 {
            print("🧹 AIFeaturesService: Cleaned up \(removedCount) old completed tasks")
        }
    }
    
    private func processTask(_ task: ProcessingTask) async {
        await updateTaskStatus(task.id, status: .processing)
        
        do {
            switch task.feature {
            case .themeDetection:
                _ = try await processThemeDetection(entryId: task.entryId)
            case .linguisticAnalysis:
                _ = try await processLinguisticAnalysis(entryId: task.entryId)
            }
            
            await updateTaskStatus(task.id, status: .completed)
            
        } catch {
            await handleTaskError(task, error: error)
        }
    }
    
    private func processThemeDetection(entryId: UUID) async throws -> [Theme] {
        print("🎨 AIFeaturesService: Starting theme detection for entry \(entryId)")
        
        // Get the entry from Core Data
        guard let entry = await coreDataManager.fetchEntry(by: entryId) else {
            throw AIError(
                feature: .themeDetection,
                entryId: entryId,
                message: "Entry not found",
                timestamp: Date(),
                retryCount: 0
            )
        }
        
        // Call theme service
        let themes = try await themeService.detectThemes(for: entry)
        
        // Update entry with detected themes
        await coreDataManager.updateEntryThemes(entryId: entryId, themes: themes)
        
        print("✅ AIFeaturesService: Theme detection completed for entry \(entryId), found \(themes.count) themes")
        return themes
    }
    
    private func processLinguisticAnalysis(entryId: UUID) async throws -> LinguisticMetrics {
        print("📊 AIFeaturesService: Starting linguistic analysis for entry \(entryId)")
        
        // Get the entry from Core Data
        guard let entry = await coreDataManager.fetchEntry(by: entryId) else {
            throw AIError(
                feature: .linguisticAnalysis,
                entryId: entryId,
                message: "Entry not found",
                timestamp: Date(),
                retryCount: 0
            )
        }
        
        // Call linguistic service
        let metrics = try await linguisticService.analyzeEntry(entry)
        
        // Update entry with linguistic metrics
        await coreDataManager.updateEntryLinguisticMetrics(entryId: entryId, metrics: metrics)
        
        print("✅ AIFeaturesService: Linguistic analysis completed for entry \(entryId)")
        return metrics
    }
    
    private func updateTaskStatus(_ taskId: UUID, status: ProcessingTask.TaskStatus) async {
        if let index = processingQueue.firstIndex(where: { $0.id == taskId }) {
            let updatedTask = ProcessingTask(
                entryId: processingQueue[index].entryId,
                feature: processingQueue[index].feature,
                status: status,
                createdAt: processingQueue[index].createdAt,
                updatedAt: Date()
            )
            processingQueue[index] = updatedTask
        }
    }
    
    private func handleTaskError(_ task: ProcessingTask, error: Error) async {
        let aiError = AIError(
            feature: task.feature,
            entryId: task.entryId,
            message: error.localizedDescription,
            timestamp: Date(),
            retryCount: 0
        )
        
        processingErrors.append(aiError)
        
        // Don't retry certain types of errors
        let shouldNotRetry = isNonRetryableError(error)
        
        // Check if we should retry
        if !shouldNotRetry && canRetryTask(task) {
            await retryTask(task)
        } else {
            await updateTaskStatus(task.id, status: .failed(error.localizedDescription))
            
            if shouldNotRetry {
                print("⚠️ AIFeaturesService: Not retrying non-retryable error for \(task.feature.displayName): \(error.localizedDescription)")
            } else {
                print("❌ AIFeaturesService: Max retries exceeded for \(task.feature.displayName)")
            }
        }
    }
    
    private func isNonRetryableError(_ error: Error) -> Bool {
        // Don't retry decoding errors, client errors (400-499), or specific API errors
        if let apiError = error as? APIError {
            switch apiError {
            case .decodingError:
                return true // Don't retry decoding errors - data format is wrong
            case .serverError(let code, _):
                return code >= 400 && code < 500 // Don't retry client errors
            case .unauthorized:
                return true // Don't retry auth errors
            default:
                return false
            }
        }
        
        // Don't retry if the error message contains decoding-related keywords
        let errorMessage = error.localizedDescription.lowercased()
        let decodingKeywords = ["decoding", "missing", "couldn't be read", "not in the correct format"]
        return decodingKeywords.contains { errorMessage.contains($0) }
    }
    
    private func canRetryTask(_ task: ProcessingTask) -> Bool {
        let retryCount: Int
        if case .retrying(let attempt) = task.status {
            retryCount = attempt
        } else {
            retryCount = 0
        }
        
        return retryCount < aiSettings.maxRetryAttempts
    }
    
    private func retryTask(_ task: ProcessingTask) async {
        let retryCount: Int
        if case .retrying(let attempt) = task.status {
            retryCount = attempt + 1
        } else {
            retryCount = 1
        }
        
        await updateTaskStatus(task.id, status: .retrying(attempt: retryCount))
        
        // Add delay before retry
        try? await Task.sleep(nanoseconds: UInt64(retryCount * 2) * 1_000_000_000) // Exponential backoff
        
        await processTask(task)
    }
    
    private func updateProcessingStatus() {
        let activeTasks = processingQueue.filter {
            switch $0.status {
            case .pending, .processing, .retrying:
                return true
            default:
                return false
            }
        }
        
        if activeTasks.isEmpty {
            currentStatus = .completed
        } else {
            currentStatus = .processing(count: activeTasks.count)
        }
    }
    
    private func setupStatusMonitoring() {
        // Monitor processing queue changes
        $processingQueue
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.updateProcessingStatus()
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Settings Persistence
    
    private func loadAISettings() {
        if let data = UserDefaults.standard.data(forKey: "AISettings"),
           let settings = try? JSONDecoder().decode(AISettings.self, from: data) {
            self.aiSettings = settings
        }
    }
    
    private func saveAISettings() async {
        if let data = try? JSONEncoder().encode(aiSettings) {
            UserDefaults.standard.set(data, forKey: "AISettings")
        }
    }
}

// MARK: - Extensions

extension AIFeaturesService {
    /// Convenience method to check if AI features are enabled
    var isAIEnabled: Bool {
        return aiSettings.isThemeDetectionEnabled || aiSettings.isLinguisticAnalysisEnabled
    }
    
    /// Get tasks for a specific entry
    func getTasksForEntry(_ entryId: UUID) -> [ProcessingTask] {
        return processingQueue.filter { $0.entryId == entryId }
    }
    
    /// Get errors for a specific entry
    func getErrorsForEntry(_ entryId: UUID) -> [AIError] {
        return processingErrors.filter { $0.entryId == entryId }
    }
} 