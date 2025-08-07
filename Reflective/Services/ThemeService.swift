//
//  ThemeService.swift
//  Reflective
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation
import Combine
import SwiftUI

// MARK: - Simple Theme Service for Phase 4B
@MainActor
class ThemeService: ObservableObject {
    
    // MARK: - Singleton
    static let shared = ThemeService()
    
    // MARK: - Published Properties
    @Published var detectedThemes: [Theme] = []
    @Published var isProcessing = false
    
    // MARK: - Dependencies
    private let apiClient: APIClient
    private let coreDataManager: CoreDataManager
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Private Endpoints
    private let baseThemes = "/api/themes"
    
    private func detectThemesEndpoint(for entryId: UUID) -> String {
        return "\(baseThemes)/detect/\(entryId)"
    }
    
    // MARK: - Initialization
    private init(
        apiClient: APIClient = APIClient.shared,
        coreDataManager: CoreDataManager? = nil
    ) {
        self.apiClient = apiClient
        self.coreDataManager = coreDataManager ?? CoreDataManager.shared
        
        loadCachedThemes()
    }
    
    // MARK: - Public Methods
    
    /// Detect themes for a journal entry using AI
    func detectThemes(for entry: JournalEntry) async throws -> [Theme] {
        isProcessing = true
        defer { isProcessing = false }
        
        do {
            print("🎨 ThemeService: Starting theme detection for entry \(entry.id)")
            
            // Use the detect themes for entry endpoint - returns [ThemeMatch]
            let themeMatches: [ThemeMatch] = try await apiClient.request(
                endpoint: detectThemesEndpoint(for: entry.id),
                method: .POST
            )
            
            print("✅ ThemeService: Successfully decoded \(themeMatches.count) theme matches")
            
            // Extract themes from matches and update confidence scores
            let themes = themeMatches.map { match in
                var theme = match.theme
                print("🎨 ThemeService: Theme '\(theme.name)' - original confidence: \(theme.confidenceScore), match confidence: \(match.confidence_score)")
                theme.confidenceScore = match.confidence_score
                return theme
            }
            
            print("✅ ThemeService: Processed \(themes.count) themes with updated confidence scores")
            
            // Cache detected themes
            await cacheDetectedThemes(themes, for: entry.id)
            
            print("✅ ThemeService: Cached \(themes.count) themes for entry \(entry.id)")
            return themes
            
        } catch {
            print("❌ ThemeService: Failed to detect themes for entry \(entry.id) - \(error)")
            
            // Add more specific error logging for decoding issues
            if let apiError = error as? APIError {
                switch apiError {
                case .decodingError(let decodingError):
                    print("🔍 ThemeService: Decoding error details: \(decodingError)")
                case .serverError(let code, let message):
                    print("🔍 ThemeService: Server error \(code): \(message)")
                default:
                    print("🔍 ThemeService: Other API error: \(apiError)")
                }
            }
            
            throw ThemeServiceError.detectionFailed(error.localizedDescription)
        }
    }
    
    // MARK: - Private Methods
    
    private func loadCachedThemes() {
        Task {
            let cachedThemes = await coreDataManager.fetchCachedThemes()
            await MainActor.run {
                // Only load detected (non-custom) themes
                self.detectedThemes = cachedThemes.filter { !$0.isCustom }
                print("🎨 ThemeService: Loaded \(cachedThemes.count) cached themes (\(detectedThemes.count) detected)")
            }
        }
    }
    
    private func cacheDetectedThemes(_ themes: [Theme], for entryId: UUID) async {
        await coreDataManager.cacheThemes(themes, for: entryId)
    }
}

// MARK: - Simple Error Types

enum ThemeServiceError: LocalizedError {
    case detectionFailed(String)
    case fetchFailed(String)
    case networkError
    
    var errorDescription: String? {
        switch self {
        case .detectionFailed(let message):
            return "Theme detection failed: \(message)"
        case .fetchFailed(let message):
            return "Failed to fetch themes: \(message)"
        case .networkError:
            return "Network error occurred"
        }
    }
}

// MARK: - Simple Extensions

extension ThemeService {
    /// Get all themes (convenience method)
    var allThemes: [Theme] {
        return detectedThemes
    }
    
    /// Check if theme detection is in progress
    var isDetectionInProgress: Bool {
        return isProcessing
    }
} 