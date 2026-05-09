import Foundation

struct TerminalTheme: Identifiable, Codable, Hashable {
    var id: UUID
    var name: String
    var background: String
    var foreground: String
    var cursor: String
    var cursorGlow: String
    var selection: String
    var black: String
    var red: String
    var green: String
    var yellow: String
    var blue: String
    var magenta: String
    var cyan: String
    var white: String
    var brightBlack: String
    var brightRed: String
    var brightGreen: String
    var brightYellow: String
    var brightBlue: String
    var brightMagenta: String
    var brightCyan: String
    var brightWhite: String
    
    var ansiColors: [String] {
        [black, red, green, yellow, blue, magenta, cyan, white,
         brightBlack, brightRed, brightGreen, brightYellow,
         brightBlue, brightMagenta, brightCyan, brightWhite]
    }
    
    static let neonNight = TerminalTheme(
        id: UUID(uuidString: "00000000-0000-0000-0000-000000000001")!,
        name: "Neon Night",
        background: "#0D0D0D",
        foreground: "#E0E0E0",
        cursor: "#00FF88",
        cursorGlow: "#00FF8880",
        selection: "#00FF8833",
        black: "#1A1A2E",
        red: "#FF6B6B",
        green: "#4ADE80",
        yellow: "#FACC15",
        blue: "#60A5FA",
        magenta: "#C084FC",
        cyan: "#22D3EE",
        white: "#E0E0E0",
        brightBlack: "#4A4A5A",
        brightRed: "#FF8888",
        brightGreen: "#6EE7A0",
        brightYellow: "#FDE547",
        brightBlue: "#93C5FD",
        brightMagenta: "#D8B4FE",
        brightCyan: "#67E8F9",
        brightWhite: "#FFFFFF"
    )
    
    static let arcticIce = TerminalTheme(
        id: UUID(uuidString: "00000000-0000-0000-0000-000000000002")!,
        name: "Arctic Ice",
        background: "#0A1628",
        foreground: "#E8F4F8",
        cursor: "#00D4FF",
        cursorGlow: "#00D4FF80",
        selection: "#00D4FF33",
        black: "#1B2838",
        red: "#FF6B6B",
        green: "#4ADE80",
        yellow: "#FACC15",
        blue: "#60A5FA",
        magenta: "#D8B4FE",
        cyan: "#22D3EE",
        white: "#E8F4F8",
        brightBlack: "#3D5A73",
        brightRed: "#FF8A8A",
        brightGreen: "#6EE7A0",
        brightYellow: "#FDE547",
        brightBlue: "#93C5FD",
        brightMagenta: "#E0C3FC",
        brightCyan: "#67E8F9",
        brightWhite: "#FFFFFF"
    )
    
    static let sunsetGlow = TerminalTheme(
        id: UUID(uuidString: "00000000-0000-0000-0000-000000000003")!,
        name: "Sunset Glow",
        background: "#1A0A0A",
        foreground: "#FFD4A3",
        cursor: "#FF7755",
        cursorGlow: "#FF775580",
        selection: "#FF775533",
        black: "#2D1B1B",
        red: "#FF6B6B",
        green: "#98D977",
        yellow: "#FFD666",
        blue: "#7B9EE8",
        magenta: "#E87FD5",
        cyan: "#7DD3E8",
        white: "#FFD4A3",
        brightBlack: "#5D4040",
        brightRed: "#FF8A8A",
        brightGreen: "#B5E89E",
        brightYellow: "#FFE180",
        brightBlue: "#9BB8F0",
        brightMagenta: "#F0A0E0",
        brightCyan: "#A0E8F5",
        brightWhite: "#FFFFFF"
    )
    
    static let dracula = TerminalTheme(
        id: UUID(uuidString: "00000000-0000-0000-0000-000000000004")!,
        name: "Dracula",
        background: "#282A36",
        foreground: "#F8F8F2",
        cursor: "#F8F8F2",
        cursorGlow: "#F8F8F280",
        selection: "#44475A",
        black: "#21222C",
        red: "#FF5555",
        green: "#50FA7B",
        yellow: "#F1FA8C",
        blue: "#BD93F9",
        magenta: "#FF79C6",
        cyan: "#8BE9FD",
        white: "#F8F8F2",
        brightBlack: "#6272A4",
        brightRed: "#FF6E6E",
        brightGreen: "#69FF94",
        brightYellow: "#FFFFA5",
        brightBlue: "#D6ACFF",
        brightMagenta: "#FF92DF",
        brightCyan: "#A4FFFF",
        brightWhite: "#FFFFFF"
    )
    
    static let allThemes: [TerminalTheme] {
        [neonNight, arcticIce, sunsetGlow, dracula]
    }
}

struct TerminalProfile: Identifiable, Codable {
    var id: UUID
    var name: String
    var shellPath: String
    var workingDirectory: String
    var environment: [String: String]
    var themeId: UUID
    var fontSize: Double
    var cursorStyle: CursorStyle
    
    enum CursorStyle: String, Codable, CaseIterable {
        case block
        case underline
        case bar
    }
    
    static let defaultProfile = TerminalProfile(
        id: UUID(),
        name: "Default",
        shellPath: "/bin/zsh",
        workingDirectory: NSHomeDirectory(),
        environment: [:],
        themeId: TerminalTheme.neonNight.id,
        fontSize: 13,
        cursorStyle: .block
    )
}

class Settings: ObservableObject {
    static let shared = Settings()
    
    @Published var theme: TerminalTheme {
        didSet {
            UserDefaults.standard.set(theme.id.uuidString, forKey: "selectedThemeId")
        }
    }
    
    @Published var fontSize: Double {
        didSet {
            UserDefaults.standard.set(fontSize, forKey: "fontSize")
        }
    }
    
    @Published var cursorStyle: TerminalProfile.CursorStyle {
        didSet {
            UserDefaults.standard.set(cursorStyle.rawValue, forKey: "cursorStyle")
        }
    }
    
    @Published var scrollbackLines: Int {
        didSet {
            UserDefaults.standard.set(scrollbackLines, forKey: "scrollbackLines")
        }
    }
    
    @Published var cursorBlink: Bool {
        didSet {
            UserDefaults.standard.set(cursorBlink, forKey: "cursorBlink")
        }
    }
    
    @Published var bellEnabled: Bool {
        didSet {
            UserDefaults.standard.set(bellEnabled, forKey: "bellEnabled")
        }
    }
    
    init() {
        if let themeId = UserDefaults.standard.string(forKey: "selectedThemeId"),
           let uuid = UUID(uuidString: themeId),
           let savedTheme = TerminalTheme.allThemes.first(where: { $0.id == uuid }) {
            self.theme = savedTheme
        } else {
            self.theme = .neonNight
        }
        
        self.fontSize = UserDefaults.standard.double(forKey: "fontSize")
        if self.fontSize == 0 { self.fontSize = 13 }
        
        if let cursorRaw = UserDefaults.standard.string(forKey: "cursorStyle"),
           let cursor = TerminalProfile.CursorStyle(rawValue: cursorRaw) {
            self.cursorStyle = cursor
        } else {
            self.cursorStyle = .block
        }
        
        self.scrollbackLines = UserDefaults.standard.integer(forKey: "scrollbackLines")
        if self.scrollbackLines == 0 { self.scrollbackLines = 10000 }
        
        self.cursorBlink = UserDefaults.standard.object(forKey: "cursorBlink") as? Bool ?? true
        self.bellEnabled = UserDefaults.standard.object(forKey: "bellEnabled") as? Bool ?? true
    }
}