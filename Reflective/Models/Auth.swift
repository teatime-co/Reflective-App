//
//  Auth.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation

// MARK: - Authentication Requests
struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct RefreshTokenRequest: Codable {
    let refreshToken: String
    
    enum CodingKeys: String, CodingKey {
        case refreshToken = "refresh_token"
    }
}

// MARK: - Authentication Responses
struct AuthResponse: Codable {
    let accessToken: String
    let refreshToken: String
    let tokenType: String
    let expiresIn: Int
    let user: User
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case tokenType = "token_type"
        case expiresIn = "expires_in"
        case user
    }
}

struct TokenResponse: Codable {
    let accessToken: String
    let refreshToken: String
    let tokenType: String
    let expiresIn: Int
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case tokenType = "token_type"
        case expiresIn = "expires_in"
    }
}

// OAuth2 Token Response (what the server actually returns for login)
struct Token: Codable {
    let accessToken: String
    let tokenType: String
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
    }
}

// MARK: - Authentication State
enum AuthState {
    case idle
    case loading
    case authenticated(User)
    case unauthenticated
    case error(String)
}

// MARK: - JWT Token Model
struct JWTToken {
    let accessToken: String
    let refreshToken: String
    let expiresAt: Date
    
    var isExpired: Bool {
        return Date() >= expiresAt
    }
    
    var isExpiringSoon: Bool {
        // Consider token expiring soon if it expires within 5 minutes
        return Date().addingTimeInterval(300) >= expiresAt
    }
    
    init(accessToken: String, refreshToken: String, expiresIn: Int) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.expiresAt = Date().addingTimeInterval(TimeInterval(expiresIn))
    }
} 