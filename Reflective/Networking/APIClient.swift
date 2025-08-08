//
//  APIClient.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation
import Combine

class APIClient: ObservableObject {
    static let shared = APIClient()
    
    private let session: URLSession
    private let baseURL: URL
    private let jsonDecoder: JSONDecoder
    private let jsonEncoder: JSONEncoder
    
    private init() {
        self.baseURL = AppEnvironment.current.apiBaseURL
        print("🌐 APIClient: Initialized with baseURL: \(baseURL)")
        
        let config = URLSessionConfiguration.default
        config.requestCachePolicy = AppEnvironment.current.cachePolicy
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        
        // macOS-specific networking configuration
        config.waitsForConnectivity = true
        config.allowsConstrainedNetworkAccess = true // Allow on macOS
        config.allowsExpensiveNetworkAccess = true // Allow on macOS
        
        self.session = URLSession(configuration: config)
        
        self.jsonDecoder = JSONDecoder()
        self.jsonEncoder = JSONEncoder()
        
        // Configure date formatting to match backend
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS'Z'"
        dateFormatter.timeZone = TimeZone(abbreviation: "UTC")
        
        jsonDecoder.dateDecodingStrategy = .formatted(dateFormatter)
        jsonEncoder.dateEncodingStrategy = .formatted(dateFormatter)
    }
    
    // MARK: - OAuth2 Form Data Request for Login
    func oauth2Login(
        endpoint: String,
        username: String,
        password: String
    ) -> AnyPublisher<Token, APIError> {
        
        guard let url = URL(string: endpoint, relativeTo: baseURL) else {
            return Fail(error: APIError.invalidURL)
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        
        // Create form data for OAuth2
        let formData = "grant_type=password&username=\(username)&password=\(password)"
        request.httpBody = formData.data(using: .utf8)
        
        if AppEnvironment.current.enableLogging {
            print("🌐 OAuth2 Request: POST \(url)")
            print("📤 Form Data: grant_type=password&username=\(username)&password=***")
        }
        
        return session.dataTaskPublisher(for: request)
            .handleEvents(receiveOutput: { data, response in
                if AppEnvironment.current.enableLogging {
                    print("📥 OAuth2 Response: \(response)")
                    if let responseString = String(data: data, encoding: .utf8) {
                        print("📥 Response Data: \(responseString)")
                    }
                }
            })
            .map(\.data)
            .decode(type: Token.self, decoder: jsonDecoder)
            .mapError { error in
                if let decodingError = error as? DecodingError {
                    return APIError.decodingError(decodingError)
                } else if let urlError = error as? URLError {
                    return APIError.networkError(urlError)
                } else {
                    return APIError.unknown(error)
                }
            }
            .eraseToAnyPublisher()
    }

    // MARK: - Generic Request Method
    func requestPublisher<T: Codable>(
        endpoint: String,
        method: HTTPMethod = .GET,
        body: Codable? = nil,
        requiresAuth: Bool = true
    ) -> AnyPublisher<T, APIError> {
        
        guard let url = URL(string: endpoint, relativeTo: baseURL) else {
            return Fail(error: APIError.invalidURL)
                .eraseToAnyPublisher()
        }
        
        // Create request preparation publisher
        let requestPreparation = Future<URLRequest, APIError> { promise in
            Task {
                do {
                    var request = URLRequest(url: url)
                    request.httpMethod = method.rawValue
                    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    
                    // Add authentication header if required
                    if requiresAuth {
                        // Use AuthManager to ensure we have a valid token
                        let validToken = try await AuthManager.shared.ensureValidToken()
                        request.setValue("Bearer \(validToken)", forHTTPHeaderField: "Authorization")
                        print("🔐 [macOS] Added auth header: Authorization: Bearer \(String(validToken.prefix(20)))...")
                    }
                    
                    // Add request body if provided
                    if let body = body {
                        do {
                            request.httpBody = try self.jsonEncoder.encode(body)
                        } catch {
                            promise(.failure(APIError.encodingError(error)))
                            return
                        }
                    }
                    
                    promise(.success(request))
                } catch {
                    if let apiError = error as? APIError {
                        promise(.failure(apiError))
                    } else {
                        promise(.failure(APIError.unknown(error)))
                    }
                }
            }
        }
        
        return requestPreparation
            .flatMap { request in
                if AppEnvironment.current.enableLogging {
                    print("🌐 API Request: \(method.rawValue) \(url)")
                    print("📤 Request Headers:")
                    if let headers = request.allHTTPHeaderFields {
                        for (key, value) in headers {
                            if key == "Authorization" {
                                print("   \(key): Bearer \(String(value.dropFirst(7).prefix(20)))...")
                            } else {
                                print("   \(key): \(value)")
                            }
                        }
                    }
                    if let bodyData = request.httpBody,
                       let bodyString = String(data: bodyData, encoding: .utf8) {
                        print("📤 Request Body: \(bodyString)")
                    }
                }
                
                return self.session.dataTaskPublisher(for: request)
                    .handleEvents(receiveOutput: { data, response in
                        if AppEnvironment.current.enableLogging {
                            print("📥 API Response: \(response)")
                            if let responseString = String(data: data, encoding: .utf8) {
                                print("📥 Response Data: \(responseString)")
                            }
                        }
                    })
                    .tryMap { data, response in
                        // Check for HTTP errors
                        if let httpResponse = response as? HTTPURLResponse {
                            switch httpResponse.statusCode {
                            case 401:
                                throw APIError.unauthorized
                            case 400..<500:
                                // Try to parse error message from response
                                if let errorMessage = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                                   let detail = errorMessage["detail"] as? String {
                                    throw APIError.serverError(httpResponse.statusCode, detail)
                                } else {
                                    throw APIError.serverError(httpResponse.statusCode, "Client error")
                                }
                            case 500..<600:
                                // Try to parse error message from response
                                if let errorMessage = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                                   let detail = errorMessage["detail"] as? String {
                                    throw APIError.serverError(httpResponse.statusCode, detail)
                                } else {
                                    throw APIError.serverError(httpResponse.statusCode, "Server error")
                                }
                            default:
                                break
                            }
                        }
                        return data
                    }
                    .decode(type: T.self, decoder: self.jsonDecoder)
                    .mapError { error in
                        if let apiError = error as? APIError {
                            return apiError
                        } else if let decodingError = error as? DecodingError {
                            // Log the decoding error details for debugging
                            print("🔍 APIClient: Decoding error for type \(T.self)")
                            print("🔍 APIClient: Decoding error details: \(decodingError)")
                            
                            // Try to print the raw JSON for debugging
                            if case .keyNotFound(let key, let context) = decodingError {
                                print("🔍 APIClient: Missing key '\(key.stringValue)' at path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))")
                            } else if case .typeMismatch(let type, let context) = decodingError {
                                print("🔍 APIClient: Type mismatch for type '\(type)' at path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))")
                            } else if case .valueNotFound(let type, let context) = decodingError {
                                print("🔍 APIClient: Value not found for type '\(type)' at path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))")
                            } else if case .dataCorrupted(let context) = decodingError {
                                print("🔍 APIClient: Data corrupted at path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))")
                                print("🔍 APIClient: Debug description: \(context.debugDescription)")
                            }
                            
                            return APIError.decodingError(decodingError)
                        } else if let urlError = error as? URLError {
                            return APIError.networkError(urlError)
                        } else {
                            return APIError.unknown(error)
                        }
                    }
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    // MARK: - Convenience Methods
    func get<T: Codable>(
        endpoint: String,
        requiresAuth: Bool = true
    ) -> AnyPublisher<T, APIError> {
        return requestPublisher(endpoint: endpoint, method: .GET, requiresAuth: requiresAuth)
    }
    
    func post<T: Codable>(
        endpoint: String,
        body: Codable?,
        requiresAuth: Bool = true
    ) -> AnyPublisher<T, APIError> {
        return requestPublisher(endpoint: endpoint, method: .POST, body: body, requiresAuth: requiresAuth)
    }
    
    func put<T: Codable>(
        endpoint: String,
        body: Codable?,
        requiresAuth: Bool = true
    ) -> AnyPublisher<T, APIError> {
        return requestPublisher(endpoint: endpoint, method: .PUT, body: body, requiresAuth: requiresAuth)
    }
    
    func delete<T: Codable>(
        endpoint: String,
        requiresAuth: Bool = true
    ) -> AnyPublisher<T, APIError> {
        return requestPublisher(endpoint: endpoint, method: .DELETE, requiresAuth: requiresAuth)
    }
    
    // MARK: - Async/Await Wrapper Methods
    
    /// Async wrapper for the generic request method
    func request<T: Codable>(
        endpoint: String,
        method: HTTPMethod = .GET,
        body: Codable? = nil,
        requiresAuth: Bool = true
    ) async throws -> T {
        return try await withCheckedThrowingContinuation { continuation in
            var cancellable: AnyCancellable?
            cancellable = requestPublisher(endpoint: endpoint, method: method, body: body, requiresAuth: requiresAuth)
                .sink(
                    receiveCompletion: { completion in
                        defer { cancellable = nil } // Clean up the cancellable
                        switch completion {
                        case .failure(let error):
                            continuation.resume(throwing: error)
                        case .finished:
                            break
                        }
                    },
                    receiveValue: { value in
                        defer { cancellable = nil } // Clean up the cancellable
                        continuation.resume(returning: value)
                    }
                )
        }
    }
    
    /// Async wrapper for GET requests
    func get<T: Codable>(
        endpoint: String,
        requiresAuth: Bool = true
    ) async throws -> T {
        return try await request(endpoint: endpoint, method: .GET, requiresAuth: requiresAuth)
    }
    
    /// Async wrapper for POST requests
    func post<T: Codable>(
        endpoint: String,
        body: Codable? = nil,
        requiresAuth: Bool = true
    ) async throws -> T {
        return try await request(endpoint: endpoint, method: .POST, body: body, requiresAuth: requiresAuth)
    }
    
    /// Async wrapper for PUT requests
    func put<T: Codable>(
        endpoint: String,
        body: Codable? = nil,
        requiresAuth: Bool = true
    ) async throws -> T {
        return try await request(endpoint: endpoint, method: .PUT, body: body, requiresAuth: requiresAuth)
    }
    
    /// Async wrapper for DELETE requests
    func delete<T: Codable>(
        endpoint: String,
        requiresAuth: Bool = true
    ) async throws -> T {
        return try await request(endpoint: endpoint, method: .DELETE, requiresAuth: requiresAuth)
    }
    
    /// Async wrapper for DELETE requests that don't return data
    func delete(
        endpoint: String,
        requiresAuth: Bool = true
    ) async throws {
        let _: EmptyResponse = try await request(endpoint: endpoint, method: .DELETE, requiresAuth: requiresAuth)
    }
}

// MARK: - HTTP Methods
enum HTTPMethod: String {
    case GET = "GET"
    case POST = "POST"
    case PUT = "PUT"
    case DELETE = "DELETE"
    case PATCH = "PATCH"
}

// MARK: - API Errors
enum APIError: Error, LocalizedError {
    case invalidURL
    case unauthorized
    case networkError(URLError)
    case decodingError(DecodingError)
    case encodingError(Error)
    case serverError(Int, String?)
    case unknown(Error)
    
    var isUnauthorized: Bool {
        switch self {
        case .unauthorized:
            return true
        case .serverError(let code, _):
            return code == 401
        default:
            return false
        }
    }
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .unauthorized:
            return "Authentication required"
        case .networkError(let urlError):
            return "Network error: \(urlError.localizedDescription)"
        case .decodingError(let decodingError):
            if AppEnvironment.current.enableDetailedErrors {
                return "Decoding error: \(decodingError.localizedDescription)"
            } else {
                return "Data processing error"
            }
        case .encodingError(let error):
            return "Request encoding error: \(error.localizedDescription)"
        case .serverError(let code, let message):
            return "Server error (\(code)): \(message ?? "Unknown error")"
        case .unknown(let error):
            return "Unknown error: \(error.localizedDescription)"
        }
    }
} 