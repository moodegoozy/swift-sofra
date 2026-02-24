// AppearanceManager.swift
// Manages dark/light mode preference with UserDefaults persistence

import SwiftUI
import Observation

@Observable
final class AppearanceManager {
    static let shared = AppearanceManager()

    /// Current color scheme preference: nil = system, .dark, .light
    var colorScheme: ColorScheme? {
        didSet { save() }
    }

    /// True when dark mode is active
    var isDarkMode: Bool {
        get { colorScheme == .dark }
        set { colorScheme = newValue ? .dark : .light }
    }

    private let key = "app_color_scheme"

    private init() {
        // Load saved preference
        let saved = UserDefaults.standard.string(forKey: key)
        switch saved {
        case "dark":  colorScheme = .dark
        case "light": colorScheme = .light
        default:      colorScheme = .dark // Default to dark (Ramadan theme)
        }
    }

    private func save() {
        switch colorScheme {
        case .dark:  UserDefaults.standard.set("dark", forKey: key)
        case .light: UserDefaults.standard.set("light", forKey: key)
        default:     UserDefaults.standard.removeObject(forKey: key)
        }
    }
}
