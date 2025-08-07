//
//  SharedTypes.swift
//  Reflective
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation

// MARK: - Shared Time Frame Enum
public enum TimeFrame: String, CaseIterable, Codable {
    case week = "week"
    case month = "month"
    case quarter = "quarter"
    case year = "year"
    case all = "all"
    
    public var displayName: String {
        switch self {
        case .week: return "This Week"
        case .month: return "This Month"
        case .quarter: return "This Quarter"
        case .year: return "This Year"
        case .all: return "All Time"
        }
    }
}

// MARK: - Other Shared Types can be added here as needed 