//
//  ThemeDetectionPanel.swift
//  Reflective
//  Created by Raffy Castillo on 8/7/25.
//

import SwiftUI
import AppKit

struct ThemeDetectionPanel: View {
    @ObservedObject var viewModel: ThemeViewModel
    @State private var searchText = ""
    @State private var isDetecting = false
    @State private var currentEntry: JournalEntry? // Local state for current entry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            headerSection
            
            Divider()
            
            // Search bar
            searchSection
            
            Divider()
            
            // Detection status
            if isDetecting {
                detectionStatusSection
                Divider()
            }
            
            // Themes list
            themeListSection
            
            Divider()
            
            // Actions
            actionsSection
        }
        .frame(minWidth: 280, maxWidth: 400)
        .background(Color(NSColor.controlBackgroundColor))
        // Removed automatic theme loading on appear
    }
    
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Detected Themes")
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    Text("\(filteredThemes.count) themes")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Removed refresh button - themes only loaded via manual detection
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
    
    private var searchSection: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)
                .font(.caption)
            
            TextField("Search themes...", text: $searchText)
                .textFieldStyle(PlainTextFieldStyle())
                .font(.caption)
            
            if !searchText.isEmpty {
                Button(action: { searchText = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                        .font(.caption2)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }
    
    private var detectionStatusSection: some View {
        HStack(spacing: 8) {
            ProgressView()
                .scaleEffect(0.7)
                .progressViewStyle(CircularProgressViewStyle(tint: .accentColor))
            
            Text("Detecting themes...")
                .font(.caption)
                .foregroundColor(.secondary)
            
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color.blue.opacity(0.1))
    }
    
    private var themeListSection: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                if filteredThemes.isEmpty {
                    emptyStateView
                } else {
                    ForEach(filteredThemes) { theme in
                        ThemeCard(theme: theme) {
                            selectTheme(theme)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 12) {
            Image(systemName: "sparkles")
                .font(.title2)
                .foregroundColor(.secondary)
            
            Text("No themes detected yet")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(.secondary)
            
            Text("Write journal entries to automatically discover themes")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)
        }
        .padding(.vertical, 40)
    }
    
    private var actionsSection: some View {
        VStack(spacing: 8) {
            HStack {
                // Only show detect button if we have a current entry
                if currentEntry != nil {
                    Button(action: {
                        Task {
                            await detectThemesForCurrentEntry()
                        }
                    }) {
                        Label("Detect Themes", systemImage: "sparkles")
                            .font(.caption)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.small)
                    .disabled(isDetecting)
                    
                    Spacer()
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
    
    // MARK: - Computed Properties
    
    private var filteredThemes: [Theme] {
        let themes = viewModel.allThemes
        
        if searchText.isEmpty {
            return themes
        } else {
            return themes.filter { theme in
                theme.name.localizedCaseInsensitiveContains(searchText) ||
                theme.description?.localizedCaseInsensitiveContains(searchText) == true
            }
        }
    }
    
    // MARK: - Actions
    
    // Removed loadThemes method - themes only loaded via manual detection
    
    private func selectTheme(_ theme: Theme) {
        // Simple selection - could be used for highlighting or other UI feedback
        print("Selected theme: \(theme.name)")
    }
    
    private func detectThemesForCurrentEntry() async {
        guard let entry = currentEntry else { return }
        
        isDetecting = true
        await viewModel.detectThemes(for: entry)
        isDetecting = false
    }
    
    // MARK: - Public Methods for Integration
    
    func setCurrentEntry(_ entry: JournalEntry?) {
        currentEntry = entry
    }
}

// MARK: - Theme Card
struct ThemeCard: View {
    let theme: Theme
    let onSelect: () -> Void
    
    @State private var isHovered = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(theme.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .lineLimit(2)
                    
                    if let description = theme.description, !description.isEmpty {
                        Text(description)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(3)
                    }
                }
                
                Spacer()
                
                // Confidence score
                VStack(alignment: .trailing, spacing: 2) {
                    Text(theme.formattedConfidence)
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundColor(theme.swiftUIColor)
                    
                    Circle()
                        .fill(theme.swiftUIColor)
                        .frame(width: 12, height: 12)
                }
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isHovered ? Color(NSColor.controlAccentColor).opacity(0.1) : Color(NSColor.controlBackgroundColor))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(theme.swiftUIColor.opacity(0.3), lineWidth: 1)
                )
        )
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.2)) {
                isHovered = hovering
            }
        }
        .onTapGesture {
            onSelect()
        }
    }
}

#Preview {
    ThemeDetectionPanel(viewModel: ThemeViewModel())
        .frame(width: 320, height: 600)
} 