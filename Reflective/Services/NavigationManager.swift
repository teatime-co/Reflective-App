import SwiftUI
import Combine

// MARK: - Navigation Destination
enum NavigationDestination: Hashable {
    case entries
    case editor(mode: EditorMode)
    case tags
    case search
    case analytics
    case themes
    
    var id: String {
        switch self {
        case .entries: return "entries"
        case .editor: return "editor"
        case .tags: return "tags"
        case .search: return "search"
        case .analytics: return "analytics"
        case .themes: return "themes"
        }
    }
}

// MARK: - Navigation Manager
class NavigationManager: ObservableObject {
    static let shared = NavigationManager()
    
    @Published var selectedDestination: NavigationDestination = .entries
    @Published var editorMode: EditorMode = .create
    @Published var showingNavigationConfirmation = false
    
    // Properties for unsaved changes protection
    var hasUnsavedChanges = false
    var pendingDestination: NavigationDestination?
    var onSaveAndNavigate: (() -> Void)?
    var onDiscardAndNavigate: (() -> Void)?
    
    private init() {}
    
    // MARK: - Navigation Methods
    func navigateToEditor(mode: EditorMode = .create) {
        editorMode = mode
        selectedDestination = .editor(mode: mode)
    }
    
    func navigateToEntries() {
        selectedDestination = .entries
    }
    
    func navigateToTags() {
        selectedDestination = .tags
    }
    
    func navigateToSearch() {
        selectedDestination = .search
    }
    
    func navigateToAnalytics() {
        selectedDestination = .analytics
    }
    
    func navigateToThemes() {
        selectedDestination = .themes
    }
    
    // MARK: - Unsaved Changes Protection
    func attemptNavigation(to destination: NavigationDestination) {
        // If we're currently in an editor and have unsaved changes, show confirmation
        if case .editor = selectedDestination, hasUnsavedChanges {
            pendingDestination = destination
            showingNavigationConfirmation = true
        } else {
            // Navigate immediately if no unsaved changes
            selectedDestination = destination
        }
    }
    
    func saveAndNavigate() {
        onSaveAndNavigate?()
        if let destination = pendingDestination {
            selectedDestination = destination
            pendingDestination = nil
        }
        showingNavigationConfirmation = false
    }
    
    func discardAndNavigate() {
        onDiscardAndNavigate?()
        if let destination = pendingDestination {
            selectedDestination = destination
            pendingDestination = nil
        }
        showingNavigationConfirmation = false
    }
    
    func cancelNavigation() {
        pendingDestination = nil
        showingNavigationConfirmation = false
    }
    
    func setUnsavedChanges(_ hasChanges: Bool, 
                          onSave: (() -> Void)? = nil,
                          onDiscard: (() -> Void)? = nil) {
        hasUnsavedChanges = hasChanges
        onSaveAndNavigate = onSave
        onDiscardAndNavigate = onDiscard
    }
} 