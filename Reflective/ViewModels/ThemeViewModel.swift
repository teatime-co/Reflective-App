//
//  ThemeViewModel.swift
//  Reflective
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation
import Combine

@MainActor
class ThemeViewModel: ObservableObject {
    
    // MARK: - Published Properties (Simple Phase 4B)
    @Published var detectedThemes: [Theme] = []
    @Published var isProcessing = false
    @Published var errorMessage: String?
    @Published var currentEntry: JournalEntry?
    
    // MARK: - Dependencies
    private let themeService: ThemeService
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    init(themeService: ThemeService? = nil) {
        self.themeService = themeService ?? ThemeService.shared
        setupBindings()
        // Removed automatic theme data loading
    }
    
    // MARK: - Public Methods (Phase 4B Only)
    
    /// Removed automatic theme loading - themes only loaded via manual detection
    
    /// Detect themes for a journal entry
    func detectThemes(for entry: JournalEntry) async {
        isProcessing = true
        errorMessage = nil
        
        do {
            let themes = try await themeService.detectThemes(for: entry)
            // Themes are automatically handled in the service
            
        } catch {
            self.errorMessage = "Failed to detect themes: \(error.localizedDescription)"
            print("❌ ThemeViewModel: Failed to detect themes - \(error)")
        }
        
        isProcessing = false
    }
    
    /// Removed theme suggestions method - only manual detection allowed
    
    /// Clear error message
    func clearError() {
        errorMessage = nil
    }
    
    /// Set the current entry for theme operations
    func setCurrentEntry(_ entry: JournalEntry?) {
        currentEntry = entry
    }
    
    // MARK: - Computed Properties (Simple)
    
    var allThemes: [Theme] {
        return detectedThemes
    }
    
    var hasThemes: Bool {
        return !allThemes.isEmpty
    }
    
    var hasError: Bool {
        return errorMessage != nil
    }
    
    // MARK: - Private Methods
    
    private func setupBindings() {
        // Bind theme service properties to view model
        themeService.$detectedThemes
            .receive(on: DispatchQueue.main)
            .assign(to: \.detectedThemes, on: self)
            .store(in: &cancellables)
        
        themeService.$isProcessing
            .receive(on: DispatchQueue.main)
            .assign(to: \.isProcessing, on: self)
            .store(in: &cancellables)
    }
    
    private func loadInitialData() {
        // Removed automatic theme loading
    }
} 