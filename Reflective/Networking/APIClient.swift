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
        config.allowsCellularAccess = false // macOS doesn't use cellular
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
    func request<T: Codable>(
        endpoint: String,
        method: HTTPMethod = .GET,
        body: Codable? = nil,
        requiresAuth: Bool = true
    ) -> AnyPublisher<T, APIError> {
        
        guard let url = URL(string: endpoint, relativeTo: baseURL) else {
            return Fail(error: APIError.invalidURL)
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add authentication header if required
        if requiresAuth {
            if let token = Keychain.shared.getAccessToken() {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            } else {
                return Fail(error: APIError.unauthorized)
                    .eraseToAnyPublisher()
            }
        }
        
        // Add request body if provided
        if let body = body {
            do {
                request.httpBody = try jsonEncoder.encode(body)
            } catch {
                return Fail(error: APIError.encodingError(error))
                    .eraseToAnyPublisher()
            }
        }
        
        if AppEnvironment.current.enableLogging {
            print("🌐 API Request: \(method.rawValue) \(url)")
            if let bodyData = request.httpBody,
               let bodyString = String(data: bodyData, encoding: .utf8) {
                print("📤 Request Body: \(bodyString)")
            }
        }
        
        return session.dataTaskPublisher(for: request)
            .handleEvents(receiveOutput: { data, response in
                if AppEnvironment.current.enableLogging {
                    print("📥 API Response: \(response)")
                    if let responseString = String(data: data, encoding: .utf8) {
                        print("📥 Response Data: \(responseString)")
                    }
                }
            })
            .map(\.data)
            .decode(type: T.self, decoder: jsonDecoder)
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
    
    // MARK: - Convenience Methods
    func get<T: Codable>(
        endpoint: String,
        requiresAuth: Bool = true
    ) -> AnyPublisher<T, APIError> {
        return request(endpoint: endpoint, method: .GET, requiresAuth: requiresAuth)
    }
    
    func post<T: Codable>(
        endpoint: String,
        body: Codable?,
        requiresAuth: Bool = true
    ) -> AnyPublisher<T, APIError> {
        return request(endpoint: endpoint, method: .POST, body: body, requiresAuth: requiresAuth)
    }
    
    func put<T: Codable>(
        endpoint: String,
        body: Codable?,
        requiresAuth: Bool = true
    ) -> AnyPublisher<T, APIError> {
        return request(endpoint: endpoint, method: .PUT, body: body, requiresAuth: requiresAuth)
    }
    
    func delete<T: Codable>(
        endpoint: String,
        requiresAuth: Bool = true
    ) -> AnyPublisher<T, APIError> {
        return request(endpoint: endpoint, method: .DELETE, requiresAuth: requiresAuth)
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