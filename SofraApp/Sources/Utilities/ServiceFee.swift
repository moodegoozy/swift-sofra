// ServiceFee.swift
// Platform service fee constants — per-item flat fee system
// Fee + VAT displayed separately to customer

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
    
    /// VAT rate (15%)
    static let vatRate: Double = 0.15
    
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
    
    /// Calculate VAT on subtotal (product prices + service fee)
    static func calculateVAT(subtotal: Double) -> Double {
        subtotal * vatRate
    }
    
    /// Calculate customer price for a single item (price + service fee + VAT)
    static func customerPrice(basePrice: Double) -> Double {
        let priceWithFee = basePrice + perItem
        let vat = priceWithFee * vatRate
        return priceWithFee + vat
    }
    
    /// Calculate VAT on a single item price (price + service fee)
    static func itemVAT(basePrice: Double) -> Double {
        (basePrice + perItem) * vatRate
    }
}
