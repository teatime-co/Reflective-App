//
//  AISettingsView.swift
//  Reflective
//  Created by Raffy Castillo on 8/6/25.
//

import SwiftUI
import AppKit

struct AISettingsView: View {
    @StateObject private var aiService = AIFeaturesService()
    @State private var showingResetConfirmation = false
    
    var body: some View {
        NavigationView {
            Form {
                // AI Features Section
                Section("AI Features") {
                    Toggle("Theme Detection", isOn: $aiService.aiSettings.isThemeDetectionEnabled)
                    Toggle("Linguistic Analysis", isOn: $aiService.aiSettings.isLinguisticAnalysisEnabled)
                    Toggle("Auto-process New Entries", isOn: $aiService.aiSettings.autoProcessNewEntries)
                }
                
                // Theme Detection Settings
                Section("Theme Detection") {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Confidence Threshold")
                            Spacer()
                            Text(String(format: "%.0f%%", aiService.aiSettings.themeConfidenceThreshold * 100))
                                .foregroundColor(.secondary)
                        }
                        
                        Slider(
                            value: $aiService.aiSettings.themeConfidenceThreshold,
                            in: 0.1...1.0,
                            step: 0.1
                        ) {
                            Text("Confidence Threshold")
                        }
                        
                        Text("Only themes with confidence above this threshold will be detected.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                // Processing Settings
                Section("Processing") {
                    Toggle("Batch Processing", isOn: $aiService.aiSettings.batchProcessingEnabled)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Max Retry Attempts")
                            Spacer()
                            Text("\(aiService.aiSettings.maxRetryAttempts)")
                                .foregroundColor(.secondary)
                        }
                        
                        Slider(
                            value: Binding(
                                get: { Double(aiService.aiSettings.maxRetryAttempts) },
                                set: { aiService.aiSettings.maxRetryAttempts = Int($0) }
                            ),
                            in: 1...5,
                            step: 1
                        ) {
                            Text("Max Retry Attempts")
                        }
                        
                        Text("Number of times to retry failed AI processing tasks.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                // Status Section
                Section("Status") {
                    HStack {
                        Text("AI Features")
                        Spacer()
                        Text(aiService.isAIEnabled ? "Enabled" : "Disabled")
                            .foregroundColor(aiService.isAIEnabled ? .green : .red)
                            .fontWeight(.medium)
                    }
                    
                    HStack {
                        Text("Processing Queue")
                        Spacer()
                        if aiService.processingQueue.isEmpty {
                            Text("Empty")
                                .foregroundColor(.secondary)
                        } else {
                            Text("\(aiService.processingQueue.count) items")
                                .foregroundColor(.blue)
                        }
                    }
                    
                    if !aiService.processingErrors.isEmpty {
                        HStack {
                            Text("Errors")
                            Spacer()
                            Text("\(aiService.processingErrors.count)")
                                .foregroundColor(.red)
                                .fontWeight(.medium)
                        }
                        
                        Button("Clear Errors") {
                            aiService.clearErrors()
                        }
                        .foregroundColor(.red)
                    }
                }
                
                // Processing Queue Section
                if !aiService.processingQueue.isEmpty {
                    Section("Processing Queue") {
                        ProcessingQueueView(
                            tasks: aiService.processingQueue,
                            onRetry: { task in
                                Task {
                                    try? await aiService.retryFailedProcessing()
                                }
                            },
                            onCancel: { task in
                                // Cancel functionality would go here
                            }
                        )
                    }
                }
                
                // Actions Section
                Section("Actions") {
                    Button("Reset to Defaults") {
                        showingResetConfirmation = true
                    }
                    .foregroundColor(.red)
                    
                    Button("Clear Completed Tasks") {
                        aiService.clearCompletedTasks()
                    }
                    .disabled(aiService.processingQueue.isEmpty)
                    
                    if !aiService.processingQueue.filter({ task in
                        if case .failed = task.status { return true }
                        return false
                    }).isEmpty {
                        Button("Retry Failed Tasks") {
                            Task {
                                try? await aiService.retryFailedProcessing()
                            }
                        }
                        .foregroundColor(.orange)
                    }
                }
            }
            .navigationTitle("AI Settings")
            .alert("Reset Settings", isPresented: $showingResetConfirmation) {
                Button("Reset", role: .destructive) {
                    resetToDefaults()
                }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("Are you sure you want to reset all AI settings to their default values?")
            }
        }
        .onChange(of: aiService.aiSettings) { _ in
            Task {
                try? await aiService.updateAISettings(aiService.aiSettings)
            }
        }
    }
    
    // MARK: - Helper Methods
    
    private func resetToDefaults() {
        Task {
            try? await aiService.updateAISettings(AISettings.default)
        }
    }
}

// MARK: - AI Settings Summary View

struct AISettingsSummaryView: View {
    @ObservedObject var aiService: AIFeaturesService
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("AI Features")
                .font(.headline)
                .fontWeight(.semibold)
            
            VStack(spacing: 8) {
                SettingRow(
                    title: "Theme Detection",
                    value: aiService.aiSettings.isThemeDetectionEnabled ? "On" : "Off",
                    isEnabled: aiService.aiSettings.isThemeDetectionEnabled
                )
                
                SettingRow(
                    title: "Linguistic Analysis",
                    value: aiService.aiSettings.isLinguisticAnalysisEnabled ? "On" : "Off",
                    isEnabled: aiService.aiSettings.isLinguisticAnalysisEnabled
                )
                
                SettingRow(
                    title: "Auto-processing",
                    value: aiService.aiSettings.autoProcessNewEntries ? "On" : "Off",
                    isEnabled: aiService.aiSettings.autoProcessNewEntries
                )
                
                SettingRow(
                    title: "Confidence Threshold",
                    value: String(format: "%.0f%%", aiService.aiSettings.themeConfidenceThreshold * 100),
                    isEnabled: true
                )
            }
        }
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(12)
    }
}

struct SettingRow: View {
    let title: String
    let value: String
    let isEnabled: Bool
    
    var body: some View {
        HStack {
            Text(title)
                .font(.subheadline)
                .foregroundColor(.primary)
            
            Spacer()
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(isEnabled ? .accentColor : .secondary)
        }
    }
}

#Preview {
    AISettingsView()
} 