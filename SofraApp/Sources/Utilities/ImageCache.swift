// ImageCache.swift
// نظام تخزين مؤقت للصور — ذاكرة + قرص

import UIKit

/// Dual-layer image cache: NSCache (memory) + FileManager (disk)
final class ImageCache: @unchecked Sendable {
    static let shared = ImageCache()

    // MARK: - Memory Cache
    private let memoryCache: NSCache<NSString, UIImage> = {
        let cache = NSCache<NSString, UIImage>()
        cache.countLimit = 200           // max 200 images in memory
        cache.totalCostLimit = 80 * 1024 * 1024  // ~80 MB
        return cache
    }()

    // MARK: - Dedicated URLSession (concurrent image downloads)
    let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.httpMaximumConnectionsPerHost = 6
        config.timeoutIntervalForRequest = 15
        config.urlCache = URLCache(memoryCapacity: 20 * 1024 * 1024, diskCapacity: 0) // 20MB HTTP cache
        config.requestCachePolicy = .returnCacheDataElseLoad
        return URLSession(configuration: config)
    }()

    // MARK: - In-flight tracking (avoid duplicate downloads)
    private var inflightTasks: [String: Task<UIImage?, Never>] = [:]
    private let inflightLock = NSLock()

    // MARK: - Disk Cache
    private let diskCacheURL: URL
    private let fileManager = FileManager.default
    private let diskQueue = DispatchQueue(label: "com.sofra.imagecache.disk", qos: .utility)
    private let maxDiskAge: TimeInterval = 7 * 24 * 3600  // 7 days

    private init() {
        let caches = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first!
        diskCacheURL = caches.appendingPathComponent("SofraImageCache", isDirectory: true)
        try? fileManager.createDirectory(at: diskCacheURL, withIntermediateDirectories: true)

        // Clean old files on startup (background)
        diskQueue.async { [weak self] in
            self?.cleanExpiredDiskCache()
        }
    }

    // MARK: - Key Hashing
    private func cacheKey(_ url: URL) -> String {
        // Use a simple hash of the URL string for filenames
        let str = url.absoluteString
        var hash: UInt64 = 5381
        for byte in str.utf8 {
            hash = 127 &* (hash & 0x00ffffffffffffff) &+ UInt64(byte)
        }
        return String(hash, radix: 16)
    }

    // MARK: - Public API

    /// Get image from cache (memory first, then disk)
    func image(for url: URL) -> UIImage? {
        let key = cacheKey(url)
        let nsKey = key as NSString

        // 1. Memory cache
        if let cached = memoryCache.object(forKey: nsKey) {
            return cached
        }

        // 2. Disk cache
        let filePath = diskCacheURL.appendingPathComponent(key)
        guard fileManager.fileExists(atPath: filePath.path),
              let data = try? Data(contentsOf: filePath),
              let image = UIImage(data: data) else {
            return nil
        }

        // Promote to memory cache
        let cost = Int(image.size.width * image.size.height * image.scale * 4)
        memoryCache.setObject(image, forKey: nsKey, cost: cost)
        return image
    }

    /// Store image in both memory and disk
    func store(_ image: UIImage, for url: URL) {
        let key = cacheKey(url)
        let nsKey = key as NSString

        // Memory
        let cost = Int(image.size.width * image.size.height * image.scale * 4)
        memoryCache.setObject(image, forKey: nsKey, cost: cost)

        // Disk (async)
        diskQueue.async { [weak self] in
            guard let self else { return }
            let filePath = self.diskCacheURL.appendingPathComponent(key)
            // Use JPEG for photos (smaller), PNG would be alternative
            if let data = image.jpegData(compressionQuality: 0.85) {
                try? data.write(to: filePath, options: .atomic)
            }
        }
    }

    /// Prefetch multiple URLs (deduplicates in-flight requests)
    func prefetch(_ urls: [URL]) {
        for url in urls {
            if image(for: url) != nil { continue }
            let key = cacheKey(url)

            inflightLock.lock()
            let existing = inflightTasks[key]
            inflightLock.unlock()
            if existing != nil { continue }

            let task = Task.detached(priority: .utility) { [weak self] () -> UIImage? in
                guard let self else { return nil }
                do {
                    let (data, _) = try await self.session.data(from: url)
                    if let img = self.downsample(data: data, maxPixels: 400) {
                        self.store(img, for: url)
                        return img
                    }
                } catch { }
                return nil
            }

            inflightLock.lock()
            inflightTasks[key] = task
            inflightLock.unlock()

            // Clean up after completion
            Task {
                _ = await task.value
                inflightLock.lock()
                inflightTasks.removeValue(forKey: key)
                inflightLock.unlock()
            }
        }
    }

    /// Download image with in-flight dedup (used by CachedPhaseImage)
    func download(url: URL) async -> UIImage? {
        let key = cacheKey(url)

        // Check in-flight
        inflightLock.lock()
        if let existing = inflightTasks[key] {
            inflightLock.unlock()
            return await existing.value
        }
        inflightLock.unlock()

        let task = Task.detached(priority: .userInitiated) { [weak self] () -> UIImage? in
            guard let self else { return nil }
            do {
                let (data, response) = try await self.session.data(from: url)
                guard let httpResponse = response as? HTTPURLResponse,
                      (200...299).contains(httpResponse.statusCode) else { return nil }
                return self.downsample(data: data, maxPixels: 800)
            } catch {
                return nil
            }
        }

        inflightLock.lock()
        inflightTasks[key] = task
        inflightLock.unlock()

        let result = await task.value

        inflightLock.lock()
        inflightTasks.removeValue(forKey: key)
        inflightLock.unlock()

        if let result { store(result, for: url) }
        return result
    }

    // MARK: - Image Downsampling
    /// Downsample large images to save memory (max side = maxPixels points)
    private func downsample(data: Data, maxPixels: CGFloat) -> UIImage? {
        let options: [CFString: Any] = [
            kCGImageSourceShouldCache: false,
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPixels * UIScreen.main.scale
        ]
        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
            return UIImage(data: data)
        }
        return UIImage(cgImage: cgImage)
    }

    /// Clear all caches
    func clearAll() {
        memoryCache.removeAllObjects()
        diskQueue.async { [weak self] in
            guard let self else { return }
            try? self.fileManager.removeItem(at: self.diskCacheURL)
            try? self.fileManager.createDirectory(at: self.diskCacheURL, withIntermediateDirectories: true)
        }
    }

    // MARK: - Disk Cleanup
    private func cleanExpiredDiskCache() {
        guard let enumerator = fileManager.enumerator(
            at: diskCacheURL,
            includingPropertiesForKeys: [.contentModificationDateKey],
            options: [.skipsHiddenFiles]
        ) else { return }

        let cutoff = Date().addingTimeInterval(-maxDiskAge)

        while let fileURL = enumerator.nextObject() as? URL {
            guard let values = try? fileURL.resourceValues(forKeys: [.contentModificationDateKey]),
                  let modDate = values.contentModificationDate,
                  modDate < cutoff else { continue }
            try? fileManager.removeItem(at: fileURL)
        }
    }
}
