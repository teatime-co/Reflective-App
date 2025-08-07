//
//  JournalService.swift
//  Reflective (macOS)
//
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation
import Combine

// MARK: - Journal Service
@MainActor
class JournalService: ObservableObject {
    static let shared = JournalService()
    
    @Published var entries: [JournalEntry] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var lastSyncDate: Date?
    
    private let apiClient: APIClient
    private let coreDataManager: CoreDataManager
    private var cancellables = Set<AnyCancellable>()
    
    init(apiClient: APIClient, coreDataManager: CoreDataManager) {
        self.apiClient = apiClient
        self.coreDataManager = coreDataManager
        
        // Load local data on initialization
        loadLocalEntries()
        
        // Subscribe to Core Data manager updates
        setupBindings()
    }
    
    convenience init() {
        self.init(apiClient: APIClient.shared, coreDataManager: CoreDataManager.shared)
    }
    
    // MARK: - Setup
    
    private func setupBindings() {
        coreDataManager.$lastSyncDate
            .sink { [weak self] syncDate in
                self?.lastSyncDate = syncDate
            }
            .store(in: &cancellables)
    }
    
    private func loadLocalEntries() {
        let cdLogs = coreDataManager.fetchJournalEntries()
        entries = cdLogs.map { $0.toJournalEntry() }
        
        // Update TagService with current entries
        TagService.shared.refreshFromEntries(entries)
    }
    
    // MARK: - Entry Management
    
    /// Create a new journal entry (offline-first)
    func createEntry(
        content: String,
        tags: [String] = [],
        moodScore: Float? = nil,
        targetWordCount: Int = 750,
        sessionID: UUID? = nil,
        promptID: UUID? = nil
    ) async throws -> JournalEntry {
        isLoading = true
        errorMessage = nil
        
        do {
            // Create entry locally first
            let newEntry = JournalEntry(
                userID: getCurrentUserID(),
                content: content,
                moodScore: moodScore,
                targetWordCount: targetWordCount,
                writingDuration: nil,
                sessionID: sessionID,
                promptID: promptID,
                tags: await processTagsFromStrings(tags)
            )
            
            // Save to Core Data
            let cdLog = try coreDataManager.createOrUpdateJournalEntry(newEntry)
            let savedEntry = cdLog.toJournalEntry()
            
            // Update local collection
            entries.insert(savedEntry, at: 0)
            
            // Update TagService with current entries (this automatically handles tag cleanup)
            TagService.shared.refreshFromEntries(entries)
            
            // Sync to server in background if online
            if !coreDataManager.isOfflineMode {
                Task {
                    await syncEntryToServer(savedEntry)
                }
            }
            
            isLoading = false
            return savedEntry
            
        } catch {
            isLoading = false
            errorMessage = "Failed to create entry: \(error.localizedDescription)"
            throw error
        }
    }
    
    /// Update an existing journal entry (offline-first)
    func updateEntry(
        _ entry: JournalEntry,
        content: String,
        tags: [String] = [],
        moodScore: Float? = nil,
        targetWordCount: Int = 750
    ) async throws -> JournalEntry {
        isLoading = true
        errorMessage = nil
        
        do {
            // Update entry
            var updatedEntry = entry
            updatedEntry.content = content
            updatedEntry.moodScore = moodScore
            updatedEntry.targetWordCount = targetWordCount
            updatedEntry.tags = await processTagsFromStrings(tags)
            updatedEntry.updatedAt = Date()
            updatedEntry.wordCount = content.split(separator: " ").count
            
            // Save to Core Data
            let cdLog = try coreDataManager.createOrUpdateJournalEntry(updatedEntry)
            let savedEntry = cdLog.toJournalEntry()
            
            // Update local collection
            if let index = entries.firstIndex(where: { $0.id == savedEntry.id }) {
                entries[index] = savedEntry
            }
            
            // Update TagService with current entries (this automatically handles tag cleanup)
            TagService.shared.refreshFromEntries(entries)
            
            // Sync to server in background if online
            if !coreDataManager.isOfflineMode {
                Task {
                    await syncEntryToServer(savedEntry)
                }
            }
            
            isLoading = false
            return savedEntry
            
        } catch {
            isLoading = false
            errorMessage = "Failed to update entry: \(error.localizedDescription)"
            throw error
        }
    }
    
    /// Delete an entry (offline-first)
    func deleteEntry(_ entry: JournalEntry) async throws {
        isLoading = true
        errorMessage = nil
        
        do {
            // Find and delete from Core Data
            let cdLogs = coreDataManager.fetchJournalEntries()
            if let cdLog = cdLogs.first(where: { $0.id == entry.id }) {
                try coreDataManager.deleteJournalEntry(cdLog)
            }
            
            // Remove from local collection
            entries.removeAll { $0.id == entry.id }
            
            // Update TagService with current entries (this automatically handles tag cleanup)
            TagService.shared.refreshFromEntries(entries)
            
            // Sync deletion to server if online
            if !coreDataManager.isOfflineMode {
                Task {
                    await deleteEntryFromServer(entry.id)
                }
            }
            
            isLoading = false
            
        } catch {
            isLoading = false
            errorMessage = "Failed to delete entry: \(error.localizedDescription)"
            throw error
        }
    }
    
    // MARK: - Data Loading
    
    /// Fetch all entries with optional filtering (Core Data + API sync)
    func fetchEntries(
        status: CompletionStatus? = nil,
        limit: Int? = nil,
        offset: Int = 0
    ) async throws {
        isLoading = true
        errorMessage = nil
        
        do {
            // Load from Core Data first (instant UI update)
            let userID = getCurrentUserID()
            let cdLogs = coreDataManager.fetchJournalEntries(
                userID: userID,
                status: status,
                limit: limit,
                offset: offset
            )
            
            let localEntries = cdLogs.map { $0.toJournalEntry() }
            
            if offset == 0 {
                entries = localEntries
            } else {
                entries.append(contentsOf: localEntries)
            }
            
            // Update TagService with current entries (this automatically handles tag cleanup)
            TagService.shared.refreshFromEntries(entries)
            
            // Sync with server in background if online
            if !coreDataManager.isOfflineMode {
                Task {
                    await syncEntriesFromServer(status: status, limit: limit, offset: offset)
                }
            }
            
            isLoading = false
            
        } catch {
            isLoading = false
            errorMessage = "Failed to fetch entries: \(error.localizedDescription)"
            throw error
        }
    }
    
    /// Get a specific entry by ID
    func getEntry(id: UUID) async throws -> JournalEntry {
        // Check Core Data first
        let cdLogs = coreDataManager.fetchJournalEntries()
        if let cdLog = cdLogs.first(where: { $0.id == id }) {
            return cdLog.toJournalEntry()
        }
        
        // If not found locally and online, try server
        if !coreDataManager.isOfflineMode {
            do {
                let response: LogResponse = try await apiClient.get(endpoint: "logs/\(id)").async()
                let entry = response.toJournalEntry()
                
                // Save to Core Data for offline access
                _ = try coreDataManager.createOrUpdateJournalEntry(entry)
                
                return entry
            } catch APIError.unauthorized {
                print("❌ [macOS] Authentication failed when fetching entry \(id) - user needs to login")
                throw APIError.unauthorized
            }
        }
        
        throw APIError.serverError(404, "Entry not found")
    }
    
    // MARK: - Status Management
    
    func archiveEntry(_ entry: JournalEntry) async throws {
        var updatedEntry = entry
        updatedEntry.completionStatus = .archived
        updatedEntry.updatedAt = Date()
        
        _ = try await updateEntryStatus(updatedEntry)
    }
    
    func completeEntry(_ entry: JournalEntry) async throws {
        var updatedEntry = entry
        updatedEntry.completionStatus = .complete
        updatedEntry.updatedAt = Date()
        
        _ = try await updateEntryStatus(updatedEntry)
    }
    
    func draftEntry(_ entry: JournalEntry) async throws {
        var updatedEntry = entry
        updatedEntry.completionStatus = .draft
        updatedEntry.updatedAt = Date()
        
        _ = try await updateEntryStatus(updatedEntry)
    }
    
    private func updateEntryStatus(_ entry: JournalEntry) async throws -> JournalEntry {
        // Update in Core Data
        let cdLog = try coreDataManager.createOrUpdateJournalEntry(entry)
        let savedEntry = cdLog.toJournalEntry()
        
        // Update local collection
        if let index = entries.firstIndex(where: { $0.id == savedEntry.id }) {
            entries[index] = savedEntry
        }
        
        // Update TagService with current entries (this automatically handles tag cleanup)
        TagService.shared.refreshFromEntries(entries)
        
        // Sync to server if online
        if !coreDataManager.isOfflineMode {
            Task {
                await syncEntryToServer(savedEntry)
            }
        }
        
        return savedEntry
    }
    
    // MARK: - Filtering and Search
    
    func entriesByStatus(_ status: CompletionStatus) -> [JournalEntry] {
        return entries.filter { $0.completionStatus == status }
    }
    
    func entriesByTag(_ tag: Tag) -> [JournalEntry] {
        return entries.filter { entry in
            entry.tags.contains { $0.id == tag.id }
        }
    }
    
    func searchEntries(_ query: String) -> [JournalEntry] {
        if query.isEmpty {
            return entries
        }
        
        // Search in Core Data for better performance
        let userID = getCurrentUserID()
        let cdLogs = coreDataManager.searchEntries(query: query, userID: userID)
        let searchResults = cdLogs.map { $0.toJournalEntry() }
        
        return searchResults
    }
    
    func entriesInDateRange(from startDate: Date, to endDate: Date) -> [JournalEntry] {
        return entries.filter { entry in
            entry.createdAt >= startDate && entry.createdAt <= endDate
        }
    }
    
    // MARK: - Auto-save
    
    var recentEntries: [JournalEntry] {
        let calendar = Calendar.current
        let sevenDaysAgo = calendar.date(byAdding: .day, value: -7, to: Date()) ?? Date()
        return entriesInDateRange(from: sevenDaysAgo, to: Date())
    }
    
    // Auto-save functionality
    private var autoSaveTimer: Timer?
    private var pendingEntryUpdates: [UUID: JournalEntry] = [:]
    
    func startAutoSave(for entry: JournalEntry) {
        pendingEntryUpdates[entry.id] = entry
        
        // Cancel existing timer
        autoSaveTimer?.invalidate()
        
        // Start new timer for 3 seconds
        autoSaveTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: false) { [weak self] _ in
            Task { @MainActor in
                await self?.performAutoSave()
            }
        }
    }
    
    private func performAutoSave() async {
        for (_, entry) in pendingEntryUpdates {
            do {
                // Save to Core Data only (no API call for auto-save)
                _ = try coreDataManager.createOrUpdateJournalEntry(entry)
                
                // Update local collection
                if let index = entries.firstIndex(where: { $0.id == entry.id }) {
                    entries[index] = entry
                }
                
            } catch {
                print("Auto-save failed for entry \(entry.id): \(error)")
            }
        }
        
        pendingEntryUpdates.removeAll()
    }
    
    func stopAutoSave() {
        autoSaveTimer?.invalidate()
        autoSaveTimer = nil
        pendingEntryUpdates.removeAll()
    }
    
    /// Test method to debug authentication and API connectivity (macOS)
    func testAuthentication() async {
        print("🧪 [macOS] Testing Authentication Flow:")
        debugAuthenticationStatus()
        
        // Test if we can reach the server
        print("\n🌐 Testing API connectivity...")
        do {
            // Try a simple endpoint that doesn't require auth
            let _: [String: String] = try await apiClient.get(
                endpoint: "health", 
                requiresAuth: false
            ).async()
            print("✅ Server is reachable")
        } catch {
            print("❌ Server connectivity failed: \(error)")
            print("   Make sure the Python server is running on localhost:8000")
        }
        
        // Test token validation
        print("\n🔑 Testing token validation...")
        do {
            let validToken = try await AuthManager.shared.ensureValidToken()
            print("✅ [macOS] Token is valid and ready for use")
            print("   Token preview: \(String(validToken.prefix(20)))...")
        } catch APIError.unauthorized {
            print("❌ [macOS] No valid token available - user needs to login")
            return // Skip further tests if not authenticated
        } catch {
            print("❌ [macOS] Token validation failed: \(error)")
            return
        }
        
        // Test if we can fetch logs (requires auth)
        print("\n📋 Testing authenticated logs endpoint...")
        do {
            let response: [LogResponse] = try await apiClient.get(endpoint: "logs").async()
            print("✅ [macOS] Successfully fetched \(response.count) logs")
        } catch {
            print("❌ [macOS] Failed to fetch logs: \(error)")
            if let apiError = error as? APIError {
                switch apiError {
                case .unauthorized:
                    print("   → Token became invalid during request")
                case .serverError(let code, let message):
                    print("   → Server error \(code): \(message ?? "Unknown")")
                case .networkError(let urlError):
                    print("   → Network error: \(urlError.localizedDescription)")
                default:
                    print("   → Error type: \(apiError)")
                }
            }
        }
    }
    
    // MARK: - Debug Methods
    
    /// Debug method to check authentication status (macOS)
    func debugAuthenticationStatus() {
        print("🔍 [macOS] Authentication Debug:")
        print("   - AuthManager.shared.isAuthenticated: \(AuthManager.shared.isAuthenticated)")
        print("   - CoreDataManager.isOfflineMode: \(coreDataManager.isOfflineMode)")
        
        if let token = Keychain.shared.getAccessToken() {
            print("   - Access token exists: ✅ (length: \(token.count))")
            print("   - Token preview: \(String(token.prefix(20)))...")
        } else {
            print("   - Access token exists: ❌")
        }
        
        if let userID = Keychain.shared.getUserID() {
            print("   - User ID: \(userID)")
        } else {
            print("   - User ID: ❌ Not found")
        }
        
        if let email = Keychain.shared.getUserEmail() {
            print("   - User email: \(email)")
        } else {
            print("   - User email: ❌ Not found")
        }
        
        if let currentToken = AuthManager.shared.currentToken {
            print("   - JWT Token valid: \(!currentToken.isExpired)")
            print("   - JWT Token expires soon: \(currentToken.isExpiringSoon)")
        } else {
            print("   - JWT Token: ❌ Not available")
        }
        
        // macOS-specific: Check if app has keychain access
        let testKey = "test_key_\(UUID().uuidString)"
        let testValue = "test_value"
        if Keychain.shared.save(testValue, for: testKey) {
            _ = Keychain.shared.delete(key: testKey) // cleanup
            print("   - macOS Keychain access: ✅")
        } else {
            print("   - macOS Keychain access: ❌ (May need entitlements)")
        }
    }
    
    // MARK: - Sync Operations
    
    func syncWithServer() async throws {
        try await coreDataManager.syncWithServer()
        
        // Reload local entries after sync
        loadLocalEntries()
    }
    
    // MARK: - Private Methods
    
    private func getCurrentUserID() -> UUID {
        // Get the current user ID from Keychain
        if let userIDString = Keychain.shared.getUserID(),
           let userID = UUID(uuidString: userIDString) {
            return userID
        }
        
        // Fallback for development/testing
        return UUID(uuidString: "00000000-0000-0000-0000-000000000000") ?? UUID()
    }
    
    private func processTagsFromStrings(_ tagNames: [String]) async -> [Tag] {
        var processedTags: [Tag] = []
        
        for tagName in tagNames {
            // Check if tag exists locally
            let userID = getCurrentUserID()
            let existingTags = coreDataManager.fetchTags(userID: userID)
            if let existingTag = existingTags.first(where: { $0.name?.lowercased() == tagName.lowercased() }) {
                processedTags.append(existingTag.toTag())
            } else {
                // Create new tag
                let newTag = Tag(name: tagName)
                do {
                    _ = try coreDataManager.createOrUpdateTag(newTag)
                    processedTags.append(newTag)
                } catch {
                    print("Failed to create tag '\(tagName)': \(error)")
                }
            }
        }
        
        return processedTags
    }
    
    // MARK: - Server Sync Methods
    
    private func syncEntryToServer(_ entry: JournalEntry) async {
        do {
            let request = LogCreateRequest(
                id: entry.id,
                content: entry.content,
                tags: entry.tags.map { $0.name },
                moodScore: entry.moodScore,
                completionStatus: entry.completionStatus.rawValue,
                targetWordCount: entry.targetWordCount,
                writingDuration: entry.writingDuration,
                sessionID: entry.sessionID,
                promptID: entry.promptID
            )
            
            let _: LogResponse = try await apiClient.post(endpoint: "logs/", body: request).async()
            print("✅ [macOS] Synced entry \(entry.id) to server")
            
        } catch APIError.unauthorized {
            print("❌ [macOS] Authentication failed when syncing entry \(entry.id) - user needs to login")
        } catch {
            print("❌ [macOS] Failed to sync entry \(entry.id) to server: \(error)")
        }
    }
    
    private func syncEntriesFromServer(status: CompletionStatus?, limit: Int?, offset: Int) async {
        do {
            let response: [LogResponse] = try await apiClient.get(endpoint: "logs").async()
            let serverEntries = response.map { $0.toJournalEntry() }
            
            // Update Core Data with server entries
            for entry in serverEntries {
                _ = try? coreDataManager.createOrUpdateJournalEntry(entry)
            }
            
            // Reload local entries
            loadLocalEntries()
            
        } catch APIError.unauthorized {
            print("❌ [macOS] Authentication failed when syncing entries - user needs to login")
            // You might want to notify the user they need to login again
        } catch APIError.decodingError(let decodingError) {
            print("❌ [macOS] Failed to decode server response when syncing entries:")
            print("   Decoding error: \(decodingError)")
            print("   This usually means the server returned an error response instead of the expected data")
        } catch {
            print("❌ [macOS] Failed to sync entries from server: \(error)")
        }
    }
    
    private func deleteEntryFromServer(_ entryID: UUID) async {
        do {
            let _: EmptyResponse = try await apiClient.delete(endpoint: "logs/\(entryID)").async()
            print("✅ Deleted entry \(entryID) from server")
            
        } catch {
            print("❌ Failed to delete entry \(entryID) from server: \(error)")
        }
    }
}

// MARK: - Log Update Request
struct LogUpdateRequest: Codable {
    let content: String
    let moodScore: Float?
    let completionStatus: String
    let targetWordCount: Int
    
    enum CodingKeys: String, CodingKey {
        case content
        case moodScore = "mood_score"
        case completionStatus = "completion_status"
        case targetWordCount = "target_word_count"
    }
}

// MARK: - LogResponse to JournalEntry Conversion
extension LogResponse {
    func toJournalEntry() -> JournalEntry {
        return JournalEntry(
            id: id,
            userID: userID,
            content: content,
            moodScore: moodScore,
            completionStatus: CompletionStatus(rawValue: completionStatus) ?? .draft,
            targetWordCount: targetWordCount,
            writingDuration: writingDuration,
            sessionID: nil, // Not included in LogResponse
            promptID: nil,  // Not included in LogResponse
            tags: tags,
            themes: themes,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}

// MARK: - Service Error Types
enum JournalServiceError: LocalizedError {
    case networkError(String)
    case decodingError(String)
    case unknownError
    
    var errorDescription: String? {
        switch self {
        case .networkError(let message):
            return "Network error: \(message)"
        case .decodingError(let message):
            return "Data parsing error: \(message)"
        case .unknownError:
            return "An unknown error occurred"
        }
    }
} 