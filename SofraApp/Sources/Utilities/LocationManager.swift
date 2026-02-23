// LocationManager.swift
// Manages CLLocationManager to request & track user location

import Foundation
import CoreLocation
import Observation

@Observable
final class LocationManager: NSObject, CLLocationManagerDelegate {
    static let shared = LocationManager()

    var userLatitude: Double = 0
    var userLongitude: Double = 0
    var authorizationStatus: CLAuthorizationStatus = .notDetermined
    var locationError: String?
    var isAuthorized: Bool {
        authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways
    }
    var hasLocation: Bool {
        userLatitude != 0 || userLongitude != 0
    }

    private let manager = CLLocationManager()

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        authorizationStatus = manager.authorizationStatus
    }

    // MARK: - Request Permission
    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }

    // MARK: - Request Current Location
    func requestLocation() {
        locationError = nil
        manager.requestLocation()
    }

    // MARK: - Start Updating (continuous)
    func startUpdating() {
        locationError = nil
        manager.startUpdatingLocation()
    }

    func stopUpdating() {
        manager.stopUpdatingLocation()
    }

    // MARK: - CLLocationManagerDelegate
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        userLatitude = location.coordinate.latitude
        userLongitude = location.coordinate.longitude
        Logger.log("Location updated: \(userLatitude), \(userLongitude)", level: .debug)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Logger.log("Location error: \(error.localizedDescription)", level: .error)
        locationError = "تعذر تحديد الموقع"
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
        if isAuthorized {
            requestLocation()
        }
    }

    // MARK: - Distance Calculation
    /// Returns distance in kilometers between user and a point
    func distanceTo(lat: Double, lng: Double) -> Double {
        guard hasLocation else { return Double.greatestFiniteMagnitude }
        let userLocation = CLLocation(latitude: userLatitude, longitude: userLongitude)
        let targetLocation = CLLocation(latitude: lat, longitude: lng)
        return userLocation.distance(from: targetLocation) / 1000.0 // meters → km
    }

    /// Returns formatted distance string
    func distanceText(lat: Double, lng: Double) -> String {
        let km = distanceTo(lat: lat, lng: lng)
        if km == Double.greatestFiniteMagnitude { return "" }
        if km < 1 {
            return "\(Int(km * 1000)) م"
        }
        return String(format: "%.1f كم", km)
    }
}
