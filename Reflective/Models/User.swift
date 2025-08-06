//
//  User.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation

struct User: Codable, Identifiable {
    let id: UUID
    let email: String
    let displayName: String?
    let timezone: String
    let locale: String
    let dailyWordGoal: Int
    let writingReminderTime: String?
    let themePreferences: ThemePreferences?
    let aiFeaturesEnabled: Bool
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case displayName = "display_name"
        case timezone
        case locale
        case dailyWordGoal = "daily_word_goal"
        case writingReminderTime = "writing_reminder_time"
        case themePreferences = "theme_preferences"
        case aiFeaturesEnabled = "ai_features_enabled"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct ThemePreferences: Codable {
    let primaryColor: String?
    let darkMode: Bool
    let fontSize: Double
    
    enum CodingKeys: String, CodingKey {
        case primaryColor = "primary_color"
        case darkMode = "dark_mode"
        case fontSize = "font_size"
    }
}

// MARK: - User Creation/Update Requests
struct UserRegistrationRequest: Codable {
    let email: String
    let password: String
    let displayName: String?
    let timezone: String?
    let locale: String?
    
    enum CodingKeys: String, CodingKey {
        case email
        case password
        case displayName = "display_name"
        case timezone
        case locale
    }
}

struct UserUpdateRequest: Codable {
    let displayName: String?
    let timezone: String?
    let locale: String?
    let dailyWordGoal: Int?
    let writingReminderTime: String?
    let themePreferences: ThemePreferences?
    let aiFeaturesEnabled: Bool?
    
    enum CodingKeys: String, CodingKey {
        case displayName = "display_name"
        case timezone
        case locale
        case dailyWordGoal = "daily_word_goal"
        case writingReminderTime = "writing_reminder_time"
        case themePreferences = "theme_preferences"
        case aiFeaturesEnabled = "ai_features_enabled"
    }
} 