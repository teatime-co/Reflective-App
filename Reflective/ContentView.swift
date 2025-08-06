//
//  ContentView.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import SwiftUI
import CoreData

struct ContentView: View {
    @Environment(\.managedObjectContext) private var viewContext: NSManagedObjectContext
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        Group {
            switch authViewModel.authState {
            case .idle, .loading:
                LoadingView()
            case .unauthenticated, .error:
                LoginView()
            case .authenticated(let user):
                MainAppView(user: user)
            }
        }
        .frame(minWidth: AppConfig.Constants.minWindowWidth, 
               minHeight: AppConfig.Constants.minWindowHeight)
    }
}

struct LoadingView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "book.pages")
                .font(.system(size: 60))
                .foregroundColor(.blue)
            
            Text("Reflective")
                .font(.system(size: 24, weight: .light, design: .serif))
                .foregroundColor(.primary)
            
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .blue))
                .scaleEffect(1.2)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.windowBackgroundColor))
    }
}

struct MainAppView: View {
    let user: User
    @EnvironmentObject var authViewModel: AuthViewModel
    
    var body: some View {
        NavigationSplitView {
            SidebarView()
        } detail: {
            // Main content area - placeholder for now
            VStack {
                Text("Welcome, \(user.displayName ?? user.email)!")
                    .font(.title)
                    .padding()
                
                Text("This is where the main journaling interface will be.")
                    .foregroundColor(.secondary)
                    .padding()
                
                Button("Logout") {
                    authViewModel.logout()
                }
                .buttonStyle(.bordered)
                .padding()
                
                Spacer()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(.controlBackgroundColor))
            .navigationTitle("Journal")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: {
                        // New entry action - will be implemented in Phase 2
                    }) {
                        Image(systemName: "plus")
                    }
                    .help("New Entry")
                }
            }
        }
        .navigationSplitViewStyle(.balanced)
    }
}

struct SidebarView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    
    var body: some View {
        List {
            Section("Journal") {
                NavigationLink(destination: Text("Entries View")) {
                    Label("Entries", systemImage: "doc.text")
                }
                
                NavigationLink(destination: Text("New Entry View")) {
                    Label("New Entry", systemImage: "plus.circle")
                }
            }
            
            Section("Organize") {
                NavigationLink(destination: Text("Tags View")) {
                    Label("Tags", systemImage: "tag")
                }
                
                NavigationLink(destination: Text("Search View")) {
                    Label("Search", systemImage: "magnifyingglass")
                }
            }
            
            Section("Insights") {
                NavigationLink(destination: Text("Analytics View")) {
                    Label("Analytics", systemImage: "chart.line.uptrend.xyaxis")
                }
                
                NavigationLink(destination: Text("Themes View")) {
                    Label("Themes", systemImage: "brain.head.profile")
                }
            }
            
            Section("Settings") {
                NavigationLink(destination: Text("Preferences View")) {
                    Label("Preferences", systemImage: "gear")
                }
                
                Button(action: {
                    authViewModel.logout()
                }) {
                    Label("Logout", systemImage: "rectangle.portrait.and.arrow.right")
                        .foregroundColor(.red)
                }
                .buttonStyle(.plain)
            }
        }
        .listStyle(.sidebar)
        .frame(minWidth: AppConfig.Constants.sidebarWidth)
        .navigationTitle("Reflective")
    }
}

#Preview {
    ContentView()
        .environment(\.managedObjectContext, CoreDataStack.preview.container.viewContext)
        .environmentObject(AuthViewModel())
}
