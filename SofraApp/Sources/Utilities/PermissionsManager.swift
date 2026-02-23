// PermissionsManager.swift
// Handles requesting Camera, Photo Library, and Location permissions on demand

import Foundation
import AVFoundation
import Photos
import CoreLocation
import Observation

@Observable
final class PermissionsManager {
    static let shared = PermissionsManager()

    var cameraStatus: AVAuthorizationStatus = AVCaptureDevice.authorizationStatus(for: .video)
    var photoLibraryStatus: PHAuthorizationStatus = PHPhotoLibrary.authorizationStatus(for: .readWrite)

    private init() {}

    // MARK: - Camera
    func requestCameraPermission() async -> Bool {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        switch status {
        case .authorized:
            cameraStatus = .authorized
            return true
        case .notDetermined:
            let granted = await AVCaptureDevice.requestAccess(for: .video)
            cameraStatus = granted ? .authorized : .denied
            return granted
        default:
            cameraStatus = status
            return false
        }
    }

    // MARK: - Photo Library
    func requestPhotoLibraryPermission() async -> Bool {
        let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        switch status {
        case .authorized, .limited:
            photoLibraryStatus = status
            return true
        case .notDetermined:
            let newStatus = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
            photoLibraryStatus = newStatus
            return newStatus == .authorized || newStatus == .limited
        default:
            photoLibraryStatus = status
            return false
        }
    }

    // MARK: - Location
    func requestLocationPermission() {
        LocationManager.shared.requestPermission()
    }

    var isLocationAuthorized: Bool {
        LocationManager.shared.isAuthorized
    }
}
