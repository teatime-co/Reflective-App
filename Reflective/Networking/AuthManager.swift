//
//  AuthManager.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation
import Combine

class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published var currentToken: JWTToken?
    @Published var isAuthenticated: Bool = false
    
    private var cancellables = Set<AnyCancellable>()
    private let apiClient = APIClient.shared
    private let keychain = Keychain.shared
    
    private init() {
        loadSavedTokens()
        setupTokenValidation()
    }
    
    // MARK: - Token Management
    private func loadSavedTokens() {
        guard let accessToken = keychain.getAccessToken(),
              let refreshToken = keychain.getRefreshToken() else {
            return
        }
        
        // Create token with a default expiration (will be refreshed if needed)
        let token = JWTToken(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresIn: 3600 // 1 hour default
        )
        
        self.currentToken = token
        self.isAuthenticated = true
        
        // Check if token needs refresh
        if token.isExpiringSoon {
            refreshTokenIfNeeded()
        }
    }
    
    private func setupTokenValidation() {
        // Set up a timer to check token expiration every 5 minutes
        Timer.publish(every: 300, on: .main, in: .common)
            .autoconnect()
            .sink { _ in
                self.refreshTokenIfNeeded()
            }
            .store(in: &cancellables)
    }
    
    func saveTokens(authResponse: AuthResponse) {
        let token = JWTToken(
            accessToken: authResponse.accessToken,
            refreshToken: authResponse.refreshToken,
            expiresIn: authResponse.expiresIn
        )
        
        self.currentToken = token
        self.isAuthenticated = true
        
        // Save to keychain
        _ = keychain.saveTokens(
            accessToken: authResponse.accessToken,
            refreshToken: authResponse.refreshToken
        )
        
        // Save user info
        _ = keychain.saveUserInfo(
            userID: authResponse.user.id.uuidString,
            email: authResponse.user.email
        )
    }
    
    func saveTokens(tokenResponse: TokenResponse) {
        let token = JWTToken(
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken,
            expiresIn: tokenResponse.expiresIn
        )
        
        self.currentToken = token
        self.isAuthenticated = true
        
        // Save to keychain
        _ = keychain.saveTokens(
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken
        )
    }
    
    func clearTokens() {
        self.currentToken = nil
        self.isAuthenticated = false
        keychain.clearTokens()
    }
    
    // MARK: - Token Refresh
    private func refreshTokenIfNeeded() {
        guard let token = currentToken,
              token.isExpiringSoon,
              !token.isExpired else {
            if currentToken?.isExpired == true {
                clearTokens()
            }
            return
        }
        
        refreshToken()
    }
    
    func refreshToken() -> AnyPublisher<Void, APIError> {
        guard let currentToken = currentToken else {
            return Fail(error: APIError.unauthorized)
                .eraseToAnyPublisher()
        }
        
        let request = RefreshTokenRequest(refreshToken: currentToken.refreshToken)
        
        return apiClient.post(
            endpoint: AppConfig.API.Endpoints.refresh,
            body: request,
            requiresAuth: false
        )
        .map { (response: TokenResponse) in
            self.saveTokens(tokenResponse: response)
            return ()
        }
        .catch { error -> AnyPublisher<Void, APIError> in
            // If refresh fails, clear tokens
            self.clearTokens()
            return Fail(error: error)
                .eraseToAnyPublisher()
        }
        .eraseToAnyPublisher()
    }
    
    // MARK: - Authentication Methods
    func login(email: String, password: String) -> AnyPublisher<User, APIError> {
        print("🔐 AuthManager: Starting OAuth2 login for \(email)")
        return apiClient.oauth2Login(
            endpoint: AppConfig.API.Endpoints.login,
            username: email,
            password: password
        )
        .flatMap { (tokenResponse: Token) -> AnyPublisher<User, APIError> in
            print("🎫 AuthManager: Received OAuth2 token, fetching user profile")
            // Save the token temporarily (we don't have refresh token from OAuth2)
            let jwtToken = JWTToken(
                accessToken: tokenResponse.accessToken,
                refreshToken: "", // OAuth2 doesn't provide refresh token immediately
                expiresIn: 3600 // Default 1 hour
            )
            self.currentToken = jwtToken
            self.isAuthenticated = true
            
            // Save access token to keychain
            _ = self.keychain.saveTokens(
                accessToken: tokenResponse.accessToken,
                refreshToken: ""
            )
            
            // Now fetch the user profile
            return self.apiClient.get(endpoint: AppConfig.API.Endpoints.userProfile)
                .map { (user: User) in
                    print("👤 AuthManager: Successfully fetched user profile for \(user.email)")
                    // Save user info to keychain
                    _ = self.keychain.saveUserInfo(
                        userID: user.id.uuidString,
                        email: user.email
                    )
                    return user
                }
                .eraseToAnyPublisher()
        }
        .eraseToAnyPublisher()
    }
    
    func register(
        email: String,
        password: String,
        displayName: String? = nil
    ) -> AnyPublisher<User, APIError> {
        let request = UserRegistrationRequest(
            email: email,
            password: password,
            displayName: displayName,
            timezone: AppConfig.Constants.defaultTimezone,
            locale: AppConfig.Constants.defaultLocale
        )
        
        print("📝 AuthManager: Starting registration for \(email)")
        return apiClient.post(
            endpoint: AppConfig.API.Endpoints.register,
            body: request,
            requiresAuth: false
        )
        .flatMap { (user: User) -> AnyPublisher<User, APIError> in
            print("✅ AuthManager: Registration successful, now logging in...")
            // After successful registration, automatically log in
            return self.login(email: email, password: password)
        }
        .eraseToAnyPublisher()
    }
    
    func logout() -> AnyPublisher<Void, APIError> {
        return apiClient.post(
            endpoint: AppConfig.API.Endpoints.logout,
            body: nil as String?,
            requiresAuth: true
        )
        .map { (_: [String: String]) in
            self.clearTokens()
            return ()
        }
        .catch { _ in
            // Even if logout request fails, clear local tokens
            self.clearTokens()
            return Just(())
                .setFailureType(to: APIError.self)
                .eraseToAnyPublisher()
        }
        .eraseToAnyPublisher()
    }
    
    // MARK: - Token Validation
    var isTokenValid: Bool {
        guard let token = currentToken else { return false }
        return !token.isExpired
    }
    
    func getValidToken() -> AnyPublisher<String, APIError> {
        guard let token = currentToken else {
            return Fail(error: APIError.unauthorized)
                .eraseToAnyPublisher()
        }
        
        if token.isExpired {
            return refreshToken()
                .map { _ in
                    return self.currentToken?.accessToken ?? ""
                }
                .eraseToAnyPublisher()
        } else if token.isExpiringSoon {
            // Refresh in background but return current token
            refreshToken()
                .sink(
                    receiveCompletion: { _ in },
                    receiveValue: { _ in }
                )
                .store(in: &cancellables)
        }
        
        return Just(token.accessToken)
            .setFailureType(to: APIError.self)
            .eraseToAnyPublisher()
    }
} 