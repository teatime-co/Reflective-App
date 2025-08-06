//
//  RegisterView.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @Environment(\.dismiss) private var dismiss
    
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var displayName = ""
    @FocusState private var focusedField: Field?
    
    enum Field {
        case displayName, email, password, confirmPassword
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Header bar with title and cancel button
            HStack {
                Text("Create Account")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Spacer()
                
                Button("Cancel") {
                    dismiss()
                }
                .buttonStyle(.plain)
                .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.controlBackgroundColor))
            
            Divider()
            
            // Main content
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 16) {
                        Image(systemName: "book.pages")
                            .font(.system(size: 60))
                            .foregroundColor(.accentColor)
                        
                        VStack(spacing: 8) {
                            Text("Start your journaling journey")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.top, 32)
                    
                    // Form
                    VStack(spacing: 20) {
                        // Display Name
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Display Name (Optional)")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                            
                            TextField("How should we address you?", text: $displayName)
                                .textFieldStyle(.plain)
                                .padding(8)
                                .background(Color(.textBackgroundColor))
                                .cornerRadius(6)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 6)
                                        .stroke(Color(.separatorColor), lineWidth: 1)
                                )
                                .focused($focusedField, equals: .displayName)
                                .onSubmit {
                                    focusedField = .email
                                }
                        }
                        
                        // Email
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Email")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                            
                            TextField("Enter your email", text: $email)
                                .textFieldStyle(.plain)
                                .padding(8)
                                .background(Color(.textBackgroundColor))
                                .cornerRadius(6)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 6)
                                        .stroke(Color(.separatorColor), lineWidth: 1)
                                )
                                .focused($focusedField, equals: .email)
                                .onSubmit {
                                    focusedField = .password
                                }
                        }
                        
                        // Password
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Password")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                            
                            SecureField("Create a password", text: $password)
                                .textFieldStyle(.plain)
                                .padding(8)
                                .background(Color(.textBackgroundColor))
                                .cornerRadius(6)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 6)
                                        .stroke(Color(.separatorColor), lineWidth: 1)
                                )
                                .focused($focusedField, equals: .password)
                                .onSubmit {
                                    focusedField = .confirmPassword
                                }
                            
                            Text("Must be at least 6 characters")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        // Confirm Password
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Confirm Password")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                            
                            SecureField("Confirm your password", text: $confirmPassword)
                                .textFieldStyle(.plain)
                                .padding(8)
                                .background(Color(.textBackgroundColor))
                                .cornerRadius(6)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 6)
                                        .stroke(Color(.separatorColor), lineWidth: 1)
                                )
                                .focused($focusedField, equals: .confirmPassword)
                                .onSubmit {
                                    if canRegister {
                                        register()
                                    }
                                }
                            
                            if !confirmPassword.isEmpty && password != confirmPassword {
                                Text("Passwords don't match")
                                    .font(.caption)
                                    .foregroundColor(.red)
                            }
                        }
                    }
                    .frame(maxWidth: 320)
                    
                    // Register button
                    Button(action: register) {
                        HStack {
                            if authViewModel.isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .scaleEffect(0.8)
                            } else {
                                Text("Create Account")
                                    .fontWeight(.medium)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 36)
                        .background(Color.accentColor)
                        .foregroundColor(.white)
                        .cornerRadius(6)
                    }
                    .buttonStyle(.plain)
                    .disabled(!canRegister)
                    .opacity(canRegister ? 1.0 : 0.6)
                    .frame(maxWidth: 320)
                    
                    // Login link
                    HStack {
                        Text("Already have an account?")
                            .foregroundColor(.secondary)
                        
                        Button("Sign In") {
                            dismiss()
                        }
                        .foregroundColor(.accentColor)
                    }
                    .font(.subheadline)
                    .padding(.bottom, 32)
                }
                .padding(.horizontal, 40)
            }
        }
        .frame(width: 500, height: 600)
        .background(Color(.windowBackgroundColor))
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                focusedField = .displayName
            }
        }
        .alert("Registration Error", isPresented: authViewModel.showErrorAlert) {
            Button("OK") {
                authViewModel.clearError()
            }
        } message: {
            if let errorMessage = authViewModel.errorMessage {
                Text(errorMessage)
            }
        }
    }
    
    private var canRegister: Bool {
        return !email.isEmpty &&
               !password.isEmpty &&
               !confirmPassword.isEmpty &&
               password == confirmPassword &&
               password.count >= 6 &&
               authViewModel.canLogin
    }
    
    private func register() {
        let name = displayName.isEmpty ? nil : displayName
        authViewModel.register(email: email, password: password, displayName: name)
    }
}

#Preview {
    RegisterView()
        .environmentObject(AuthViewModel())
} 