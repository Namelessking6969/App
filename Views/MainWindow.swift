import SwiftUI
import AppKit

struct MainWindowView: View {
    @StateObject private var terminalManager = TerminalManager()
    @ObservedObject private var settings = Settings.shared
    @State private var showCommandPalette = false
    @State private var showSearch = false
    
    var body: some View {
        VStack(spacing: 0) {
            TabBarView(terminalManager: terminalManager)
            
            ZStack {
                if let activeSession = terminalManager.activeSession {
                    TerminalContainerView(session: activeSession, terminalManager: terminalManager)
                } else {
                    EmptyStateView {
                        terminalManager.addTab()
                    }
                }
                
                if showCommandPalette {
                    CommandPaletteView(isPresented: $showCommandPalette, terminalManager: terminalManager)
                }
                
                if showSearch, let session = terminalManager.activeSession {
                    SearchOverlayView(session: session, isPresented: $showSearch)
                }
            }
            
            if let session = terminalManager.activeSession {
                StatusBarView(session: session)
            }
        }
        .background(Color(hex: Settings.shared.theme.background))
        .onReceive(NotificationCenter.default.publisher(for: .newTab)) { _ in
            terminalManager.addTab()
        }
        .onReceive(NotificationCenter.default.publisher(for: .closeTab)) { _ in
            terminalManager.closeActiveTab()
        }
        .onReceive(NotificationCenter.default.publisher(for: .nextTab)) { _ in
            terminalManager.nextTab()
        }
        .onReceive(NotificationCenter.default.publisher(for: .previousTab)) { _ in
            terminalManager.previousTab()
        }
        .onReceive(NotificationCenter.default.publisher(for: .splitHorizontal)) { _ in
            terminalManager.splitActivePane(direction: .horizontal)
        }
        .onReceive(NotificationCenter.default.publisher(for: .splitVertical)) { _ in
            terminalManager.splitActivePane(direction: .vertical)
        }
        .onReceive(NotificationCenter.default.publisher(for: .clearTerminal)) { _ in
            terminalManager.activeSession?.buffer.clear()
        }
        .onReceive(NotificationCenter.default.publisher(for: .showSearch)) { _ in
            showSearch = true
        }
        .onReceive(NotificationCenter.default.publisher(for: .showCommandPalette)) { _ in
            showCommandPalette = true
        }
    }
}

struct EmptyStateView: View {
    let onNewTab: () -> Void
    @ObservedObject private var settings = Settings.shared

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "terminal.fill")
                .font(.system(size: 60))
                .foregroundColor(Color(hex: Settings.shared.theme.foreground).opacity(0.5))
            
            Text("No Terminal Sessions")
                .font(.title2)
                .foregroundColor(Color(hex: Settings.shared.theme.foreground))
            
            Text("Press ⌘T to create a new tab")
                .font(.subheadline)
                .foregroundColor(Color(hex: Settings.shared.theme.foreground).opacity(0.6))
            
            Button(action: onNewTab) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("New Tab")
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color(hex: Settings.shared.theme.cursor))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}