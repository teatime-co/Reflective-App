//
//  AIProcessingIndicator.swift
//  Reflective
//  Created by Raffy Castillo on 8/6/25.
//

import SwiftUI
import AppKit

struct AIProcessingIndicator: View {
    let status: ProcessingStatus
    let compact: Bool
    
    init(status: ProcessingStatus, compact: Bool = false) {
        self.status = status
        self.compact = compact
    }
    
    var body: some View {
        if compact {
            compactIndicator
        } else {
            fullIndicator
        }
    }
    
    // MARK: - Compact Indicator
    
    private var compactIndicator: some View {
        HStack(spacing: 8) {
            statusIcon
                .font(.caption)
            
            Text(statusText)
                .font(.caption)
                .foregroundColor(statusColor)
                .lineLimit(1)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(statusBackgroundColor)
        .cornerRadius(8)
    }
    
    // MARK: - Full Indicator
    
    private var fullIndicator: some View {
        VStack(spacing: 12) {
            // Status icon and text
            VStack(spacing: 8) {
                statusIcon
                    .font(.title2)
                    .foregroundColor(statusColor)
                
                Text(statusText)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(statusColor)
                    .multilineTextAlignment(.center)
            }
            
            // Progress indicator for processing
            if case .processing(let count) = status {
                VStack(spacing: 8) {
                    if count > 0 {
                        Text("Processing \(count) items...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    processingProgressView
                }
            }
            
            // Error details
            if case .error(let message) = status {
                errorDetailsView(message: message)
            }
        }
        .padding()
        .background(statusBackgroundColor)
        .cornerRadius(12)
    }
    
    // MARK: - Status Components
    
    @ViewBuilder
    private var statusIcon: some View {
        switch status {
        case .idle:
            Image(systemName: "brain")
                .foregroundColor(.secondary)
            
        case .processing:
            Image(systemName: "brain.head.profile")
                .foregroundColor(.blue)
            
        case .completed:
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
            
        case .error:
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.red)
        }
    }
    
    private var statusText: String {
        switch status {
        case .idle:
            return "Ready"
        case .processing(let count):
            if count == 0 {
                return "Processing..."
            } else if count == 1 {
                return "Processing 1 item"
            } else {
                return "Processing \(count) items"
            }
        case .completed:
            return "Completed"
        case .error:
            return "Error"
        }
    }
    
    private var statusColor: Color {
        switch status {
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
    
    private var statusBackgroundColor: Color {
        switch status {
        case .idle:
            return Color(NSColor.controlBackgroundColor)
        case .processing:
            return Color.blue.opacity(0.1)
        case .completed:
            return Color.green.opacity(0.1)
        case .error:
            return Color.red.opacity(0.1)
        }
    }
    
    // MARK: - Processing Progress View
    
    private var processingProgressView: some View {
        VStack(spacing: 6) {
            // Animated dots
            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { index in
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 6, height: 6)
                        .scaleEffect(processingDotScale(for: index))
                        .animation(
                            .easeInOut(duration: 0.6)
                            .repeatForever()
                            .delay(Double(index) * 0.2),
                            value: status.isProcessing
                        )
                }
            }
            
            // Progress bar (indeterminate)
            ProgressView()
                .progressViewStyle(LinearProgressViewStyle())
                .scaleEffect(x: 1, y: 0.5, anchor: .center)
                .frame(height: 2)
        }
    }
    
    // MARK: - Error Details View
    
    private func errorDetailsView(message: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Error Details:")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.secondary)
            
            Text(message)
                .font(.caption)
                .foregroundColor(.red)
                .padding(8)
                .background(Color.red.opacity(0.1))
                .cornerRadius(6)
        }
    }
    
    // MARK: - Helper Methods
    
    private func processingDotScale(for index: Int) -> CGFloat {
        if status.isProcessing {
            let time = Date().timeIntervalSince1970
            let offset = Double(index) * 0.2
            return 1.0 + 0.3 * sin(time * 3 + offset)
        } else {
            return 1.0
        }
    }
}

// MARK: - Processing Queue View

struct ProcessingQueueView: View {
    let tasks: [ProcessingTask]
    let onRetry: (ProcessingTask) -> Void
    let onCancel: (ProcessingTask) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Processing Queue")
                .font(.headline)
                .fontWeight(.semibold)
            
            if tasks.isEmpty {
                emptyQueueView
            } else {
                taskListView
            }
        }
    }
    
    private var emptyQueueView: some View {
        VStack(spacing: 8) {
            Image(systemName: "tray")
                .font(.title2)
                .foregroundColor(.secondary)
            
            Text("No tasks in queue")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(NSColor.controlBackgroundColor))
        .cornerRadius(8)
    }
    
    private var taskListView: some View {
        LazyVStack(spacing: 8) {
            ForEach(tasks) { task in
                ProcessingTaskRow(
                    task: task,
                    onRetry: { onRetry(task) },
                    onCancel: { onCancel(task) }
                )
            }
        }
    }
}

// MARK: - Processing Task Row

struct ProcessingTaskRow: View {
    let task: ProcessingTask
    let onRetry: () -> Void
    let onCancel: () -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            // Feature icon
            Image(systemName: task.feature.icon)
                .font(.title3)
                .foregroundColor(statusColor)
                .frame(width: 24)
            
            // Task details
            VStack(alignment: .leading, spacing: 2) {
                Text(task.feature.displayName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text(statusDescription)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Status indicator
            taskStatusIndicator
            
            // Action buttons
            if case .failed = task.status {
                Button("Retry", action: onRetry)
                    .font(.caption)
                    .foregroundColor(.blue)
            }
        }
        .padding(12)
        .background(Color(NSColor.windowBackgroundColor))
        .cornerRadius(8)
        .shadow(color: .black.opacity(0.1), radius: 1, x: 0, y: 1)
    }
    
    private var statusColor: Color {
        switch task.status {
        case .pending:
            return .orange
        case .processing:
            return .blue
        case .completed:
            return .green
        case .failed:
            return .red
        case .retrying:
            return .yellow
        }
    }
    
    private var statusDescription: String {
        switch task.status {
        case .pending:
            return "Waiting to process"
        case .processing:
            return "Processing..."
        case .completed:
            return "Completed at \(task.updatedAt.formatted(date: .omitted, time: .shortened))"
        case .failed(let errorMessage):
            return "Failed: \(errorMessage)"
        case .retrying(let attempt):
            return "Retrying (attempt \(attempt))"
        }
    }
    
    @ViewBuilder
    private var taskStatusIndicator: some View {
        switch task.status {
        case .pending:
            Image(systemName: "clock")
                .foregroundColor(.orange)
                .font(.caption)
            
        case .processing:
            ProgressView()
                .scaleEffect(0.7)
            
        case .completed:
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
                .font(.caption)
            
        case .failed:
            Image(systemName: "xmark.circle.fill")
                .foregroundColor(.red)
                .font(.caption)
            
        case .retrying:
            Image(systemName: "arrow.clockwise")
                .foregroundColor(.yellow)
                .font(.caption)
        }
    }
}

// MARK: - Extensions

extension AIFeature {
    var icon: String {
        switch self {
        case .themeDetection:
            return "tag.fill"
        case .linguisticAnalysis:
            return "text.book.closed"
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        // Different status indicators
        AIProcessingIndicator(status: .idle)
        AIProcessingIndicator(status: .processing(count: 3))
        AIProcessingIndicator(status: .completed)
        AIProcessingIndicator(status: .error("Failed to connect to server"))
        
        // Compact indicators
        HStack(spacing: 12) {
            AIProcessingIndicator(status: .idle, compact: true)
            AIProcessingIndicator(status: .processing(count: 1), compact: true)
            AIProcessingIndicator(status: .completed, compact: true)
            AIProcessingIndicator(status: .error("Error"), compact: true)
        }
        
        // Sample processing queue
        let sampleTasks = [
            ProcessingTask(
                entryId: UUID(),
                feature: .themeDetection,
                status: .processing,
                createdAt: Date(),
                updatedAt: Date()
            ),
            ProcessingTask(
                entryId: UUID(),
                feature: .linguisticAnalysis,
                status: .pending,
                createdAt: Date(),
                updatedAt: Date()
            )
        ]
        
        ProcessingQueueView(
            tasks: sampleTasks,
            onRetry: { _ in },
            onCancel: { _ in }
        )
    }
    .padding()
} 