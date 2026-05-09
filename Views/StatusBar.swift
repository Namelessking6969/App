import SwiftUI

struct StatusBarView: View {
    @ObservedObject var session: TerminalSession
    @ObservedObject private var settings = Settings.shared

    var body: some View {
        HStack(spacing: 16) {
            HStack(spacing: 8) {
                Image(systemName: "folder.fill")
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: Settings.shared.theme.foreground).opacity(0.6))
                
                Text(currentDirectory)
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundColor(Color(hex: Settings.shared.theme.foreground).opacity(0.8))
                    .lineLimit(1)
            }
            
            Spacer()
            
            HStack(spacing: 12) {
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color(hex: Settings.shared.theme.green))
                        .frame(width: 8, height: 8)
                    
                    Text("\(session.buffer.columns)x\(session.buffer.rows)")
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(Color(hex: Settings.shared.theme.foreground).opacity(0.6))
                }
                
                HStack(spacing: 4) {
                    Image(systemName: "terminal.fill")
                        .font(.system(size: 10))
                        .foregroundColor(Color(hex: Settings.shared.theme.cyan))
                    
                    Text("zsh")
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(Color(hex: Settings.shared.theme.foreground).opacity(0.6))
                }
            }
        }
        .padding(.horizontal, 12)
        .frame(height: 24)
        .background(
            LinearGradient(
                colors: [
                    Color(hex: Settings.shared.theme.background).opacity(0.9),
                    Color(hex: Settings.shared.theme.black).opacity(0.3)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }
    
    private var currentDirectory: String {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        let path = NSHomeDirectory()
        if path == home {
            return "~"
        } else if path.hasPrefix(home) {
            return "~" + path.dropFirst(home.count)
        }
        return path
    }
}