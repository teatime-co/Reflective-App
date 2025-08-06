//
//  View+Extensions.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import SwiftUI

// MARK: - macOS-Specific View Modifiers
extension View {
    /// Applies consistent text field styling for macOS
    func macOSTextField() -> some View {
        self
            .textFieldStyle(.plain)
            .padding(8)
            .background(Color(.textBackgroundColor))
            .cornerRadius(6)
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(Color(.separatorColor), lineWidth: 1)
            )
    }
    
    /// Applies consistent button styling for macOS
    func macOSPrimaryButton() -> some View {
        self
            .buttonStyle(.plain)
            .frame(height: 36)
            .background(Color.accentColor)
            .foregroundColor(.white)
            .cornerRadius(6)
    }
    
    /// Applies consistent secondary button styling for macOS
    func macOSSecondaryButton() -> some View {
        self
            .buttonStyle(.bordered)
            .controlSize(.regular)
    }
    
    /// Conditionally applies modifiers based on platform
    @ViewBuilder
    func macOSOnly<T: View>(_ modifier: @escaping (Self) -> T) -> some View {
        #if os(macOS)
        modifier(self)
        #else
        self
        #endif
    }
}

// MARK: - macOS Color Extensions
extension Color {
    static let macOSAccent = Color.accentColor
    static let macOSSecondary = Color(.secondaryLabelColor)
    static let macOSBackground = Color(.controlBackgroundColor)
    static let macOSWindowBackground = Color(.windowBackgroundColor)
    static let macOSTextBackground = Color(.textBackgroundColor)
    static let macOSSeparator = Color(.separatorColor)
}

// MARK: - macOS Typography
extension Font {
    static let macOSTitle = Font.title
    static let macOSHeadline = Font.headline
    static let macOSSubheadline = Font.subheadline
    static let macOSBody = Font.body
    static let macOSCaption = Font.caption
} 