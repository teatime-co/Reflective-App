//
//  AppConfig.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation

struct AppConfig {
    // MARK: - API Configuration
    struct API {
        static let apiVersion = "v1"
        
        
        // MARK: - Endpoints
        struct Endpoints {
            // Authentication
            static let login = "auth/token"
            static let register = "auth/register"
            static let refresh = "auth/refresh"
            static let logout = "auth/logout"
            
            // Users
            static let users = "users"
            static let userProfile = "users/me"
            
            // Journal Entries
            static let logs = "logs"
            
            // Tags
            static let tags = "tags"
            
            // Sessions
            static let sessions = "sessions"
            
            // Themes
            static let themes = "themes"
            
            // Linguistic Analysis
            static let linguistic = "linguistic"
        }
    }
    
    // MARK: - App Constants
    struct Constants {
        static let appName = "Reflective"
        static let appVersion = "1.0.0"
        
        // Default values
        static let defaultDailyWordGoal = 500
        static let defaultTimezone = TimeZone.current.identifier
        static let defaultLocale = Locale.current.identifier
        
        // UI Constants
        static let sidebarWidth: CGFloat = 250
        static let minWindowWidth: CGFloat = 800
        static let minWindowHeight: CGFloat = 600
        
        // Writing Session
        static let defaultSessionDuration: TimeInterval = 25 * 60 // 25 minutes
        static let autosaveInterval: TimeInterval = 30 // 30 seconds
    }
    
    // MARK: - Feature Flags
    struct Features {
        static let enableAIFeatures = true
        static let enableOfflineMode = true
        static let enableAnalytics = true
        static let enablePushNotifications = false // macOS doesn't typically use push notifications
        static let enableCloudSync = false // Will be implemented later
    }
} 