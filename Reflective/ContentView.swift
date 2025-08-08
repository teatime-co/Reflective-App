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
    @StateObject private var journalService = JournalService.shared
    @StateObject private var tagService = TagService.shared

    var body: some View {
        Group {
            switch authViewModel.authState {
            case .idle, .loading:
                LoadingView()
            case .unauthenticated, .error:
                LoginView()
            case .authenticated(let user):
                MainAppView(user: user)
                    .environmentObject(journalService)
                    .environmentObject(tagService)
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
    @EnvironmentObject var journalService: JournalService
    @EnvironmentObject var tagService: TagService
    @StateObject private var navigationManager = NavigationManager.shared
    
    var body: some View {
        NavigationSplitView {
            SidebarView()
                .environmentObject(navigationManager)
        } detail: {
            // Detail view based on selected destination
            destinationView
        }
        .navigationSplitViewStyle(.balanced)
    }
    
    @ViewBuilder
    private var destinationView: some View {
        switch navigationManager.selectedDestination {
        case .entries:
            EntryListView()
                .environmentObject(navigationManager)
        case .editor(let mode):
            EntryEditorView(mode: mode)
                .environmentObject(navigationManager)
        case .tags:
            Text("Tags Management View - Coming Soon")
        case .search:
            SearchView()
                .environmentObject(navigationManager)
        case .analytics:
            Text("Analytics View - Coming Soon")
        case .themes:
            Text("Themes View - Coming Soon")
        }
    }
}

struct SidebarView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var navigationManager: NavigationManager

    var body: some View {
        List(selection: .constant(navigationManager.selectedDestination)) {
            Section("Journal") {
                SidebarNavigationItem(
                    destination: .entries,
                    label: "Entries",
                    systemImage: "doc.text"
                )
                
                SidebarNavigationItem(
                    destination: .editor(mode: .create),
                    label: "Editor",
                    systemImage: "pencil"
                )
            }
            
            Section("Organize") {
                SidebarNavigationItem(
                    destination: .tags,
                    label: "Tags",
                    systemImage: "tag"
                )
                
                SidebarNavigationItem(
                    destination: .search,
                    label: "Search",
                    systemImage: "magnifyingglass"
                )
            }
            
            Section("Insights") {
                SidebarNavigationItem(
                    destination: .analytics,
                    label: "Analytics",
                    systemImage: "chart.line.uptrend.xyaxis"
                )
                
                SidebarNavigationItem(
                    destination: .themes,
                    label: "Themes",
                    systemImage: "brain.head.profile"
                )
            }
            
            Section("Settings") {
                Button(action: {
                    // Will be implemented in later phases
                }) {
                    Label("Preferences", systemImage: "gear")
                }
                .buttonStyle(.plain)
                
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

struct SidebarNavigationItem: View {
    let destination: NavigationDestination
    let label: String
    let systemImage: String
    
    @EnvironmentObject var navigationManager: NavigationManager
    
    var isSelected: Bool {
        switch (navigationManager.selectedDestination, destination) {
        case (.entries, .entries), (.tags, .tags), (.search, .search), (.analytics, .analytics), (.themes, .themes):
            return true
        case (.editor, .editor):
            return true
        default:
            return false
        }
    }
    
    var body: some View {
        Button(action: {
            navigationManager.attemptNavigation(to: destination)
        }) {
            HStack {
                Label(label, systemImage: systemImage)
                    .foregroundColor(isSelected ? .accentColor : .primary)
                Spacer()
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .listRowBackground(isSelected ? Color.accentColor.opacity(0.1) : Color.clear)
    }
}

#Preview {
    ContentView()
        .environment(\.managedObjectContext, CoreDataStack.preview.container.viewContext)
        .environmentObject(AuthViewModel())
}
