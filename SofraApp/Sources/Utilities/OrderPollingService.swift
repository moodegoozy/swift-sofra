// OrderPollingService.swift
// Background polling for order status changes and new orders
// Triggers local notifications when changes are detected

import Foundation
import Observation

@Observable
final class OrderPollingService {
    static let shared = OrderPollingService()

    private var customerPollingTask: Task<Void, Never>?
    private var ownerPollingTask: Task<Void, Never>?
    private let firestoreService = FirestoreService()
    private let notificationService = NotificationService.shared

    /// Last known order statuses for detecting changes (customer)
    private var customerOrderStatuses: [String: String] = [:]
    /// Last known order IDs for detecting new orders (owner)
    private var ownerOrderIds: Set<String> = []

    private var isCustomerFirstLoad = true
    private var isOwnerFirstLoad = true

    private init() {}

    // MARK: - Customer Polling (detect status changes)
    func startCustomerPolling(userId: String, token: @escaping () async -> String?) {
        stopCustomerPolling()
        isCustomerFirstLoad = true

        customerPollingTask = Task {
            while !Task.isCancelled {
                guard let t = await token() else {
                    try? await Task.sleep(for: .seconds(10))
                    continue
                }

                do {
                    let docs = try await firestoreService.query(
                        collection: "orders",
                        filters: [QueryFilter(field: "customerId", op: "EQUAL", value: userId)],
                        orderBy: "createdAt",
                        descending: true,
                        limit: 20,
                        idToken: t
                    )
                    let orders = docs.map { Order(from: $0) }

                    if !isCustomerFirstLoad {
                        // Check for status changes
                        for order in orders {
                            if let prevStatus = customerOrderStatuses[order.id],
                               prevStatus != order.status.rawValue {
                                notificationService.notifyOrderStatusChange(
                                    orderId: order.id,
                                    status: order.status.rawValue,
                                    restaurantName: order.restaurantName
                                )
                            }
                        }
                    }

                    // Update tracking
                    customerOrderStatuses = Dictionary(uniqueKeysWithValues: orders.map { ($0.id, $0.status.rawValue) })
                    isCustomerFirstLoad = false
                } catch {
                    Logger.log("Customer polling error: \(error)", level: .error)
                }

                try? await Task.sleep(for: .seconds(15))
            }
        }
    }

    func stopCustomerPolling() {
        customerPollingTask?.cancel()
        customerPollingTask = nil
        isCustomerFirstLoad = true
    }

    // MARK: - Owner Polling (detect new orders)
    func startOwnerPolling(ownerId: String, token: @escaping () async -> String?) {
        stopOwnerPolling()
        isOwnerFirstLoad = true

        ownerPollingTask = Task {
            while !Task.isCancelled {
                guard let t = await token() else {
                    try? await Task.sleep(for: .seconds(10))
                    continue
                }

                do {
                    let docs = try await firestoreService.query(
                        collection: "orders",
                        filters: [QueryFilter(field: "restaurantId", op: "EQUAL", value: ownerId)],
                        orderBy: "createdAt",
                        descending: true,
                        limit: 20,
                        idToken: t
                    )
                    let orders = docs.map { Order(from: $0) }
                    let currentIds = Set(orders.map { $0.id })

                    if !isOwnerFirstLoad {
                        // Detect new orders
                        let newOrders = orders.filter { !ownerOrderIds.contains($0.id) }
                        for order in newOrders {
                            notificationService.notifyNewOrder(
                                orderId: order.id,
                                customerName: nil,
                                total: order.total
                            )
                        }
                    }

                    ownerOrderIds = currentIds
                    isOwnerFirstLoad = false
                } catch {
                    Logger.log("Owner polling error: \(error)", level: .error)
                }

                try? await Task.sleep(for: .seconds(10))
            }
        }
    }

    func stopOwnerPolling() {
        ownerPollingTask?.cancel()
        ownerPollingTask = nil
        isOwnerFirstLoad = true
    }

    // MARK: - Stop All
    func stopAll() {
        stopCustomerPolling()
        stopOwnerPolling()
    }
}
