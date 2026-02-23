// LocationPickerView.swift
// Interactive map for selecting delivery location — shown on login & checkout
// Uses MapKit with a draggable pin and "current location" button

import SwiftUI
import MapKit
import CoreLocation

struct LocationPickerView: View {
    @Environment(\.dismiss) var dismiss
    let title: String
    let subtitle: String
    var onLocationSelected: (Double, Double, String) -> Void

    @State private var cameraPosition: MapCameraPosition = .automatic
    @State private var selectedCoordinate: CLLocationCoordinate2D?
    @State private var addressText = ""
    @State private var isGeocoding = false
    @State private var mapRegion = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 24.7136, longitude: 46.6753), // الرياض default
        span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
    )

    private let locationManager = LocationManager.shared
    private let geocoder = CLGeocoder()

    var body: some View {
        NavigationStack {
            ZStack {
                // Map
                Map(position: $cameraPosition, interactionModes: .all) {
                    if let coord = selectedCoordinate {
                        Annotation("", coordinate: coord) {
                            VStack(spacing: 0) {
                                Image(systemName: "mappin.circle.fill")
                                    .font(.system(size: 36))
                                    .foregroundStyle(SofraColors.primary)
                                    .shadow(color: .black.opacity(0.3), radius: 4, y: 2)

                                Image(systemName: "arrowtriangle.down.fill")
                                    .font(.system(size: 12))
                                    .foregroundStyle(SofraColors.primary)
                                    .offset(y: -4)
                            }
                        }
                    }
                }
                .onMapCameraChange(frequency: .onEnd) { context in
                    let center = context.camera.centerCoordinate
                    selectedCoordinate = center
                    Task { await reverseGeocode(center) }
                }
                .ignoresSafeArea(edges: .bottom)

                // Crosshair (center indicator while dragging)
                VStack {
                    Spacer()
                    Image(systemName: "plus")
                        .font(.system(size: 20, weight: .light))
                        .foregroundStyle(SofraColors.textMuted.opacity(0.5))
                    Spacer()
                }
                .allowsHitTesting(false)

                // Bottom card
                VStack {
                    Spacer()

                    VStack(spacing: SofraSpacing.md) {
                        // Address display
                        HStack {
                            if isGeocoding {
                                ProgressView()
                                    .scaleEffect(0.8)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: SofraSpacing.xxs) {
                                Text("الموقع المحدد")
                                    .font(SofraTypography.caption)
                                    .foregroundStyle(SofraColors.textMuted)
                                Text(addressText.isEmpty ? "حرّك الخريطة لتحديد الموقع" : addressText)
                                    .font(SofraTypography.body)
                                    .foregroundStyle(SofraColors.textPrimary)
                                    .multilineTextAlignment(.trailing)
                                    .lineLimit(2)
                            }
                            Image(systemName: "mappin.and.ellipse")
                                .foregroundStyle(SofraColors.gold400)
                        }

                        // Buttons
                        HStack(spacing: SofraSpacing.md) {
                            // My location button
                            Button {
                                goToMyLocation()
                            } label: {
                                HStack(spacing: SofraSpacing.xs) {
                                    Text("موقعي")
                                        .font(SofraTypography.calloutSemibold)
                                    Image(systemName: "location.fill")
                                }
                                .padding(.horizontal, SofraSpacing.md)
                                .padding(.vertical, SofraSpacing.sm)
                                .background(SofraColors.surfaceElevated)
                                .foregroundStyle(SofraColors.primary)
                                .clipShape(Capsule())
                                .overlay(
                                    Capsule()
                                        .strokeBorder(SofraColors.primary.opacity(0.3), lineWidth: 1)
                                )
                            }

                            // Confirm button
                            Button {
                                confirmLocation()
                            } label: {
                                HStack(spacing: SofraSpacing.xs) {
                                    Text("تأكيد الموقع")
                                        .font(SofraTypography.calloutSemibold)
                                    Image(systemName: "checkmark.circle.fill")
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, SofraSpacing.sm)
                                .background(SofraColors.primary)
                                .foregroundStyle(.white)
                                .clipShape(Capsule())
                            }
                            .disabled(selectedCoordinate == nil)
                        }
                    }
                    .padding(SofraSpacing.cardPadding)
                    .background(
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .fill(.ultraThinMaterial)
                            .environment(\.colorScheme, .dark)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .strokeBorder(SofraColors.gold500.opacity(0.15), lineWidth: 0.5)
                    )
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    .padding(.bottom, SofraSpacing.md)
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("إلغاء") { dismiss() }
                        .foregroundStyle(SofraColors.gold400)
                }
            }
            .onAppear {
                setupInitialLocation()
            }
        }
    }

    // MARK: - Setup
    private func setupInitialLocation() {
        if !locationManager.isAuthorized {
            locationManager.requestPermission()
        }

        if locationManager.hasLocation {
            let coord = CLLocationCoordinate2D(
                latitude: locationManager.userLatitude,
                longitude: locationManager.userLongitude
            )
            selectedCoordinate = coord
            cameraPosition = .region(MKCoordinateRegion(
                center: coord,
                span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
            ))
            Task { await reverseGeocode(coord) }
        } else {
            // Default to Riyadh; will update when location comes
            locationManager.requestLocation()
            let defaultCoord = CLLocationCoordinate2D(latitude: 24.7136, longitude: 46.6753)
            selectedCoordinate = defaultCoord
            cameraPosition = .region(MKCoordinateRegion(
                center: defaultCoord,
                span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
            ))
        }
    }

    // MARK: - Go to My Location
    private func goToMyLocation() {
        if !locationManager.isAuthorized {
            locationManager.requestPermission()
            return
        }
        locationManager.requestLocation()

        // Wait briefly for location to update
        Task {
            try? await Task.sleep(for: .seconds(1))
            if locationManager.hasLocation {
                let coord = CLLocationCoordinate2D(
                    latitude: locationManager.userLatitude,
                    longitude: locationManager.userLongitude
                )
                withAnimation {
                    cameraPosition = .region(MKCoordinateRegion(
                        center: coord,
                        span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                    ))
                }
                selectedCoordinate = coord
                await reverseGeocode(coord)
            }
        }
    }

    // MARK: - Reverse Geocode
    private func reverseGeocode(_ coordinate: CLLocationCoordinate2D) async {
        isGeocoding = true
        let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        do {
            let placemarks = try await geocoder.reverseGeocodeLocation(location)
            if let pm = placemarks.first {
                let parts = [pm.name, pm.subLocality, pm.locality, pm.administrativeArea].compactMap { $0 }
                addressText = parts.joined(separator: "، ")
            }
        } catch {
            Logger.log("Geocode error: \(error)", level: .warning)
        }
        isGeocoding = false
    }

    // MARK: - Confirm
    private func confirmLocation() {
        guard let coord = selectedCoordinate else { return }
        onLocationSelected(coord.latitude, coord.longitude, addressText)
        dismiss()
    }
}

#Preview {
    LocationPickerView(
        title: "حدد موقعك",
        subtitle: "اختر موقعك على الخريطة"
    ) { lat, lng, address in
        print("Selected: \(lat), \(lng) — \(address)")
    }
}
