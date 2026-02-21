// Date+Extensions.swift
// Date formatting helpers (Arabic-friendly)

import Foundation

extension Date {
    /// Relative time string in Arabic (e.g. "منذ 5 دقائق")
    var relativeArabic: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = Locale(identifier: "ar")
        formatter.unitsStyle = .full
        return formatter.localizedString(for: self, relativeTo: .now)
    }

    /// Short date "٢٠٢٦/٠٢/٢١"
    var shortArabic: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ar")
        f.dateStyle = .short
        return f.string(from: self)
    }

    /// Time only "٢:٣٠ م"
    var timeArabic: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "ar")
        f.timeStyle = .short
        return f.string(from: self)
    }

    /// From Firestore timestamp string (ISO 8601)
    init?(firestoreTimestamp: String) {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: firestoreTimestamp) {
            self = date
        } else {
            // Try without fractional seconds
            formatter.formatOptions = [.withInternetDateTime]
            guard let date = formatter.date(from: firestoreTimestamp) else { return nil }
            self = date
        }
    }
}
