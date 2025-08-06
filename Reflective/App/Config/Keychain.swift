//
//  Keychain.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import Foundation
import Security

class Keychain {
    
    static let shared = Keychain()
    
    private init() {}
    
    private let service = "com.reflective.app"
    
    // MARK: - Keys
    struct Keys {
        static let accessToken = "access_token"
        static let refreshToken = "refresh_token"
        static let userID = "user_id"
        static let userEmail = "user_email"
    }
    
    // MARK: - Save Data
    func save(_ data: Data, for key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]
        
        // Delete existing item
        SecItemDelete(query as CFDictionary)
        
        // Add new item
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    func save(_ string: String, for key: String) -> Bool {
        guard let data = string.data(using: .utf8) else { return false }
        return save(data, for: key)
    }
    
    // MARK: - Load Data
    func load(key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess {
            return result as? Data
        }
        return nil
    }
    
    func loadString(key: String) -> String? {
        guard let data = load(key: key) else { return nil }
        return String(data: data, encoding: .utf8)
    }
    
    // MARK: - Delete Data
    func delete(key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess
    }
    
    // MARK: - Token Management
    func saveTokens(accessToken: String, refreshToken: String) -> Bool {
        let accessResult = save(accessToken, for: Keys.accessToken)
        let refreshResult = save(refreshToken, for: Keys.refreshToken)
        return accessResult && refreshResult
    }
    
    func getAccessToken() -> String? {
        return loadString(key: Keys.accessToken)
    }
    
    func getRefreshToken() -> String? {
        return loadString(key: Keys.refreshToken)
    }
    
    func clearTokens() {
        delete(key: Keys.accessToken)
        delete(key: Keys.refreshToken)
        delete(key: Keys.userID)
        delete(key: Keys.userEmail)
    }
    
    // MARK: - User Info
    func saveUserInfo(userID: String, email: String) -> Bool {
        let userIDResult = save(userID, for: Keys.userID)
        let emailResult = save(email, for: Keys.userEmail)
        return userIDResult && emailResult
    }
    
    func getUserID() -> String? {
        return loadString(key: Keys.userID)
    }
    
    func getUserEmail() -> String? {
        return loadString(key: Keys.userEmail)
    }
} 