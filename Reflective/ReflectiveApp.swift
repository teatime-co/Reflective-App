//
//  ReflectiveApp.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import SwiftUI

@main
struct ReflectiveApp: App {
    let coreDataStack = CoreDataStack.shared
    @StateObject private var authViewModel = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.managedObjectContext, coreDataStack.container.viewContext)
                .environmentObject(authViewModel)
        }
        .windowStyle(.titleBar)
        .windowResizability(.contentSize)
        .commands {
            CommandGroup(after: .appInfo) {
                Button("Preferences...") {
                    // Will be implemented in later phases
                }
                .keyboardShortcut(",", modifiers: .command)
            }
        }
    }
}
