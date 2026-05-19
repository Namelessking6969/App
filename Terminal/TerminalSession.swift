import Foundation
import Darwin

class TerminalSession: ObservableObject {
    let id = UUID()
    let name: String
    
    @Published var buffer: TerminalBuffer
    @Published var isRunning: Bool = true
    
    private var ptyMaster: Int32 = -1
    private var ptySlave: Int32 = -1
    private var pid: pid_t = 0
    private var readSource: DispatchSourceRead?
    private let queue = DispatchQueue(label: "com.vibeterminal.session", qos: .userInteractive)
    
    var onTitleChange: ((String) -> Void)?
    var onClose: (() -> Void)?
    
    init(name: String = "zsh", columns: Int = 80, rows: Int = 24) {
        self.name = name
        self.buffer = TerminalBuffer(columns: columns, rows: rows)
        setupPTY(columns: columns, rows: rows)
    }
    
    private func setupPTY(columns: Int, rows: Int) {
        var winSize = winsize()
        winSize.ws_col = UInt16(columns)
        winSize.ws_row = UInt16(rows)
        winSize.ws_xpixel = 0
        winSize.ws_ypixel = 0
        
        if openPTY(master: &ptyMaster, slave: &ptySlave, winSize: &winSize) != 0 {
            return
        }
        
        pid = fork()
        
        if pid == 0 {
            setupChild(ptySlave)
        } else if pid > 0 {
            setupParent()
        }
    }
    
    private func openPTY(master: inout Int32, slave: inout Int32, winSize: inout winsize) -> Int32 {
        var attributes = termios()
        
        master = posix_openpt(O_RDWR | O_NOCTTY)
        guard master >= 0 else { return -1 }
        
        guard grantpt(master) == 0 && unlockpt(master) == 0 else {
            close(master)
            return -1
        }
        
        let slaveName = ptsname(master)
        slave = open(slaveName, O_RDWR)
        guard slave >= 0 else {
            close(master)
            return -1
        }
        
        tcgetattr(slave, &attributes)
        attributes.c_iflag = ICRNL | IXON | IXANY | IMAXBEL
        attributes.c_oflag = OPOST | ONLCR
        attributes.c_cflag = CS8 | CREAD | HUPCL | CLOCAL
        attributes.c_lflag = ISIG | ICANON | ECHO | ECHOE | ECHOK | ECHOCTL | ECHOKE
        attributes.c_cc.16 = 3
        attributes.c_cc.17 = 4
        
        cfsetispeed(&attributes, 9600)
        cfsetospeed(&attributes, 9600)
        
        tcsetattr(slave, TCSANOW, &attributes)
        ioctl(slave, TIOCSWINSZ, &winSize)
        
        return 0
    }
    
    private func setupChild(_ slave: Int32) {
        close(ptyMaster)
        
        setsid()
        ioctl(slave, TIOCSCTTY, 0)
        dup2(slave, 0)
        dup2(slave, 1)
        dup2(slave, 2)
        close(slave)
        
        let shell = ProcessInfo.processInfo.environment["SHELL"] ?? "/bin/zsh"
        let home = ProcessInfo.processInfo.homeDirectory.path
        
        var env = ProcessInfo.processInfo.environment
        env["TERM"] = "xterm-256color"
        env["COLORTERM"] = "truecolor"
        env["TERM_PROGRAM"] = "VibeTerminal"
        
        setenv("HOME", home, 1)
        
        for (key, value) in env {
            setenv(key, value, 1)
        }
        
        execv(shell, [shell])
        exit(1)
    }
    
    private func setupParent() {
        close(ptySlave)
        
        let source = DispatchSource.makeReadSource(fileDescriptor: ptyMaster, queue: queue)
        source.setEventHandler { [weak self] in
            self?.readOutput()
        }
        source.setCancelHandler { [weak self] in
            self?.cleanup()
        }
        source.resume()
        readSource = source
        
    }
    
    private func readOutput() {
        var buffer = [UInt8](repeating: 0, count: 4096)
        let bytesRead = read(ptyMaster, &buffer, buffer.count)
        
        guard bytesRead > 0 else {
            DispatchQueue.main.async { [weak self] in
                self?.isRunning = false
                self?.onClose?()
            }
            return
        }
        
        let data = Data(buffer[0..<bytesRead])
        if let text = String(data: data, encoding: .utf8) {
            DispatchQueue.main.async { [weak self] in
                self?.buffer.write(text)
            }
        }
    }
    
    func write(_ text: String) {
        guard let data = text.data(using: .utf8), ptyMaster >= 0 else { return }
        _ = data.withUnsafeBytes { ptr in
            write(ptyMaster, ptr.baseAddress, data.count)
        }
    }
    
    func writeKey(_ key: UInt32, modifiers: UInt16) {
        var sequence = ""
        
        if modifiers & UInt16(NSEvent.ModifierFlags.control.rawValue) != 0 {
            if let char = Unicode.Scalar(key) {
                let code = char.value
                if code >= 97 && code <= 122 {
                    sequence = String(UnicodeScalar(code - 96)!)
                }
            }
        }
        
        if sequence.isEmpty {
            if let char = Unicode.Scalar(key) {
                sequence = String(char)
            }
        }
        
        write(sequence)
    }
    
    func resize(columns: Int, rows: Int) {
        buffer.resize(columns: columns, rows: rows)
        
        var winSize = winsize()
        winSize.ws_col = UInt16(columns)
        winSize.ws_row = UInt16(rows)
        
        if ptyMaster >= 0 {
            ioctl(ptyMaster, TIOCSWINSZ, &winSize)
        }
    }
    
    func close() {
        readSource?.cancel()
        
        if pid > 0 {
            kill(pid, SIGTERM)
            waitpid(pid, nil, 0)
        }
        
        if ptyMaster >= 0 {
            close(ptyMaster)
        }
    }
    
    private func cleanup() {
        if ptyMaster >= 0 {
            close(ptyMaster)
            ptyMaster = -1
        }
    }
    
    deinit {
        close()
    }
}