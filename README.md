# Reflective - macOS Client

A beautiful, native macOS journaling application built with SwiftUI, featuring AI-powered insights, semantic search, and thoughtful writing tools.

## 🚀 Overview

Reflective is a sophisticated journaling application designed for macOS that combines the simplicity of traditional journaling with modern AI capabilities. The app provides a distraction-free writing environment while offering powerful features for reflection, discovery, and personal growth.

### **Key Features**
- **Native macOS Experience**: Built with SwiftUI for macOS 15.0+
- **AI-Powered Insights**: Theme detection and linguistic analysis
- **Semantic Search**: Find entries by meaning, not just keywords
- **Smart Organization**: Automatic tag extraction and theme classification
- **Privacy-First**: Offline-capable with optional cloud sync
- **Beautiful Interface**: Clean, minimalist design focused on writing

## 📱 Platform Details

- **Target Platform**: macOS
- **Minimum Version**: macOS 15.0
- **Framework**: SwiftUI with AppKit integration
- **Architecture**: Apple Silicon + Intel
- **Data Storage**: Core Data with CloudKit sync

## 🏗️ Architecture

### **Tech Stack**
- **UI Framework**: SwiftUI (primary), AppKit (advanced text editing)
- **Data Layer**: Core Data for local persistence
- **Networking**: URLSession with custom API client
- **Authentication**: JWT tokens with Keychain storage
- **Design Pattern**: MVVM (Model-View-ViewModel)
- **Reactive Programming**: Combine framework

### **Project Structure**
```
Reflective/
├── App/
│   ├── Config/
│   │   ├── AppConfig.swift           # App constants and configuration
│   │   ├── Environment.swift         # Development/Production settings
│   │   └── Keychain.swift           # Secure token storage
│   ├── Extensions/                   # Swift extensions
│   └── Resources/                    # Assets and localization
├── Models/
│   ├── User.swift                   # User data model
│   ├── JournalEntry.swift           # Journal entry model
│   ├── Tag.swift                    # Tag management model
│   ├── Auth.swift                   # Authentication models
│   └── EditorMode.swift             # Editor state model
├── Views/
│   ├── Authentication/
│   │   ├── LoginView.swift          # User login interface
│   │   └── RegisterView.swift       # User registration
│   ├── Journal/
│   │   ├── EntryListView.swift      # Journal entries list
│   │   ├── EntryDetailView.swift    # Entry reading view
│   │   ├── EntryEditorView.swift    # Rich text editor
│   │   └── Components/              # Reusable UI components
│   └── Shared/                      # Common UI elements
├── ViewModels/
│   ├── AuthViewModel.swift          # Authentication state
│   ├── JournalViewModel.swift       # Journal management
│   └── EntryEditorViewModel.swift   # Editor functionality
├── Services/
│   ├── JournalService.swift         # Entry management (23KB)
│   ├── TagService.swift             # Tag operations (11KB)
│   ├── ThemeService.swift           # AI theme detection (14KB)
│   ├── LinguisticService.swift      # Text analysis (16KB)
│   ├── AIFeaturesService.swift      # AI integration (13KB)
│   ├── CoreDataManager.swift        # Data persistence (31KB)
│   └── NavigationManager.swift      # App navigation
├── Networking/
│   ├── APIClient.swift              # Main API client (11KB)
│   ├── AuthManager.swift            # Authentication handling (12KB)
│   └── Endpoints/                   # API endpoint definitions
└── Utilities/
    ├── TextProcessing/              # Rich text utilities
    ├── Export/                      # Data export functionality
    └── Helpers/                     # Common utilities
```

## 📋 Current Implementation Status

### ✅ **Fully Implemented Features**

#### **Authentication System**
- **User Registration & Login**: Complete authentication flow
- **JWT Token Management**: Secure token storage with Keychain
- **Session Management**: Automatic token refresh and logout
- **Form Validation**: Real-time validation for user inputs

#### **Core Journaling Platform**
- **Rich Text Editor**: Advanced text editing with formatting
- **Entry Management**: Full CRUD operations for journal entries
- **Auto-save Functionality**: Automatic saving with conflict resolution
- **Entry Organization**: List view with sorting and filtering

#### **Tag System**
- **Hashtag Extraction**: Automatic tag creation from content
- **Tag Management**: Create, edit, and organize tags
- **Color Coding**: Visual tag organization
- **Tag-based Filtering**: Filter entries by tags

#### **User Interface**
- **Native macOS Design**: Follows macOS Human Interface Guidelines
- **Responsive Layout**: Adaptive interface for different window sizes
- **Dark/Light Mode**: Automatic theme switching
- **Accessibility**: VoiceOver and keyboard navigation support

### 🔄 **Backend Integration Status**

#### **Implemented API Integrations**
- ✅ **Authentication**: Login, register, token refresh
- ✅ **User Management**: Profile and preferences
- ✅ **Journal Entries**: Complete CRUD operations
- ✅ **Tag Management**: Tag creation and organization
- 🔶 **Advanced Features**: Partial integration (themes, linguistic analysis)

#### **Service Layer Implementation**
- ✅ **JournalService**: Complete entry management (23KB)
- ✅ **TagService**: Full tag functionality (11KB)
- ✅ **ThemeService**: AI theme detection setup (14KB)
- ✅ **LinguisticService**: Text analysis integration (16KB)
- ✅ **AIFeaturesService**: AI features coordination (13KB)
- ✅ **CoreDataManager**: Comprehensive data management (31KB)

### 🔶 **In Progress Features**

#### **AI-Powered Features**
- **Theme Detection**: UI ready, backend integration in progress
- **Linguistic Analytics**: Service layer complete, UI in development
- **Semantic Search**: Backend ready, client implementation needed
- **Writing Session Tracking**: Basic implementation, needs enhancement

### ❌ **Planned Features**

#### **Advanced Functionality**
- **Analytics Dashboard**: Writing insights and statistics
- **Search Interface**: Semantic search UI
- **Export/Import**: Data portability features
- **Preferences**: Advanced settings and customization
- **Notifications**: Writing reminders and insights

## 🚦 Getting Started

### **Prerequisites**
- **Xcode 15.0+**
- **macOS 15.0+** (for development)
- **Active Reflective Server**: Backend must be running

### **Installation**

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd reflective-app/Reflective
   ```

2. **Open in Xcode**
   ```bash
   open Reflective.xcodeproj
   ```

3. **Configure Backend Connection**
   
   Update `AppConfig.swift` with your server details:
   ```swift
   struct APIConfig {
       static let baseURL = "http://localhost:8000/api"
       static let timeout: TimeInterval = 30.0
   }
   ```

4. **Build and Run**
   - Select your target device/simulator
   - Press `Cmd+R` to build and run
   - The app will launch with the login screen

### **Development Setup**

1. **Core Data Setup**
   - The Core Data model is pre-configured
   - Automatic lightweight migrations enabled
   - CloudKit sync ready (optional)

2. **API Configuration**
   - Development vs Production endpoints
   - Authentication token management
   - Network request logging (debug builds)

## 🔧 Configuration

### **App Configuration**
```swift
// AppConfig.swift
struct AppConfig {
    struct Constants {
        static let minWindowWidth: CGFloat = 800
        static let minWindowHeight: CGFloat = 600
        static let maxWindowWidth: CGFloat = 1400
        static let maxWindowHeight: CGFloat = 1000
    }
    
    struct API {
        static let baseURL = "http://localhost:8000/api"
        static let timeout: TimeInterval = 30.0
    }
}
```

### **Core Data Configuration**
- **Local Storage**: SQLite database
- **CloudKit Sync**: Optional (can be enabled)
- **Automatic Migrations**: Lightweight migrations supported
- **Background Sync**: Efficient data synchronization

### **Security Configuration**
- **Keychain Integration**: Secure token storage
- **Certificate Pinning**: Available for production
- **Data Encryption**: Core Data encryption ready

## 📱 User Experience

### **Main Interface**
- **Sidebar Navigation**: Quick access to entries, tags, and features
- **Entry List**: Chronological or filtered view of entries
- **Editor Pane**: Rich text editing with live preview
- **Status Bar**: Word count, session info, sync status

### **Writing Experience**
- **Distraction-Free Mode**: Focus on writing
- **Real-time Word Count**: Track writing progress
- **Auto-save**: Never lose your thoughts
- **Tag Suggestions**: Smart hashtag completion

### **AI Features**
- **Theme Detection**: Automatic categorization of entries
- **Sentiment Analysis**: Mood tracking over time
- **Writing Insights**: Growth and pattern analysis
- **Smart Search**: Find entries by meaning

## 🚀 Deployment

### **Development Builds**
- **Debug Configuration**: Full logging and debug features
- **Local Backend**: Connect to local development server
- **Hot Reload**: Automatic refresh during development

### **Production Builds**
- **Release Configuration**: Optimized performance
- **Production Backend**: Secure API endpoints
- **App Store Ready**: Code signing and sandboxing

### **Distribution**
- **macOS App Store**: Ready for submission
- **Direct Distribution**: Developer ID signed
- **Enterprise**: Custom deployment options

## 🔮 Roadmap

### **Phase 1: Core Completion** (In Progress)
- ✅ Authentication and user management
- ✅ Basic journaling functionality
- 🔄 Advanced AI feature integration
- 🔄 Search interface implementation

### **Phase 2: Advanced Features** (Next)
- 📊 Analytics dashboard
- 🔍 Advanced search and filtering
- 📤 Export/import functionality
- ⚙️ Comprehensive preferences

### **Phase 3: Enhancement** (Future)
- 🌐 Enhanced cloud sync
- 📱 Companion iOS app
- 🔗 Third-party integrations
- 🎨 Advanced customization

## 🎨 Design Philosophy

### **Core Principles**
- **Simplicity**: Clean, uncluttered interface
- **Focus**: Distraction-free writing environment
- **Intelligence**: AI that enhances, doesn't interfere
- **Privacy**: User data ownership and control

### **macOS Integration**
- **Native Feel**: Follows macOS design patterns
- **Keyboard Shortcuts**: Full keyboard navigation
- **Menu Bar**: Native macOS menu integration
- **Window Management**: Proper window behavior

## 🤝 Contributing

### **Development Guidelines**
1. Follow SwiftUI best practices
2. Maintain MVVM architecture
3. Write comprehensive tests
4. Document new features
5. Follow Apple's Human Interface Guidelines

### **Code Style**
- Use SwiftLint for consistency
- Follow Swift API Design Guidelines
- Comprehensive code documentation
- Clear naming conventions

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions
- **Documentation**: In-app help and guides

---

**Built with ❤️ for mindful journaling and personal growth**

*Reflective helps you capture thoughts, discover patterns, and grow through the power of reflection.* 