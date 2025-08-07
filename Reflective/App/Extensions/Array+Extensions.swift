//
//  Array+Extensions.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation

// MARK: - Array Extensions

extension Array {
    /// Splits the array into chunks of the specified size
    func chunked(into size: Int) -> [[Element]] {
        return stride(from: 0, to: count, by: size).map {
            Array(self[$0..<Swift.min($0 + size, count)])
        }
    }
} 