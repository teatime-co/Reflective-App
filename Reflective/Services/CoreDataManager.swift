import Foundation
import CoreData
import Combine

// MARK: - Core Data Manager
@MainActor
class CoreDataManager: ObservableObject {
    static let shared = CoreDataManager()
    
    private let container: NSPersistentContainer
    private let apiClient: APIClient
    
    @Published var isOfflineMode = false
    @Published var lastSyncDate: Date?
    
    private var cancellables = Set<AnyCancellable>()
    
    var viewContext: NSManagedObjectContext {
        container.viewContext
    }
    
    private init() {
        self.container = CoreDataStack.shared.container
        self.apiClient = APIClient.shared
        
        // Monitor network status
        setupNetworkMonitoring()
    }
    
    // MARK: - Network Monitoring
    private func setupNetworkMonitoring() {
        // This would integrate with NetworkMonitor when available
        // For now, assume online
        isOfflineMode = false
    }
    
    // MARK: - Core Data Operations
    
    func save() throws {
        guard viewContext.hasChanges else { return }
        try viewContext.save()
    }
    
    func delete(_ object: NSManagedObject) throws {
        viewContext.delete(object)
        try save()
    }
    
    // Clean up any invalid entities that might cause validation errors
    private func cleanupInvalidEntities() {
        print("🧹 Cleaning up invalid entities...")
        
        // Find and delete tags with missing required fields
        let tagRequest: NSFetchRequest<CDTag> = CDTag.fetchRequest()
        tagRequest.predicate = NSPredicate(format: "name == nil OR userID == nil OR user == nil")
        
        if let invalidTags = try? viewContext.fetch(tagRequest) {
            for invalidTag in invalidTags {
                print("🗑️ Deleting invalid tag: \(invalidTag.id?.uuidString ?? "unknown")")
                viewContext.delete(invalidTag)
            }
        }
        
        // Find and delete logs with missing required fields  
        let logRequest: NSFetchRequest<CDLog> = CDLog.fetchRequest()
        logRequest.predicate = NSPredicate(format: "userID == nil OR user == nil")
        
        if let invalidLogs = try? viewContext.fetch(logRequest) {
            for invalidLog in invalidLogs {
                print("🗑️ Deleting invalid log: \(invalidLog.id?.uuidString ?? "unknown")")
                viewContext.delete(invalidLog)
            }
        }
        
        // Save the cleanup
        if viewContext.hasChanges {
            try? viewContext.save()
            print("✅ Cleanup completed")
        }
    }
    
    // MARK: - User Management
    
    func createOrUpdateUser(_ user: User) throws -> CDUser {
        print("👤 Starting createOrUpdateUser for: \(user.email)")
        
        let request: NSFetchRequest<CDUser> = CDUser.fetchRequest()
        request.predicate = NSPredicate(format: "id == %@", user.id as CVarArg)
        
        let cdUser: CDUser
        if let existingUser = try viewContext.fetch(request).first {
            cdUser = existingUser
            print("👤 Found existing user: \(user.email)")
        } else {
            cdUser = CDUser(context: viewContext)
            cdUser.id = user.id
            cdUser.createdAt = user.createdAt
            print("👤 Creating new user: \(user.email)")
        }
        
        // Update attributes
        cdUser.email = user.email
        cdUser.displayName = user.displayName
        cdUser.timezone = user.timezone
        cdUser.locale = user.locale
        cdUser.dailyWordGoal = Int32(user.dailyWordGoal)
        cdUser.writingReminderTime = user.writingReminderTime
        cdUser.aiFeaturesEnabled = user.aiFeaturesEnabled
        cdUser.updatedAt = user.updatedAt
        cdUser.isOfflineMode = isOfflineMode
        
        // Encode theme preferences as JSON
        if let preferences = user.themePreferences {
            cdUser.themePreferences = try? JSONEncoder().encode(preferences)
        }
        
        print("👤 Saving user: \(user.email)")
        try save()
        print("✅ Successfully saved user: \(user.email)")
        return cdUser
    }
    
    func fetchUser(id: UUID) -> CDUser? {
        let request: NSFetchRequest<CDUser> = CDUser.fetchRequest()
        request.predicate = NSPredicate(format: "id == %@", id as CVarArg)
        return try? viewContext.fetch(request).first
    }
    
    // Ensure the current user exists in Core Data (for development/offline mode)
    private func ensureCurrentUserExists() -> CDUser? {
        print("🔍 ensureCurrentUserExists: Starting...")
        
        // Clean up any invalid entities first
        cleanupInvalidEntities()
        
        // Try to get user ID from Keychain
        guard let userIDString = Keychain.shared.getUserID() else {
            print("❌ No user ID in Keychain, creating fallback user")
            return createFallbackUser()
        }
        
        guard let userID = UUID(uuidString: userIDString) else {
            print("❌ Invalid user ID format in Keychain: \(userIDString)")
            return createFallbackUser()
        }
        
        print("✅ Found user ID in Keychain: \(userID)")
        
        // Try to fetch existing user
        if let existingUser = fetchUser(id: userID) {
            print("✅ Found existing user in Core Data")
            return existingUser
        }
        
        print("⚠️ User not found in Core Data, creating from Keychain info...")
        
        // Create user from Keychain info
        do {
            let now = Date()
            let fallbackUser = User(
                id: userID,
                email: Keychain.shared.getUserEmail() ?? "user@example.com",
                displayName: "User",
                timezone: "UTC",
                locale: "en_US",
                dailyWordGoal: 500,
                writingReminderTime: nil,
                themePreferences: nil,
                aiFeaturesEnabled: true,
                createdAt: now,
                updatedAt: now
            )
            let cdUser = try createOrUpdateUser(fallbackUser)
            print("✅ Created user from Keychain info")
            return cdUser
        } catch {
            print("❌ Failed to create user from Keychain: \(error)")
            return createFallbackUser()
        }
    }
    
    // Create a completely fallback user when no Keychain info exists
    private func createFallbackUser() -> CDUser? {
        print("🆘 Creating fallback user with generated ID...")
        
        do {
            let fallbackUserID = UUID()
            let now = Date()
            let fallbackUser = User(
                id: fallbackUserID,
                email: "fallback@example.com",
                displayName: "Fallback User",
                timezone: "UTC",
                locale: "en_US",
                dailyWordGoal: 500,
                writingReminderTime: nil,
                themePreferences: nil,
                aiFeaturesEnabled: true,
                createdAt: now,
                updatedAt: now
            )
            
            // Save fallback user ID to Keychain for future use
            _ = Keychain.shared.saveUserInfo(
                userID: fallbackUserID.uuidString,
                email: "fallback@example.com"
            )
            
            let cdUser = try createOrUpdateUser(fallbackUser)
            print("✅ Created fallback user with ID: \(fallbackUserID)")
            return cdUser
        } catch {
            print("💥 Failed to create fallback user: \(error)")
            return nil
        }
    }
    
    // MARK: - Journal Entry Management
    
    func createOrUpdateJournalEntry(_ entry: JournalEntry) throws -> CDLog {
        // FIRST: Ensure user exists before creating any journal entry
        guard let cdUser = ensureCurrentUserExists() else {
            throw NSError(domain: "CoreDataManager", code: 1002, userInfo: [
                NSLocalizedDescriptionKey: "Could not create or find user for journal entry relationship"
            ])
        }
        
        let request: NSFetchRequest<CDLog> = CDLog.fetchRequest()
        request.predicate = NSPredicate(format: "id == %@", entry.id as CVarArg)
        
        let cdLog: CDLog
        if let existingLog = try viewContext.fetch(request).first {
            cdLog = existingLog
        } else {
            cdLog = CDLog(context: viewContext)
            cdLog.id = entry.id
            cdLog.createdAt = entry.createdAt
        }
        
        // Update attributes
        cdLog.userID = entry.userID
        
        // Set user relationship (user is guaranteed to exist at this point)
        cdLog.user = cdUser
        
        cdLog.sessionID = entry.sessionID
        cdLog.promptID = entry.promptID
        cdLog.weaviateID = entry.weaviateID
        cdLog.content = entry.content
        cdLog.moodScore = entry.moodScore ?? 0.0
        cdLog.completionStatus = entry.completionStatus.rawValue
        cdLog.targetWordCount = Int32(entry.targetWordCount)
        cdLog.writingDuration = Int32(entry.writingDuration ?? 0)
        cdLog.wordCount = Int32(entry.wordCount ?? 0)
        cdLog.processingStatus = entry.processingStatus?.rawValue
        cdLog.updatedAt = entry.updatedAt
        cdLog.needsSync = !isOfflineMode // Mark for sync if online
        
        // Handle tags relationship
        if !entry.tags.isEmpty {
            let tagSet = NSMutableSet()
            for tag in entry.tags {
                let cdTag = try createOrUpdateTag(tag)
                tagSet.add(cdTag)
            }
            cdLog.tags = tagSet
        }
        
        try save()
        return cdLog
    }
    
    func fetchJournalEntries(
        userID: UUID? = nil,
        status: CompletionStatus? = nil,
        limit: Int? = nil,
        offset: Int = 0
    ) -> [CDLog] {
        let request: NSFetchRequest<CDLog> = CDLog.fetchRequest()
        
        var predicates: [NSPredicate] = []
        
        if let userID = userID {
            predicates.append(NSPredicate(format: "userID == %@", userID as CVarArg))
        }
        
        if let status = status {
            predicates.append(NSPredicate(format: "completionStatus == %@", status.rawValue))
        }
        
        if !predicates.isEmpty {
            request.predicate = NSCompoundPredicate(andPredicateWithSubpredicates: predicates)
        }
        
        // Sort by creation date (newest first)
        request.sortDescriptors = [NSSortDescriptor(keyPath: \CDLog.createdAt, ascending: false)]
        
        if let limit = limit {
            request.fetchLimit = limit
        }
        request.fetchOffset = offset
        
        return (try? viewContext.fetch(request)) ?? []
    }
    
    func deleteJournalEntry(_ cdLog: CDLog) throws {
        cdLog.needsSync = true // Mark for deletion sync
        try delete(cdLog)
    }
    
    // MARK: - Tag Management
    
    func createOrUpdateTag(_ tag: Tag) throws -> CDTag {
        print("🏷️ Starting createOrUpdateTag for: \(tag.name)")
        
        let request: NSFetchRequest<CDTag> = CDTag.fetchRequest()
        request.predicate = NSPredicate(format: "id == %@", tag.id as CVarArg)
        
        let cdTag: CDTag
        if let existingTag = try viewContext.fetch(request).first {
            cdTag = existingTag
            print("🏷️ Found existing tag: \(tag.name)")
        } else {
            print("🏷️ Need to create new tag: \(tag.name)")
            
            // FIRST: Ensure user exists before creating any tag
            guard let cdUser = ensureCurrentUserExists() else {
                print("❌ Failed to get user for tag relationship")
                throw NSError(domain: "CoreDataManager", code: 1001, userInfo: [
                    NSLocalizedDescriptionKey: "Could not create or find user for tag relationship"
                ])
            }
            
            print("✅ User exists, now creating tag...")
            
            // NOW: Create the tag with all required relationships
            cdTag = CDTag(context: viewContext)
            cdTag.id = tag.id
            cdTag.createdAt = tag.createdAt
            cdTag.userID = cdUser.id
            cdTag.user = cdUser
            
            print("✅ Set user relationship for tag: \(cdUser.id?.uuidString ?? "nil")")
        }
        
        // Update attributes
        cdTag.name = tag.name
        cdTag.color = tag.color
        cdTag.lastUsedAt = tag.lastUsedAt
        cdTag.updatedAt = Date()
        cdTag.needsSync = !isOfflineMode
        
        print("🏷️ Saving tag: \(tag.name) with user: \(cdTag.userID?.uuidString ?? "nil")")
        
        try save()
        print("✅ Successfully saved tag: \(tag.name)")
        return cdTag
    }
    
    func fetchTags(userID: UUID? = nil) -> [CDTag] {
        let request: NSFetchRequest<CDTag> = CDTag.fetchRequest()
        
        if let userID = userID {
            request.predicate = NSPredicate(format: "userID == %@", userID as CVarArg)
        }
        
        request.sortDescriptors = [NSSortDescriptor(keyPath: \CDTag.name, ascending: true)]
        
        return (try? viewContext.fetch(request)) ?? []
    }
    
    func deleteTag(_ cdTag: CDTag) throws {
        cdTag.needsSync = true // Mark for deletion sync
        try delete(cdTag)
    }
    
    // MARK: - Sync Operations
    
    func syncWithServer() async throws {
        guard !isOfflineMode else {
            print("📴 CoreDataManager: Skipping sync - offline mode")
            return
        }
        
        print("🔄 CoreDataManager: Starting sync with server...")
        
        // Sync pending changes to server
        try await syncPendingChanges()
        
        // Fetch latest data from server
        try await fetchLatestData()
        
        lastSyncDate = Date()
        print("✅ CoreDataManager: Sync completed successfully")
    }
    
    private func syncPendingChanges() async throws {
        // Sync journal entries that need sync
        let userID = getCurrentUserID()
        let pendingLogs = fetchJournalEntries(userID: userID).filter { $0.needsSync }
        for cdLog in pendingLogs {
            // Convert to JournalEntry and sync
            let entry = cdLog.toJournalEntry()
            // This would integrate with JournalService to sync
            cdLog.needsSync = false
        }
        
        // Sync tags that need sync
        let pendingTags = fetchTags(userID: userID).filter { $0.needsSync }
        for cdTag in pendingTags {
            // Convert to Tag and sync
            let tag = cdTag.toTag()
            // This would integrate with TagService to sync
            cdTag.needsSync = false
        }
        
        try save()
    }
    
    private func fetchLatestData() async throws {
        // This would fetch latest data from server and update local storage
        // Will be implemented when integrating with existing services
    }
    
    // MARK: - Search Operations
    
    func searchEntries(query: String, userID: UUID? = nil) -> [CDLog] {
        let request: NSFetchRequest<CDLog> = CDLog.fetchRequest()
        
        var predicates: [NSPredicate] = []
        
        if let userID = userID {
            predicates.append(NSPredicate(format: "userID == %@", userID as CVarArg))
        }
        
        // Search in content
        predicates.append(NSPredicate(format: "content CONTAINS[cd] %@", query))
        
        request.predicate = NSCompoundPredicate(andPredicateWithSubpredicates: predicates)
        request.sortDescriptors = [NSSortDescriptor(keyPath: \CDLog.createdAt, ascending: false)]
        
        return (try? viewContext.fetch(request)) ?? []
    }
    
    // MARK: - Helper Methods
    
    private func getCurrentUserID() -> UUID {
        // Get the current user ID from Keychain
        if let userIDString = Keychain.shared.getUserID(),
           let userID = UUID(uuidString: userIDString) {
            return userID
        }
        
        // Fallback for development/testing
        return UUID(uuidString: "00000000-0000-0000-0000-000000000000") ?? UUID()
    }
}

// MARK: - Core Data Extensions

extension CDLog {
    func toJournalEntry() -> JournalEntry {
        let tagArray = (tags?.allObjects as? [CDTag])?.map { $0.toTag() } ?? []
        
        return JournalEntry(
            id: id ?? UUID(),
            userID: userID ?? UUID(),
            content: content ?? "",
            moodScore: moodScore == 0 ? nil : moodScore,
            completionStatus: CompletionStatus(rawValue: completionStatus ?? "draft") ?? .draft,
            targetWordCount: Int(targetWordCount),
            writingDuration: writingDuration == 0 ? nil : Int(writingDuration),
            sessionID: sessionID,
            promptID: promptID,
            tags: tagArray,
            themes: [], // Will be populated when Theme entities are added
            createdAt: createdAt ?? Date(),
            updatedAt: updatedAt ?? Date()
        )
    }
}

extension CDTag {
    func toTag() -> Tag {
        return Tag(
            id: id ?? UUID(),
            name: name ?? "",
            color: color,
            createdAt: createdAt ?? Date(),
            lastUsedAt: lastUsedAt
        )
    }
}

extension CDUser {
    func toUser() -> User {
        var themePrefs: ThemePreferences? = nil
        if let data = themePreferences {
            themePrefs = try? JSONDecoder().decode(ThemePreferences.self, from: data)
        }
        
        return User(
            id: id ?? UUID(),
            email: email ?? "",
            displayName: displayName,
            timezone: timezone ?? "UTC",
            locale: locale ?? "en_US",
            dailyWordGoal: Int(dailyWordGoal),
            writingReminderTime: writingReminderTime,
            themePreferences: themePrefs,
            aiFeaturesEnabled: aiFeaturesEnabled,
            createdAt: createdAt ?? Date(),
            updatedAt: updatedAt ?? Date()
        )
    }
} 