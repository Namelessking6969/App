import SwiftUI

struct TabBarView: View {
    @ObservedObject var terminalManager: TerminalManager
    @ObservedObject private var settings = Settings.shared
    @State private var hoveredTabIndex: Int?
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(terminalManager.tabs.enumerated()), id: \.element.id) { index, tab in
                TabItemView(
                    tab: tab,
                    isActive: index == terminalManager.activeTabIndex,
                    isHovered: hoveredTabIndex == index
                )
                .onTapGesture {
                    terminalManager.activeTabIndex = index
                }
                .onHover { isHovered in
                    hoveredTabIndex = isHovered ? index : nil
                }
            }
            
            Spacer()
            
            Button(action: {
                terminalManager.addTab()
            }) {
                Image(systemName: "plus")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Color(hex: Settings.shared.theme.foreground).opacity(0.6))
                    .frame(width: 30, height: 30)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 8)
        }
        .padding(.horizontal, 8)
        .frame(height: 38)
        .background(Color(hex: Settings.shared.theme.background).opacity(0.95))
    }
}

struct TabItemView: View {
    @ObservedObject var tab: TerminalTab
    @ObservedObject private var settings = Settings.shared
    let isActive: Bool
    let isHovered: Bool
    
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "terminal.fill")
                .font(.system(size: 12))
                .foregroundColor(isActive ? Color(hex: Settings.shared.theme.cursor) : Color(hex: Settings.shared.theme.foreground).opacity(0.5))
            
            Text(tab.title)
                .font(.system(size: 12, weight: isActive ? .medium : .regular))
                .foregroundColor(Color(hex: Settings.shared.theme.foreground))
                .lineLimit(1)
                .frame(maxWidth: 100)
            
            if isHovered || isActive {
                Button(action: {
                    if let index = terminalManager.tabs.firstIndex(where: { $0.id == tab.id }) {
                        terminalManager.closeTab(at: index)
                    }
                }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color(hex: Settings.shared.theme.foreground).opacity(0.6))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            VStack {
                Spacer()
                if isActive {
                    Rectangle()
                        .fill(Color(hex: Settings.shared.theme.cursor))
                        .frame(height: 2)
                } else if isHovered {
                    Rectangle()
                        .fill(Color(hex: Settings.shared.theme.foreground).opacity(0.1))
                        .frame(height: 2)
                }
            }
        )
    }
}

private var terminalManager: TerminalManager {
    TerminalManager()
}