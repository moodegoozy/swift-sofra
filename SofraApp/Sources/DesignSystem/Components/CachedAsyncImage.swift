// CachedAsyncImage.swift
// بديل لـ AsyncImage مع تخزين مؤقت — Drop-in cached image loader

import SwiftUI

/// A drop-in replacement for AsyncImage that uses ImageCache for
/// instant loading of previously-seen images.
struct CachedAsyncImage<Content: View, Placeholder: View>: View {
    let url: URL?
    let content: (Image) -> Content
    let placeholder: () -> Placeholder

    @State private var image: UIImage?
    @State private var isLoading = false
    @State private var failed = false

    init(
        url: URL?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ) {
        self.url = url
        self.content = content
        self.placeholder = placeholder
    }

    var body: some View {
        Group {
            if let image {
                content(Image(uiImage: image))
            } else if failed {
                placeholder()
            } else {
                placeholder()
                    .onAppear { loadImage() }
            }
        }
        .onChange(of: url) { _, newURL in
            // URL changed — reload
            image = nil
            failed = false
            loadImage(for: newURL)
        }
    }

    private func loadImage(for overrideURL: URL? = nil) {
        let targetURL = overrideURL ?? url
        guard let targetURL, !targetURL.absoluteString.isEmpty else {
            failed = true
            return
        }
        guard !isLoading else { return }

        // Check cache first — instant hit
        if let cached = ImageCache.shared.image(for: targetURL) {
            self.image = cached
            return
        }

        // Download via centralized cache (deduplicates in-flight requests)
        isLoading = true
        Task {
            if let downloaded = await ImageCache.shared.download(url: targetURL) {
                await MainActor.run {
                    withAnimation(.easeIn(duration: 0.2)) {
                        self.image = downloaded
                    }
                    isLoading = false
                }
            } else {
                await MainActor.run {
                    failed = true
                    isLoading = false
                }
            }
        }
    }
}

// MARK: - Convenience: phase-based API (matches AsyncImage signature)
/// Phase-based CachedAsyncImage that mimics SwiftUI's AsyncImage(url:) { phase in ... }
struct CachedPhaseImage<Content: View>: View {
    let url: URL?
    let content: (AsyncImagePhase) -> Content

    @State private var phase: AsyncImagePhase = .empty

    init(
        url: URL?,
        @ViewBuilder content: @escaping (AsyncImagePhase) -> Content
    ) {
        self.url = url
        self.content = content
    }

    var body: some View {
        content(phase)
            .onAppear { loadImage() }
            .onChange(of: url) { _, _ in
                phase = .empty
                loadImage()
            }
    }

    private func loadImage() {
        guard let url, !url.absoluteString.isEmpty else {
            phase = .failure(URLError(.badURL))
            return
        }

        // Cache hit → instant
        if let cached = ImageCache.shared.image(for: url) {
            phase = .success(Image(uiImage: cached))
            return
        }

        Task {
            if let img = await ImageCache.shared.download(url: url) {
                await MainActor.run {
                    withAnimation(.easeIn(duration: 0.2)) {
                        phase = .success(Image(uiImage: img))
                    }
                }
            } else {
                await MainActor.run {
                    phase = .failure(URLError(.badServerResponse))
                }
            }
        }
    }
}
