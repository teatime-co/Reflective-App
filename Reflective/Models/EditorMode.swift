import Foundation

// MARK: - Editor Mode
enum EditorMode: Hashable {
    case create
    case edit(JournalEntry)
    
    var title: String {
        switch self {
        case .create:
            return "New Entry"
        case .edit:
            return "Edit Entry"
        }
    }
    
    var saveButtonTitle: String {
        switch self {
        case .create:
            return "Create"
        case .edit:
            return "Save"
        }
    }
} 