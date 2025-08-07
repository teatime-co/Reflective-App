import SwiftUI

// MARK: - Tag Pill View
struct TagPillView: View {
    let tag: Tag
    let size: TagSize
    let showRemoveButton: Bool
    let onRemove: (() -> Void)?
    
    init(
        tag: Tag,
        size: TagSize = .medium,
        showRemoveButton: Bool = false,
        onRemove: (() -> Void)? = nil
    ) {
        self.tag = tag
        self.size = size
        self.showRemoveButton = showRemoveButton
        self.onRemove = onRemove
    }
    
    var body: some View {
        HStack(spacing: 4) {
            Text(tag.name)
                .font(size.font)
                .lineLimit(1)
            
            if showRemoveButton {
                Button(action: {
                    onRemove?()
                }) {
                    Image(systemName: "xmark")
                        .font(size.removeButtonFont)
                        .foregroundColor(.white.opacity(0.8))
                }
                .buttonStyle(.plain)
                .contentShape(Circle())
            }
        }
        .padding(.horizontal, size.horizontalPadding)
        .padding(.vertical, size.verticalPadding)
        .background(tag.swiftUIColor)
        .foregroundColor(.white)
        .cornerRadius(size.cornerRadius)
        .shadow(color: .black.opacity(0.1), radius: 1, x: 0, y: 1)
    }
}

// MARK: - Tag Size Configuration
enum TagSize {
    case small
    case medium
    case large
    
    var font: Font {
        switch self {
        case .small:
            return .caption2
        case .medium:
            return .caption
        case .large:
            return .footnote
        }
    }
    
    var removeButtonFont: Font {
        switch self {
        case .small:
            return .system(size: 8, weight: .medium)
        case .medium:
            return .system(size: 10, weight: .medium)
        case .large:
            return .system(size: 12, weight: .medium)
        }
    }
    
    var horizontalPadding: CGFloat {
        switch self {
        case .small:
            return 6
        case .medium:
            return 8
        case .large:
            return 10
        }
    }
    
    var verticalPadding: CGFloat {
        switch self {
        case .small:
            return 2
        case .medium:
            return 4
        case .large:
            return 6
        }
    }
    
    var cornerRadius: CGFloat {
        switch self {
        case .small:
            return 8
        case .medium:
            return 10
        case .large:
            return 12
        }
    }
}

// MARK: - Tag Collection View
struct TagCollectionView: View {
    let tags: [Tag]
    let size: TagSize
    let showRemoveButtons: Bool
    let onTagRemove: ((Tag) -> Void)?
    let onTagTap: ((Tag) -> Void)?
    
    init(
        tags: [Tag],
        size: TagSize = .medium,
        showRemoveButtons: Bool = false,
        onTagRemove: ((Tag) -> Void)? = nil,
        onTagTap: ((Tag) -> Void)? = nil
    ) {
        self.tags = tags
        self.size = size
        self.showRemoveButtons = showRemoveButtons
        self.onTagRemove = onTagRemove
        self.onTagTap = onTagTap
    }
    
    var body: some View {
        FlowLayout(spacing: 6) {
            ForEach(tags, id: \.id) { tag in
                TagPillView(
                    tag: tag,
                    size: size,
                    showRemoveButton: showRemoveButtons,
                    onRemove: {
                        onTagRemove?(tag)
                    }
                )
                .onTapGesture {
                    onTagTap?(tag)
                }
            }
        }
    }
}

// MARK: - Flow Layout
struct FlowLayout: Layout {
    let spacing: CGFloat
    
    init(spacing: CGFloat = 8) {
        self.spacing = spacing
    }
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let sizes = subviews.map { $0.sizeThatFits(.unspecified) }
        return calculateSize(sizes: sizes, in: proposal.width ?? .infinity)
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let sizes = subviews.map { $0.sizeThatFits(.unspecified) }
        var currentPosition = CGPoint(x: bounds.minX, y: bounds.minY)
        var maxHeightInRow: CGFloat = 0
        
        for (index, subview) in subviews.enumerated() {
            let size = sizes[index]
            
            // Check if we need to wrap to the next line
            if currentPosition.x + size.width > bounds.maxX && currentPosition.x > bounds.minX {
                currentPosition.x = bounds.minX
                currentPosition.y += maxHeightInRow + spacing
                maxHeightInRow = 0
            }
            
            // Place the subview
            subview.place(
                at: CGPoint(x: currentPosition.x, y: currentPosition.y),
                proposal: ProposedViewSize(size)
            )
            
            // Update position for next subview
            currentPosition.x += size.width + spacing
            maxHeightInRow = max(maxHeightInRow, size.height)
        }
    }
    
    private func calculateSize(sizes: [CGSize], in maxWidth: CGFloat) -> CGSize {
        var currentWidth: CGFloat = 0
        var totalHeight: CGFloat = 0
        var maxHeightInRow: CGFloat = 0
        
        for size in sizes {
            // Check if we need to wrap to the next line
            if currentWidth + size.width > maxWidth && currentWidth > 0 {
                totalHeight += maxHeightInRow + spacing
                currentWidth = 0
                maxHeightInRow = 0
            }
            
            currentWidth += size.width + spacing
            maxHeightInRow = max(maxHeightInRow, size.height)
        }
        
        totalHeight += maxHeightInRow
        
        return CGSize(width: min(currentWidth - spacing, maxWidth), height: totalHeight)
    }
}

// MARK: - Tag Input View
struct TagInputView: View {
    @Binding var tags: [Tag]
    let autoFocus: Bool
    let onTagAdded: (() -> Void)?
    @EnvironmentObject var tagService: TagService
    
    @State private var inputText = ""
    @FocusState private var isInputFocused: Bool
    @State private var isAddingTag = false
    @State private var recentlyAddedTag: Tag?
    
    init(tags: Binding<[Tag]>, autoFocus: Bool = false, onTagAdded: (() -> Void)? = nil) {
        self._tags = tags
        self.autoFocus = autoFocus
        self.onTagAdded = onTagAdded
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Current tags with animation
            if !tags.isEmpty {
                TagCollectionView(
                    tags: tags,
                    size: .medium,
                    showRemoveButtons: true,
                    onTagRemove: { tag in
                        withAnimation(.spring(response: 0.3)) {
                            removeTag(tag)
                        }
                    }
                )
                .transition(.asymmetric(
                    insertion: .scale.combined(with: .opacity),
                    removal: .scale.combined(with: .opacity)
                ))
            }
            
            // Input field with enhanced feedback
            HStack {
                TextField("Add tags...", text: $inputText)
                    .focused($isInputFocused)
                    .onSubmit {
                        addTag()
                    }
                    .disabled(isAddingTag)
                
                if isAddingTag {
                    ProgressView()
                        .scaleEffect(0.8)
                        .transition(.opacity)
                } else if !inputText.isEmpty {
                    Button("Add") {
                        addTag()
                    }
                    .disabled(!TagService.isValidTagName(inputText))
                    .transition(.asymmetric(
                        insertion: .scale.combined(with: .opacity),
                        removal: .opacity
                    ))
                }
            }
            .textFieldStyle(.roundedBorder)
            
            // Success feedback
            if let recentTag = recentlyAddedTag {
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                        .font(.caption)
                    Text("Added '\(recentTag.name)'")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .transition(.asymmetric(
                    insertion: .scale.combined(with: .opacity),
                    removal: .opacity
                ))
            }
            
            // Validation message
            if !inputText.isEmpty, let errorMessage = TagService.getTagNameValidationError(inputText) {
                HStack(spacing: 4) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                        .font(.caption)
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                }
                .transition(.opacity)
            }
            
            // Tag count feedback
            if !tags.isEmpty {
                Text("\(tags.count) tag\(tags.count == 1 ? "" : "s") added")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .transition(.opacity)
            }
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: tags.count)
        .animation(.easeInOut(duration: 0.2), value: isAddingTag)
        .animation(.easeInOut(duration: 0.2), value: recentlyAddedTag?.id)
        .onChange(of: autoFocus) { _, shouldFocus in
            if shouldFocus {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    isInputFocused = true
                }
            }
        }
    }
    
    private func addTag() {
        let trimmedText = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        
        print("🏷️ Attempting to add tag: '\(trimmedText)'")
        print("🏷️ Current tags count: \(tags.count)")
        print("🏷️ Is valid name: \(TagService.isValidTagName(trimmedText))")
        
        guard !trimmedText.isEmpty else {
            print("❌ Tag name is empty")
            return
        }
        
        guard TagService.isValidTagName(trimmedText) else {
            print("❌ Tag name is invalid: \(TagService.getTagNameValidationError(trimmedText) ?? "Unknown error")")
            return
        }
        
        guard !tags.contains(where: { $0.name.lowercased() == trimmedText.lowercased() }) else {
            print("❌ Tag already exists")
            return
        }
        
        print("✅ Tag validation passed, attempting to create...")
        
        withAnimation(.easeInOut(duration: 0.2)) {
            isAddingTag = true
            recentlyAddedTag = nil
        }
        
        Task {
            do {
                print("🔄 Calling tagService.getOrCreateTag...")
                let newTag = try await tagService.getOrCreateTag(name: trimmedText)
                print("✅ Tag created successfully: \(newTag.name) (ID: \(newTag.id))")
                
                await MainActor.run {
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                        tags.append(newTag)
                        inputText = ""
                        isAddingTag = false
                        recentlyAddedTag = newTag
                        print("✅ Tag added to local array. New count: \(tags.count)")
                    }
                    
                    // Notify parent that a tag was added
                    onTagAdded?()
                    
                    // Keep focus on input field for continuous tag entry
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        isInputFocused = true
                    }
                    
                    // Clear success message after 3 seconds
                    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                        withAnimation(.easeOut(duration: 0.3)) {
                            if recentlyAddedTag?.id == newTag.id {
                                recentlyAddedTag = nil
                            }
                        }
                    }
                }
            } catch {
                print("❌ Failed to create tag: \(error)")
                await MainActor.run {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isAddingTag = false
                    }
                }
            }
        }
    }
    
    private func removeTag(_ tag: Tag) {
        tags.removeAll { $0.id == tag.id }
        
        // Clear success message if the removed tag was recently added
        if recentlyAddedTag?.id == tag.id {
            recentlyAddedTag = nil
        }
    }
}

// MARK: - Preview
#Preview("Tag Pill") {
    VStack(spacing: 16) {
        TagPillView(
            tag: Tag(name: "work", color: "#FF6B6B"),
            size: .small
        )
        
        TagPillView(
            tag: Tag(name: "personal", color: "#4ECDC4"),
            size: .medium
        )
        
        TagPillView(
            tag: Tag(name: "reflection", color: "#45B7D1"),
            size: .large,
            showRemoveButton: true,
            onRemove: { print("Remove tapped") }
        )
    }
    .padding()
}

#Preview("Tag Collection") {
    TagCollectionView(
        tags: [
            Tag(name: "work", color: "#FF6B6B"),
            Tag(name: "personal", color: "#4ECDC4"),
            Tag(name: "reflection", color: "#45B7D1"),
            Tag(name: "goals", color: "#96CEB4"),
            Tag(name: "gratitude", color: "#FECA57")
        ],
        size: .medium,
        showRemoveButtons: true,
        onTagRemove: { tag in
            print("Remove tag: \(tag.name)")
        }
    )
    .padding()
} 