// ServiceFee.swift
// Platform service fee constants — per-item flat fee system
// Fee is embedded in customer-facing price (invisible to customer)

import Foundation

/// Service fee configuration for the platform.
/// Each menu item has a flat fee added to the customer price.
/// The fee is split between supervisor (if any) and the platform.
enum ServiceFee {
    /// Fee added per item (in SAR)
    static let perItem: Double = 1.75

    /// Supervisor's share per item when restaurant was added by a supervisor
    static let supervisorShare: Double = 1.00

    /// Platform's share per item when restaurant has a supervisor
    static let platformShareWithSupervisor: Double = 0.75

    /// Platform's share per item when restaurant has NO supervisor (self-registered)
    static let platformShareNoSupervisor: Double = 1.75

    /// Calculate total service fee for a given item quantity
    static func totalFee(itemCount: Int) -> Double {
        perItem * Double(itemCount)
    }

    /// Calculate platform fee based on whether restaurant has a supervisor
    static func platformFee(itemCount: Int, hasSupervisor: Bool) -> Double {
        let share = hasSupervisor ? platformShareWithSupervisor : platformShareNoSupervisor
        return share * Double(itemCount)
    }

    /// Calculate supervisor fee (0 if no supervisor)
    static func supervisorFee(itemCount: Int, hasSupervisor: Bool) -> Double {
        guard hasSupervisor else { return 0 }
        return supervisorShare * Double(itemCount)
    }
}
