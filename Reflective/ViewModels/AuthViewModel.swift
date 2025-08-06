//
//  AuthViewModel.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation
import Combine
import SwiftUI

class AuthViewModel: ObservableObject {
    @Published var authState: AuthState = .idle
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private var cancellables = Set<AnyCancellable>()
    private let authManager = AuthManager.shared
    
    init() {
        setupBindings()
        checkAuthenticationStatus()
    }
    
    private func setupBindings() {
        // Listen to auth manager changes
        authManager.$isAuthenticated
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isAuthenticated in
                if isAuthenticated {
                    // Only fetch current user if we're not already in an active auth flow
                    if case .loading = self?.authState {
                        // Don't fetch user during login/registration - let the completion handler handle it
                        return
                    }
                    self?.fetchCurrentUser()
                } else {
                    self?.authState = .unauthenticated
                    self?.currentUser = nil
                }
            }
            .store(in: &cancellables)
    }
    
    private func checkAuthenticationStatus() {
        if authManager.isAuthenticated && authManager.isTokenValid {
            fetchCurrentUser()
        } else {
            authState = .unauthenticated
        }
    }
    
    // MARK: - Authentication Actions
    func login(email: String, password: String) {
        guard !email.isEmpty && !password.isEmpty else {
            errorMessage = "Please enter both email and password"
            return
        }
        
        print("🔐 AuthViewModel: Starting login for \(email)")
        isLoading = true
        errorMessage = nil
        authState = .loading
        
        authManager.login(email: email, password: password)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoading = false
                    switch completion {
                    case .failure(let error):
                        print("❌ AuthViewModel: Login failed with error: \(error)")
                        self?.errorMessage = error.localizedDescription
                        self?.authState = .error(error.localizedDescription)
                    case .finished:
                        print("✅ AuthViewModel: Login completed successfully")
                        break
                    }
                },
                receiveValue: { [weak self] user in
                    print("👤 AuthViewModel: Received user: \(user.email)")
                    self?.currentUser = user
                    self?.authState = .authenticated(user)
                    self?.errorMessage = nil
                }
            )
            .store(in: &cancellables)
    }
    
    func register(email: String, password: String, displayName: String? = nil) {
        guard !email.isEmpty && !password.isEmpty else {
            errorMessage = "Please enter both email and password"
            return
        }
        
        guard isValidEmail(email) else {
            errorMessage = "Please enter a valid email address"
            return
        }
        
        guard password.count >= 6 else {
            errorMessage = "Password must be at least 6 characters long"
            return
        }
        
        print("📝 AuthViewModel: Starting registration for \(email)")
        isLoading = true
        errorMessage = nil
        authState = .loading
        
        authManager.register(email: email, password: password, displayName: displayName)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoading = false
                    switch completion {
                    case .failure(let error):
                        print("❌ AuthViewModel: Registration failed with error: \(error)")
                        self?.errorMessage = error.localizedDescription
                        self?.authState = .error(error.localizedDescription)
                    case .finished:
                        print("✅ AuthViewModel: Registration completed successfully")
                        break
                    }
                },
                receiveValue: { [weak self] user in
                    print("👤 AuthViewModel: Registration successful for user: \(user.email)")
                    self?.currentUser = user
                    self?.authState = .authenticated(user)
                    self?.errorMessage = nil
                }
            )
            .store(in: &cancellables)
    }
    
    func logout() {
        isLoading = true
        
        authManager.logout()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoading = false
                    // Always clear state regardless of API response
                    self?.authState = .unauthenticated
                    self?.currentUser = nil
                    self?.errorMessage = nil
                },
                receiveValue: { _ in }
            )
            .store(in: &cancellables)
    }
    
    private func fetchCurrentUser() {
        guard authManager.isTokenValid else {
            authState = .unauthenticated
            return
        }
        
        APIClient.shared.get(endpoint: AppConfig.API.Endpoints.userProfile)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    switch completion {
                    case .failure(let error):
                        self?.errorMessage = error.localizedDescription
                        self?.authState = .error(error.localizedDescription)
                    case .finished:
                        break
                    }
                },
                receiveValue: { [weak self] (user: User) in
                    self?.currentUser = user
                    self?.authState = .authenticated(user)
                }
            )
            .store(in: &cancellables)
    }
    
    // MARK: - Utility Methods
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
    
    func clearError() {
        errorMessage = nil
        if case .error = authState {
            authState = .idle
        }
    }
    
    // MARK: - Computed Properties
    var isAuthenticated: Bool {
        if case .authenticated = authState {
            return true
        }
        return false
    }
    
    var canLogin: Bool {
        return !isLoading && !isCurrentlyLoading
    }
    
    private var isCurrentlyLoading: Bool {
        if case .loading = authState {
            return true
        }
        return false
    }
    
    var showErrorAlert: Binding<Bool> {
        Binding(
            get: { self.errorMessage != nil },
            set: { _ in self.clearError() }
        )
    }
} 