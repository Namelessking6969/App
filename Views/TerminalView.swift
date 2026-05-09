import SwiftUI
import AppKit

struct TerminalContainerView: View {
    @ObservedObject var session: TerminalSession
    @ObservedObject var terminalManager: TerminalManager
    
    var body: some View {
        if let tab = terminalManager.activeTab, tab.splitSessions.isEmpty {
            TerminalView(session: session)
        } else if let tab = terminalManager.activeTab {
            SplitPaneView(tab: tab, terminalManager: terminalManager)
        }
    }
}

struct SplitPaneView: View {
    @ObservedObject var tab: TerminalTab
    @ObservedObject var terminalManager: TerminalManager
    
    var body: some View {
        if tab.splitSessions.isEmpty {
            TerminalView(session: tab.session)
        } else {
            let activeSession = tab.activeSplitIndex == 0 ? tab.session : tab.splitSessions[tab.activeSplitIndex - 1]
            TerminalView(session: activeSession)
                .onKeyPress(.leftArrow, modifiers: .command) {
                    tab.activeSplitIndex = max(0, tab.activeSplitIndex - 1)
                    return .handled
                }
                .onKeyPress(.rightArrow, modifiers: .command) {
                    tab.activeSplitIndex = min(tab.splitSessions.count, tab.activeSplitIndex + 1)
                    return .handled
                }
        }
    }
}

struct TerminalView: View {
    @ObservedObject var session: TerminalSession
    @ObservedObject private var settings = Settings.shared
    @State private var showCursor = true
    @State private var selection: NSRange?
    @State private var mouseLocation: CGPoint = .zero
    
    private let cursorBlinkTimer = Timer.publish(every: 0.53, on: .main, in: .common).autoconnect()
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                TerminalTextView(
                    buffer: session.buffer,
                    theme: Settings.shared.theme,
                    fontSize: Settings.shared.fontSize,
                    cursorBlink: Settings.shared.cursorBlink,
                    showCursor: showCursor,
                    selection: selection
                )
                .onAppear {
                    let columns = Int(geometry.size.width / characterWidth())
                    let rows = Int(geometry.size.height / characterHeight())
                    session.resize(columns: columns, rows: rows)
                }
                .onChange(of: geometry.size) { _, newSize in
                    let columns = Int(newSize.width / characterWidth())
                    let rows = Int(newSize.height / characterHeight())
                    session.resize(columns: columns, rows: rows)
                }
            }
            .background(Color(hex: Settings.shared.theme.background))
            .clipped()
        }
        .onReceive(cursorBlinkTimer) { _ in
            if Settings.shared.cursorBlink {
                showCursor.toggle()
            }
        }
    }
    
    private func characterWidth() -> CGFloat {
        let font = NSFont.monospacedSystemFont(ofSize: CGFloat(Settings.shared.fontSize), weight: .regular)
        let attributes: [NSAttributedString.Key: Any] = [.font: font]
        let size = ("M" as NSString).size(withAttributes: attributes)
        return size.width
    }
    
    private func characterHeight() -> CGFloat {
        CGFloat(Settings.shared.fontSize) * 1.2
    }
}

struct TerminalTextView: View {
    let buffer: TerminalBuffer
    let theme: TerminalTheme
    let fontSize: Double
    let cursorBlink: Bool
    let showCursor: Bool
    let selection: NSRange?
    
    var body: some View {
        Canvas { context, size in
            let columns = buffer.columns
            let rows = buffer.rows
            let charWidth = size.width / CGFloat(columns)
            let charHeight = size.height / CGFloat(rows)
            
            let font = NSFont.monospacedSystemFont(ofSize: CGFloat(fontSize), weight: .regular)
            let lineHeight = charHeight
            
            let screen = buffer.getVisibleBuffer()
            
            for (y, row) in screen.enumerated() {
                for (x, cell) in row.enumerated() {
                    let rect = CGRect(
                        x: CGFloat(x) * charWidth,
                        y: CGFloat(y) * lineHeight,
                        width: charWidth,
                        height: lineHeight
                    )
                    
                    let fgColor = getColor(for: cell.foregroundColor, isBackground: false)
                    let bgColor = getColor(for: cell.backgroundColor, isBackground: true)
                    
                    if cell.inverse {
                        context.fill(Path(rect), with: .color(fgColor))
                        
                        let text = String(cell.character)
                        var attrs: [NSAttributedString.Key: Any] = [
                            .font: font,
                            .foregroundColor: bgColor
                        ]
                        if cell.bold {
                            attrs[.font] = NSFont.monospacedSystemFont(ofSize: CGFloat(fontSize), weight: .bold)
                        }
                        context.draw(Text(text), at: CGPoint(x: rect.midX + charWidth/2, y: rect.midY), anchor: .center)
                    } else {
                        context.fill(Path(rect), with: .color(bgColor))
                        
                        let text = String(cell.character)
                        var attrs: [NSAttributedString.Key: Any] = [
                            .font: font,
                            .foregroundColor: fgColor
                        ]
                        if cell.bold {
                            attrs[.font] = NSFont.monospacedSystemFont(ofSize: CGFloat(fontSize), weight: .bold)
                        }
                        
                        let nsString = NSAttributedString(string: text, attributes: attrs)
                        context.draw(nsString, at: CGPoint(x: rect.midX + charWidth/2, y: rect.midY), anchor: .center)
                        
                        if cell.blink && !showCursor {
                            context.fill(Path(rect), with: .color(fgColor.opacity(0.5)))
                        }
                        
                        if cell.underline {
                            let underlinePath = Path { path in
                                path.move(to: CGPoint(x: rect.minX, y: rect.maxY - 2))
                                path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - 2))
                            }
                            context.stroke(underlinePath, with: .color(fgColor), lineWidth: 1)
                        }
                    }
                }
            }
            
            if cursorBlink && showCursor {
                let cursorX = buffer.cursor.x
                let cursorY = buffer.cursor.y
                
                let cursorRect = CGRect(
                    x: CGFloat(cursorX) * charWidth,
                    y: CGFloat(cursorY) * lineHeight,
                    width: charWidth,
                    height: lineHeight
                )
                
                let glowPath = Path(roundedRect: cursorRect.insetBy(dx: -2, dy: -2), cornerRadius: 2)
                context.fill(glowPath, with: .color(Color(hex: theme.cursorGlow)))
                
                context.fill(cursorRect, with: .color(Color(hex: theme.cursor)))
            }
        }
    }
    
    private func getColor(for index: Int, isBackground: Bool) -> Color {
        let colors = theme.ansiColors
        guard index >= 0 && index < colors.count else {
            return Color(hex: isBackground ? theme.background : theme.foreground)
        }
        return Color(hex: colors[index])
    }
}