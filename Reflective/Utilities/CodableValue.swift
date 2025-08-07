//
//  CodableValue.swift
//  Reflective
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation

// MARK: - CodableValue for flexible parameters
/// A type-safe wrapper for JSON values that maintains Codable conformance
/// Supports common JSON types: String, Int, Double, Bool, and null
public enum CodableValue: Codable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case null
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if container.decodeNil() {
            self = .null
        } else if let stringValue = try? container.decode(String.self) {
            self = .string(stringValue)
        } else if let intValue = try? container.decode(Int.self) {
            self = .int(intValue)
        } else if let doubleValue = try? container.decode(Double.self) {
            self = .double(doubleValue)
        } else if let boolValue = try? container.decode(Bool.self) {
            self = .bool(boolValue)
        } else {
            throw DecodingError.dataCorrupted(
                DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Unsupported type")
            )
        }
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        switch self {
        case .string(let value):
            try container.encode(value)
        case .int(let value):
            try container.encode(value)
        case .double(let value):
            try container.encode(value)
        case .bool(let value):
            try container.encode(value)
        case .null:
            try container.encodeNil()
        }
    }
    
    // MARK: - Convenience computed properties to access values
    public var stringValue: String? {
        if case .string(let value) = self { return value }
        return nil
    }
    
    public var intValue: Int? {
        if case .int(let value) = self { return value }
        return nil
    }
    
    public var doubleValue: Double? {
        if case .double(let value) = self { return value }
        return nil
    }
    
    public var boolValue: Bool? {
        if case .bool(let value) = self { return value }
        return nil
    }
    
    public var isNull: Bool {
        if case .null = self { return true }
        return false
    }
}

// MARK: - Convenience initializers
extension CodableValue {
    /// Initialize from Any value (common use case when converting from [String: Any])
    public init?(any value: Any) {
        if value is NSNull {
            self = .null
        } else if let stringValue = value as? String {
            self = .string(stringValue)
        } else if let intValue = value as? Int {
            self = .int(intValue)
        } else if let doubleValue = value as? Double {
            self = .double(doubleValue)
        } else if let boolValue = value as? Bool {
            self = .bool(boolValue)
        } else {
            return nil
        }
    }
    
    /// Convert to Any for compatibility with existing APIs
    public var anyValue: Any {
        switch self {
        case .string(let value): return value
        case .int(let value): return value
        case .double(let value): return value
        case .bool(let value): return value
        case .null: return NSNull()
        }
    }
}

// MARK: - Dictionary conversion utilities
extension Dictionary where Key == String, Value == CodableValue {
    /// Convert from [String: Any] dictionary
    public init?(anyDictionary: [String: Any]) {
        var result: [String: CodableValue] = [:]
        
        for (key, value) in anyDictionary {
            guard let codableValue = CodableValue(any: value) else {
                return nil // Return nil if any value can't be converted
            }
            result[key] = codableValue
        }
        
        self = result
    }
    
    /// Convert to [String: Any] dictionary
    public var anyDictionary: [String: Any] {
        return mapValues { $0.anyValue }
    }
} 