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
        print("🔍 [macOS] loadSavedTokens called - checking keychain...")
        
        guard let accessToken = keychain.getAccessToken(),
              let refreshToken = keychain.getRefreshToken() else {
            print("🔍 [macOS] No saved tokens found")
            print("   - Access token exists: \(keychain.getAccessToken() != nil)")
            print("   - Refresh token exists: \(keychain.getRefreshToken() != nil)")
            return
        }
        
        print("✅ [macOS] Found saved tokens in keychain")
        print("   - Access token preview: \(String(accessToken.prefix(20)))...")
        print("   - Refresh token preview: \(String(refreshToken.prefix(10)))...")
        
        // Create token with a default expiration (will be refreshed if needed)
        let token = JWTToken(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresIn: 3600 // 1 hour default
        )
        
        self.currentToken = token
        
        // Check if token is expired immediately
        if token.isExpired {
            print("⚠️ [macOS] Saved token is expired, clearing credentials")
            clearCredentials()
            return
        }
        
        self.isAuthenticated = true
        print("✅ [macOS] Loaded saved authentication token successfully")
        print("   - isAuthenticated set to: \(isAuthenticated)")
        
        // Check if token needs refresh
        if token.isExpiringSoon {
            print("🔄 [macOS] Token expiring soon, will refresh when needed")
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
    
    func clearCredentials() {
        self.currentToken = nil
        self.isAuthenticated = false
        keychain.clearTokens()
        UserDefaults.standard.removeObject(forKey: "shouldStayLoggedIn")
    }
    
    // MARK: - Token Refresh
    private func refreshTokenIfNeeded() {
        guard let token = currentToken,
              token.isExpiringSoon,
              !token.isExpired else {
            if currentToken?.isExpired == true {
                print("🔄 [macOS] Token expired, clearing credentials")
                clearCredentials()
            }
            return
        }
        
        // Check if we have a refresh token (our OAuth2 flow doesn't provide one)
        if token.refreshToken.isEmpty {
            print("⚠️ [macOS] No refresh token available, user will need to login again when token expires")
            return
        }
        
        refreshToken()
    }
    
    func refreshToken() -> AnyPublisher<Void, APIError> {
        guard let currentToken = currentToken else {
            return Fail(error: APIError.unauthorized)
                .eraseToAnyPublisher()
        }
        
        // Check if we actually have a refresh token
        guard !currentToken.refreshToken.isEmpty else {
            print("❌ [macOS] Cannot refresh token: No refresh token available")
            clearCredentials()
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
            print("❌ [macOS] Token refresh failed: \(error)")
            self.clearCredentials()
            return Fail(error: error)
                .eraseToAnyPublisher()
        }
        .eraseToAnyPublisher()
    }
    
    // MARK: - Authentication Methods
    func login(
        email: String,
        password: String,
        shouldStayLoggedIn: Bool = false
    ) -> AnyPublisher<User, APIError> {
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
            
            // Save the shouldStayLoggedIn preference
            UserDefaults.standard.set(shouldStayLoggedIn, forKey: "shouldStayLoggedIn")
            
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
            self.clearCredentials()
            return ()
        }
        .catch { _ in
            // Even if logout request fails, clear local tokens
            self.clearCredentials()
            return Just(())
                .setFailureType(to: APIError.self)
                .eraseToAnyPublisher()
        }
        .eraseToAnyPublisher()
    }
    
    // MARK: - Token Validation
    
    /// Ensures we have a valid token before making authenticated requests (macOS)
    func ensureValidToken() async throws -> String {
        print("🔍 [macOS] ensureValidToken called - Debug state:")
        print("   - isAuthenticated: \(isAuthenticated)")
        print("   - currentToken exists: \(currentToken != nil)")
        
        // If no token exists, user needs to login
        guard let token = currentToken else {
            print("❌ [macOS] No token available - user needs to login")
            print("   - Keychain access token: \(Keychain.shared.getAccessToken() != nil)")
            print("   - Keychain user ID: \(Keychain.shared.getUserID() != nil)")
            throw APIError.unauthorized
        }
        
        print("   - Token expiry check: expired=\(token.isExpired), expiring_soon=\(token.isExpiringSoon)")
        print("   - Token preview: \(String(token.accessToken.prefix(20)))...")
        
        // If token is expired, clear credentials and require login
        if token.isExpired {
            print("❌ [macOS] Token expired - clearing credentials")
            clearCredentials()
            throw APIError.unauthorized
        }
        
        // If token is expiring soon and we have a refresh token, try to refresh
        if token.isExpiringSoon && !token.refreshToken.isEmpty {
            print("🔄 [macOS] Token expiring soon, attempting refresh...")
            do {
                _ = try await refreshToken().async()
                guard let refreshedToken = currentToken else {
                    print("❌ [macOS] Token refresh succeeded but no token available")
                    throw APIError.unauthorized
                }
                print("✅ [macOS] Token refresh successful")
                return refreshedToken.accessToken
            } catch {
                print("❌ [macOS] Token refresh failed: \(error)")
                clearCredentials()
                throw APIError.unauthorized
            }
        }
        
        // Token is valid, return it
        print("✅ [macOS] Token is valid, returning for use")
        return token.accessToken
    }
    
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

// MARK: - Async/Await Support for macOS
extension AnyPublisher {
    func async() async throws -> Output {
        try await withCheckedThrowingContinuation { continuation in
            var cancellable: AnyCancellable?
            cancellable = self
                .sink(
                    receiveCompletion: { completion in
                        switch completion {
                        case .finished:
                            break
                        case .failure(let error):
                            continuation.resume(throwing: error)
                        }
                        cancellable?.cancel()
                    },
                    receiveValue: { value in
                        continuation.resume(returning: value)
                        cancellable?.cancel()
                    }
                )
        }
    }
} 