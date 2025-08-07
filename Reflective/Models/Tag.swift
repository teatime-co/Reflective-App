import Foundation
import SwiftUI
import AppKit

// MARK: - Tag Model
struct Tag: Identifiable, Codable, Hashable {
    let id: UUID
    var name: String
    var color: String
    let createdAt: Date
    var lastUsedAt: Date?
    
    // MARK: - Computed Properties
    var swiftUIColor: Color {
        Color(hex: color) ?? .blue
    }
    
    var formattedLastUsed: String {
        guard let lastUsed = lastUsedAt else { return "Never" }
        
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: lastUsed, relativeTo: Date())
    }
    
    // MARK: - Initializers
    init(
        id: UUID = UUID(),
        name: String,
        color: String? = nil,
        createdAt: Date = Date(),
        lastUsedAt: Date? = nil
    ) {
        self.id = id
        self.name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        self.color = color ?? Tag.generateRandomColor()
        self.createdAt = createdAt
        self.lastUsedAt = lastUsedAt ?? Date()
    }
    
    // MARK: - Static Methods
    static func generateRandomColor() -> String {
        let r = Float.random(in: 0.2...0.9)
        let g = Float.random(in: 0.2...0.9)
        let b = Float.random(in: 0.2...0.9)
        
        let rInt = Int(r * 255)
        let gInt = Int(g * 255)
        let bInt = Int(b * 255)
        
        return String(format: "#%02X%02X%02X", rInt, gInt, bInt)
    }
    
    // MARK: - Methods
    mutating func markAsUsed() {
        lastUsedAt = Date()
    }
    
    // MARK: - Coding Keys
    enum CodingKeys: String, CodingKey {
        case id, name, color
        case createdAt = "created_at"
        case lastUsedAt = "last_used_at"
    }
}

// MARK: - Tag API Models
struct TagCreateRequest: Codable {
    let name: String
    let color: String?
}

struct TagResponse: Codable {
    let id: UUID
    let name: String
    let color: String?
    let createdAt: Date
    let lastUsedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id, name, color
        case createdAt = "created_at"
        case lastUsedAt = "last_used_at"
    }
    
    func toTag() -> Tag {
        return Tag(
            id: id,
            name: name,
            color: color ?? Tag.generateRandomColor(),
            createdAt: createdAt,
            lastUsedAt: lastUsedAt
        )
    }
}

// MARK: - Tag Utilities
extension Array where Element == Tag {
    func sortedByName() -> [Tag] {
        return sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }
    
    func sortedByUsage() -> [Tag] {
        return sorted { (tag1, tag2) in
            let date1 = tag1.lastUsedAt ?? Date.distantPast
            let date2 = tag2.lastUsedAt ?? Date.distantPast
            return date1 > date2
        }
    }
    
    func filtered(by searchText: String) -> [Tag] {
        if searchText.isEmpty {
            return self
        }
        return filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }
}

// MARK: - Color Extension
extension Color {
    init?(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            return nil
        }
        
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
    
    func toHex() -> String {
        let nsColor = NSColor(self)
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0
        
        nsColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        
        let rgb: Int = (Int)(red * 255) << 16 | (Int)(green * 255) << 8 | (Int)(blue * 255) << 0
        return String(format: "#%06X", rgb)
    }
}

// MARK: - Tag Extraction Utilities
struct TagExtractor {
    static func extractHashtags(from content: String) -> [String] {
        // Replace escaped hashtags temporarily
        let escapedContent = content.replacingOccurrences(of: "\\#", with: "ESCAPED_HASHTAG_PLACEHOLDER")
        
        // Extract hashtags using regex
        let regex = try! NSRegularExpression(pattern: "#([\\w\\d_-]+)", options: [])
        let matches = regex.matches(in: escapedContent, options: [], range: NSRange(location: 0, length: escapedContent.count))
        
        var hashtags: [String] = []
        for match in matches {
            if let range = Range(match.range(at: 1), in: escapedContent) {
                let hashtag = String(escapedContent[range])
                hashtags.append(hashtag)
            }
        }
        
        // Remove duplicates and return
        return Array(Set(hashtags))
    }
    
    static func replaceHashtagsWithPlainText(in content: String) -> String {
        // Replace hashtags with plain text for display
        let regex = try! NSRegularExpression(pattern: "#([\\w\\d_-]+)", options: [])
        return regex.stringByReplacingMatches(
            in: content,
            options: [],
            range: NSRange(location: 0, length: content.count),
            withTemplate: "$1"
        )
    }
}

// MARK: - Tag Color Presets
extension Tag {
    static let colorPresets: [String] = [
        "#FF6B6B", // Red
        "#4ECDC4", // Teal
        "#45B7D1", // Blue
        "#96CEB4", // Green
        "#FECA57", // Yellow
        "#FF9FF3", // Pink
        "#54A0FF", // Light Blue
        "#5F27CD", // Purple
        "#00D2D3", // Cyan
        "#FF9F43", // Orange
        "#10AC84", // Emerald
        "#EE5A24", // Dark Orange
        "#0984E3", // Royal Blue
        "#6C5CE7", // Lavender
        "#FD79A8", // Hot Pink
    ]
    
    static func getPresetColor(at index: Int) -> String {
        return colorPresets[index % colorPresets.count]
    }
} 