//
//  AppEnvironment.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation

enum AppEnvironment {
    case development
    case production
    
    static var current: AppEnvironment {
        #if DEBUG
        return .development
        #else
        return .production
        #endif
    }
    
    var apiBaseURL: URL {
        switch self {
        case .development:
            return URL(string: "http://localhost:8000/api/")!
        case .production:
            return URL(string: "https://api.reflective.app/api/")! // Will be updated when deployed
        }
    }
    
    var enableLogging: Bool {
        switch self {
        case .development:
            return true
        case .production:
            return false
        }
    }
    
    var enableDetailedErrors: Bool {
        switch self {
        case .development:
            return true
        case .production:
            return false
        }
    }
    
    var cachePolicy: URLRequest.CachePolicy {
        switch self {
        case .development:
            return .reloadIgnoringLocalCacheData
        case .production:
            return .useProtocolCachePolicy
        }
    }
} 