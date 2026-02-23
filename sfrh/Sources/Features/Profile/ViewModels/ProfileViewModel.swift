// ProfileViewModel.swift
// Profile data management

import Foundation
import Observation

@Observable
final class ProfileViewModel {
    var user: AppUser?
    var isLoading = false
    var isSaving = false
    var errorMessage: String?
    var successMessage: String?

    private let firestoreService = FirestoreService()

    func loadProfile(uid: String, token: String?) async {
        guard let token else { return }
        isLoading = true
        errorMessage = nil

        do {
            let doc = try await firestoreService.getDocument(
                collection: "users", id: uid, idToken: token
            )
            self.user = AppUser(from: doc)
        } catch {
            Logger.log("Profile load error: \(error)", level: .error)
            errorMessage = "تعذر تحميل الملف الشخصي"
        }

        isLoading = false
    }

    func updateProfile(uid: String, fields: [String: Any], token: String?) async -> Bool {
        guard let token else {
            errorMessage = "يرجى تسجيل الدخول"
            return false
        }

        isSaving = true
        errorMessage = nil
        successMessage = nil

        do {
            try await firestoreService.updateDocument(
                collection: "users", id: uid,
                fields: fields,
                idToken: token
            )
            successMessage = "تم حفظ التعديلات"
            isSaving = false
            return true
        } catch {
            Logger.log("Profile update error: \(error)", level: .error)
            errorMessage = "فشل حفظ التعديلات"
            isSaving = false
            return false
        }
    }
}
