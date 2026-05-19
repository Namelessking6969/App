import Foundation

struct TerminalCell: Identifiable, Equatable {
    let id = UUID()
    var character: Character
    var foregroundColor: Int
    var backgroundColor: Int
    var bold: Bool
    var faint: Bool
    var italic: Bool
    var underline: Bool
    var strikethrough: Bool
    var inverse: Bool
    var blink: Bool
    var hyperlink: String?

    static let defaultCell = TerminalCell(
        character: " ",
        foregroundColor: 7,
        backgroundColor: 0,
        bold: false,
        faint: false,
        italic: false,
        underline: false,
        strikethrough: false,
        inverse: false,
        blink: false,
        hyperlink: nil
    )
}

struct Cursor: Equatable {
    var x: Int
    var y: Int
    
    static let origin = Cursor(x: 0, y: 0)
}

struct ScrollRegion {
    var top: Int
    var bottom: Int
    
    static let full = ScrollRegion(top: 0, bottom: Int.max)
}

class TerminalBuffer {
    var columns: Int
    var rows: Int
    
    private(set) var screen: [[TerminalCell]]
    private(set) var scrollback: [[TerminalCell]] = []
    private(set) var cursor: Cursor = .origin
    
    private var savedCursor: Cursor = .origin
    private var scrollRegion: ScrollRegion = .full
    private var charset: Int = 0
    
    private var currentForeground: Int = 7
    private var currentBackground: Int = 0
    private var currentBold: Bool = false
    private var currentFaint: Bool = false
    private var currentItalic: Bool = false
    private var currentUnderline: Bool = false
    private var currentInverse: Bool = false
    private var currentBlink: Bool = false
    
    var scrollbackSize: Int = 10000
    
    init(columns: Int = 80, rows: Int = 24) {
        self.columns = columns
        self.rows = rows
        self.screen = Array(repeating: Array(repeating: TerminalCell.defaultCell, count: columns), count: rows)
    }
    
    func resize(columns: Int, rows: Int) {
        let oldScreen = screen
        let oldColumns = self.columns
        let oldRows = self.rows
        
        self.columns = columns
        self.rows = rows
        self.screen = Array(repeating: Array(repeating: TerminalCell.defaultCell, count: columns), count: rows)
        
        for y in 0..<min(oldRows, rows) {
            for x in 0..<min(oldColumns, columns) {
                screen[y][x] = oldScreen[y][x]
            }
        }
        
        if cursor.y >= rows { cursor.y = rows - 1 }
        if cursor.x >= columns { cursor.x = columns - 1 }
    }
    
    func write(_ text: String) {
        for char in text {
            processCharacter(char)
        }
    }
    
    private func processCharacter(_ char: Character) {
        switch state {
        case .escape:
            processEscape(char)
            return
        case .csi:
            processCSI(char)
            return
        case .osc:
            processOSC(char)
            return
        case .normal:
            break
        }

        let code = char.asciiValue ?? 0

        switch code {
        case 0x00...0x1F:
            processControlCharacter(code)
        default:
            if cursor.x >= columns {
                cursor.x = 0
                lineFeed()
            }
            screen[cursor.y][cursor.x] = createCell(char)
            cursor.x += 1
        }
    }
    
    private func processControlCharacter(_ code: UInt8) {
        switch code {
        case 0x00: break
        case 0x05: cursor.x = columns - 1
        case 0x07: NSSound.beep()
        case 0x08:
            if cursor.x > 0 { cursor.x -= 1 }
        case 0x09:
            while cursor.x < columns - 1 && (cursor.x + 1) % 8 != 0 {
                cursor.x += 1
            }
        case 0x0A: lineFeed()
        case 0x0B: lineFeed()
        case 0x0C: lineFeed()
        case 0x0D:
            cursor.x = 0
        case 0x1B:
            state = .escape
        default:
            break
        }
    }
    
    private enum ParserState {
        case normal
        case escape
        case csi
        case osc
    }
    
    private var state: ParserState = .normal
    private var csiParams: [Int] = []
    private var currentParam: Int = 0
    private var oscString: String = ""
    private var intermediateChars: [Character] = []
    
    private func processEscape(_ char: Character) {
        let code = char.asciiValue ?? 0
        
        switch code {
        case 0x5B: // [
            state = .csi
            csiParams = []
            currentParam = 0
        case 0x5D: // ]
            state = .osc
            oscString = ""
        case 0x37: // 7 - save cursor
            savedCursor = cursor
        case 0x38: // 8 - restore cursor
            cursor = savedCursor
        case 0x44: // D - index (line feed)
            lineFeed()
        case 0x45: // E - next line
            cursor.x = 0
            lineFeed()
        case 0x4D: // M - reverse index
            if cursor.y > scrollRegion.top {
                cursor.y -= 1
            } else {
                insertLine(at: cursor.y)
            }
        case 0x63: // c - reset
            reset()
        default:
            break
        }
        
        if state == .escape { state = .normal }
    }
    
    private func processCSI(_ char: Character) {
        let code = char.asciiValue ?? 0
        
        if code >= 0x30 && code <= 0x39 {
            currentParam = currentParam * 10 + Int(code - 0x30)
        } else if code == 0x3B {
            csiParams.append(currentParam)
            currentParam = 0
        } else {
            csiParams.append(currentParam)
            executeCSI(char)
            state = .normal
        }
    }
    
    private func processOSC(_ char: Character) {
        let code = char.asciiValue ?? 0
        
        if code == 0x07 || code == 0x1B {
            state = .normal
        } else {
            oscString.append(char)
        }
    }
    
    private func executeCSI(_ command: Character) {
        let params = csiParams.isEmpty ? [1] : csiParams
        let code = command.asciiValue ?? 0

        switch code {
        case 0x40: // @ - insert characters
            insertCharacters(params[0])
        case 0x41: // A - cursor up
            cursor.y = max(scrollRegion.top, cursor.y - max(1, params[0]))
        case 0x42: // B - cursor down
            cursor.y = min(scrollRegion.bottom, cursor.y + max(1, params[0]))
        case 0x43: // C - cursor forward
            cursor.x = min(columns - 1, cursor.x + max(1, params[0]))
        case 0x44: // D - cursor backward
            cursor.x = max(0, cursor.x - max(1, params[0]))
        case 0x48, 0x66: // H, f - cursor position
            cursor.y = max(0, min(rows - 1, (params.count > 0 ? params[0] : 1) - 1))
            cursor.x = max(0, min(columns - 1, (params.count > 1 ? params[1] : 1) - 1))
        case 0x4A: // J - erase display
            eraseDisplay(params[0])
        case 0x4B: // K - erase line
            eraseLine(params[0])
        case 0x4C: // L - insert lines
            insertLines(params[0])
        case 0x4D: // M - delete lines
            deleteLines(params[0])
        case 0x50: // P - delete characters
            deleteCharacters(params[0])
        case 0x53: // S - scroll up
            scrollUp(params[0])
        case 0x54: // T - scroll down
            scrollDown(params[0])
        case 0x6D: // m - SGR
            setGraphicsRendition(params)
        case 0x72: // r - set scroll region
            if params.count >= 2 && params[0] > 0 && params[1] > params[0] {
                scrollRegion.top = params[0] - 1
                scrollRegion.bottom = params[1] - 1
                cursor.x = 0
                cursor.y = 0
            } else {
                scrollRegion = .full
            }
        case 0x73: // s - save cursor
            savedCursor = cursor
        case 0x75: // u - restore cursor
            cursor = savedCursor
        default:
            break
        }
    }
    
    private func setGraphicsRendition(_ params: [Int]) {
        for param in params {
            switch param {
            case 0:
                currentForeground = 7
                currentBackground = 0
                currentBold = false
                currentFaint = false
                currentItalic = false
                currentUnderline = false
                currentInverse = false
                currentBlink = false
            case 1: currentBold = true
            case 2: currentFaint = true
            case 3: currentItalic = true
            case 4: currentUnderline = true
            case 5, 6: currentBlink = true
            case 7: currentInverse = true
            case 9: currentBlink = true
            case 22: currentBold = false; currentFaint = false
            case 23: currentItalic = false
            case 24: currentUnderline = false
            case 25: currentBlink = false
            case 27: currentInverse = false
            case 30...37: currentForeground = param - 30
            case 38:
                if params.count > 2, params[1] == 5 {
                    currentForeground = params[2] % 256
                }
            case 39: currentForeground = 7
            case 40...47: currentBackground = param - 40
            case 48:
                if params.count > 2, params[1] == 5 {
                    currentBackground = params[2] % 256
                }
            case 49: currentBackground = 0
            case 90...97: currentForeground = param - 90 + 8
            case 100...107: currentBackground = param - 100 + 8
            default: break
            }
        }
    }
    
    private func lineFeed() {
        if cursor.y < scrollRegion.bottom {
            cursor.y += 1
        } else {
            scrollUp(1)
        }
    }
    
    private func scrollUp(_ lines: Int) {
        let top = scrollRegion.top
        let bottom = min(scrollRegion.bottom, rows - 1)
        for _ in 0..<lines {
            let removed = screen.remove(at: top)
            if top == 0 && bottom == rows - 1 {
                scrollback.append(removed)
                if scrollback.count > scrollbackSize {
                    scrollback.removeFirst()
                }
            }
            screen.insert(Array(repeating: TerminalCell.defaultCell, count: columns), at: bottom)
        }
    }

    private func scrollDown(_ lines: Int) {
        let top = scrollRegion.top
        let bottom = min(scrollRegion.bottom, rows - 1)
        for _ in 0..<lines {
            screen.remove(at: bottom)
            screen.insert(Array(repeating: TerminalCell.defaultCell, count: columns), at: top)
        }
    }
    
    private func insertCharacters(_ count: Int) {
        let spaces = Array(repeating: TerminalCell.defaultCell, count: min(count, columns - cursor.x))
        let start = cursor.x
        let end = min(start + count, columns)
        screen[cursor.y].replaceSubrange(start..<end, with: spaces)
    }
    
    private func deleteCharacters(_ count: Int) {
        let start = cursor.x
        let end = min(start + count, columns)
        let removed = end - start
        screen[cursor.y].removeSubrange(start..<end)
        screen[cursor.y].append(contentsOf: Array(repeating: TerminalCell.defaultCell, count: removed))
    }
    
    private func insertLines(_ count: Int) {
        guard cursor.y <= scrollRegion.bottom && cursor.y >= scrollRegion.top else { return }
        for _ in 0..<min(count, scrollRegion.bottom - cursor.y + 1) {
            screen.insert(Array(repeating: TerminalCell.defaultCell, count: columns), at: cursor.y)
            screen.removeLast()
        }
    }
    
    private func deleteLines(_ count: Int) {
        guard cursor.y <= scrollRegion.bottom && cursor.y >= scrollRegion.top else { return }
        for _ in 0..<min(count, scrollRegion.bottom - cursor.y + 1) {
            screen.remove(at: cursor.y)
            screen.append(Array(repeating: TerminalCell.defaultCell, count: columns))
        }
    }
    
    private func eraseDisplay(_ mode: Int) {
        switch mode {
        case 0:
            eraseLine(0)
            for y in (cursor.y + 1)..<rows {
                screen[y] = Array(repeating: TerminalCell.defaultCell, count: columns)
            }
        case 1:
            eraseLine(1)
            for y in 0..<cursor.y {
                screen[y] = Array(repeating: TerminalCell.defaultCell, count: columns)
            }
        case 2, 3:
            for y in 0..<rows {
                screen[y] = Array(repeating: TerminalCell.defaultCell, count: columns)
            }
            cursor.x = 0
            cursor.y = 0
        default:
            break
        }
    }
    
    private func eraseLine(_ mode: Int) {
        switch mode {
        case 0:
            for x in cursor.x..<columns {
                screen[cursor.y][x] = TerminalCell.defaultCell
            }
        case 1:
            for x in 0...cursor.x {
                screen[cursor.y][x] = TerminalCell.defaultCell
            }
        case 2:
            screen[cursor.y] = Array(repeating: TerminalCell.defaultCell, count: columns)
        default:
            break
        }
    }
    
    private func createCell(_ char: Character) -> TerminalCell {
        TerminalCell(
            character: char,
            foregroundColor: currentInverse ? currentBackground : currentForeground,
            backgroundColor: currentInverse ? currentForeground : currentBackground,
            bold: currentBold,
            faint: currentFaint,
            italic: currentItalic,
            underline: currentUnderline,
            strikethrough: false,
            inverse: currentInverse,
            blink: currentBlink,
            hyperlink: nil
        )
    }
    
    private func reset() {
        cursor = .origin
        savedCursor = .origin
        scrollRegion = .full
        currentForeground = 7
        currentBackground = 0
        currentBold = false
        currentFaint = false
        currentItalic = false
        currentUnderline = false
        currentInverse = false
        currentBlink = false
    }
    
    func clear() {
        for y in 0..<rows {
            screen[y] = Array(repeating: TerminalCell.defaultCell, count: columns)
        }
        cursor = .origin
    }
    
    func getVisibleBuffer() -> [[TerminalCell]] {
        return screen
    }
}