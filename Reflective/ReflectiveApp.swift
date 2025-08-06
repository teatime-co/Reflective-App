//
//  ReflectiveApp.swift
//  Reflective
//
//  Created by Raffy Castillo on 8/6/25.
//

import SwiftUI

@main
struct ReflectiveApp: App {
    let persistenceController = PersistenceController.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.managedObjectContext, persistenceController.container.viewContext)
        }
    }
}
