//
//  Combine+Extensions.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation
import Combine

// MARK: - Publisher Extension for Async/Await
extension Publisher {
    func async() async throws -> Output {
        var cancellable: AnyCancellable?
        defer { cancellable?.cancel() }
        
        return try await withCheckedThrowingContinuation { continuation in
            var finishedWithoutValue = false
            
            cancellable = sink(
                receiveCompletion: { completion in
                    switch completion {
                    case .finished:
                        if finishedWithoutValue {
                            continuation.resume(throwing: APIError.unknown(NSError(domain: "PublisherError", code: 0, userInfo: [NSLocalizedDescriptionKey: "Publisher finished without emitting value"])))
                        }
                    case .failure(let error):
                        continuation.resume(throwing: error)
                    }
                },
                receiveValue: { value in
                    finishedWithoutValue = false
                    continuation.resume(returning: value)
                }
            )
            
            finishedWithoutValue = true
        }
    }
} 