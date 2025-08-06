//
//  LoginView.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var showingRegister = false
    @FocusState private var focusedField: Field?
    
    enum Field {
        case email, password
    }
    
    var body: some View {
        GeometryReader { geometry in
            HStack(spacing: 0) {
                // Left side - App branding
                VStack {
                    Spacer()
                    
                    Image(systemName: "book.pages")
                        .font(.system(size: 80))
                        .foregroundColor(.blue)
                        .padding(.bottom, 24)
                    
                    Text("Reflective")
                        .font(.system(size: 48, weight: .light, design: .serif))
                        .foregroundColor(.primary)
                        .padding(.bottom, 8)
                    
                    Text("Your thoughtful journaling companion")
                        .font(.title3)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 40)
                    
                    Spacer()
                }
                .frame(width: geometry.size.width * 0.5)
                .background(Color(.controlBackgroundColor))
                
                // Right side - Login form
                VStack(spacing: 24) {
                    Spacer()
                    
                    VStack(spacing: 32) {
                        // Header
                        VStack(spacing: 8) {
                            Text("Welcome Back")
                                .font(.title)
                                .fontWeight(.semibold)
                            
                            Text("Sign in to continue your journey")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        // Form
                        VStack(spacing: 16) {
                            // Email field
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
                            
                            // Password field
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Password")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(.secondary)
                                
                                SecureField("Enter your password", text: $password)
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
                                        if authViewModel.canLogin {
                                            authViewModel.login(email: email, password: password)
                                        }
                                    }
                            }
                        }
                        
                        // Login button
                        Button(action: {
                            authViewModel.login(email: email, password: password)
                        }) {
                            HStack {
                                if authViewModel.isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(0.8)
                                } else {
                                    Text("Sign In")
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
                        .disabled(!authViewModel.canLogin || email.isEmpty || password.isEmpty)
                        .opacity((!authViewModel.canLogin || email.isEmpty || password.isEmpty) ? 0.6 : 1.0)
                        
                        // Register link
                        HStack {
                            Text("Don't have an account?")
                                .foregroundColor(.secondary)
                            
                            Button("Sign Up") {
                                showingRegister = true
                            }
                            .foregroundColor(.accentColor)
                        }
                        .font(.subheadline)
                    }
                    .frame(maxWidth: 320)
                    
                    Spacer()
                }
                .frame(width: geometry.size.width * 0.5)
                .padding(.horizontal, 40)
            }
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                focusedField = .email
            }
        }
        .alert("Authentication Error", isPresented: authViewModel.showErrorAlert) {
            Button("OK") {
                authViewModel.clearError()
            }
        } message: {
            if let errorMessage = authViewModel.errorMessage {
                Text(errorMessage)
            }
        }
        .sheet(isPresented: $showingRegister) {
            RegisterView()
        }
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthViewModel())
} 