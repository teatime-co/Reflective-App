//
//  Date+Extensions.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation

extension Date {
    // MARK: - Formatting
    static let apiFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'"
        formatter.timeZone = TimeZone(abbreviation: "UTC")
        return formatter
    }()
    
    static let displayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()
    
    static let shortDisplayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .none
        return formatter
    }()
    
    static let timeOnlyFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .none
        formatter.timeStyle = .short
        return formatter
    }()
    
    // MARK: - Convenience Properties
    var displayString: String {
        return Date.displayFormatter.string(from: self)
    }
    
    var shortDisplayString: String {
        return Date.shortDisplayFormatter.string(from: self)
    }
    
    var timeString: String {
        return Date.timeOnlyFormatter.string(from: self)
    }
    
    var apiString: String {
        return Date.apiFormatter.string(from: self)
    }
    
    // MARK: - Relative Time
    var isToday: Bool {
        return Calendar.current.isDateInToday(self)
    }
    
    var isYesterday: Bool {
        return Calendar.current.isDateInYesterday(self)
    }
    
    var isThisWeek: Bool {
        return Calendar.current.isDate(self, equalTo: Date(), toGranularity: .weekOfYear)
    }
    
    var relativeString: String {
        let calendar = Calendar.current
        
        if isToday {
            return "Today at \(timeString)"
        } else if isYesterday {
            return "Yesterday at \(timeString)"
        } else if isThisWeek {
            let dayFormatter = DateFormatter()
            dayFormatter.dateFormat = "EEEE"
            return "\(dayFormatter.string(from: self)) at \(timeString)"
        } else {
            return displayString
        }
    }
    
    // MARK: - Start/End of periods
    var startOfDay: Date {
        return Calendar.current.startOfDay(for: self)
    }
    
    var endOfDay: Date {
        var components = DateComponents()
        components.day = 1
        components.second = -1
        return Calendar.current.date(byAdding: components, to: startOfDay) ?? self
    }
    
    var startOfWeek: Date {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: self)
        return calendar.date(from: components) ?? self
    }
    
    var endOfWeek: Date {
        let calendar = Calendar.current
        var components = DateComponents()
        components.weekOfYear = 1
        components.second = -1
        return calendar.date(byAdding: components, to: startOfWeek) ?? self
    }
    
    var startOfMonth: Date {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month], from: self)
        return calendar.date(from: components) ?? self
    }
    
    var endOfMonth: Date {
        let calendar = Calendar.current
        var components = DateComponents()
        components.month = 1
        components.second = -1
        return calendar.date(byAdding: components, to: startOfMonth) ?? self
    }
} 