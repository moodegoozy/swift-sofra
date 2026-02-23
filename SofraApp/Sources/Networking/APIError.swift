// APIError.swift
// Typed error handling for all network operations

import Foundation

enum APIError: LocalizedError {
    case unauthorized
    case forbidden
    case notFound
    case serverError(Int)
    case networkError(Error)
    case decodingError(Error)
    case firebaseError(String)
    case unknown(String)

    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "انتهت الجلسة. يرجى تسجيل الدخول مجدداً"
        case .forbidden:
            return "ليس لديك صلاحية الوصول"
        case .notFound:
            return "البيانات المطلوبة غير موجودة"
        case .serverError(let code):
            return "خطأ في الخادم (\(code))"
        case .networkError:
            return "تعذر الاتصال. تحقق من الإنترنت"
        case .decodingError:
            return "خطأ في معالجة البيانات"
        case .firebaseError(let msg):
            return msg
        case .unknown(let msg):
            return msg
        }
    }

    var isForbiddenOrNotFound: Bool {
        switch self {
        case .forbidden, .notFound: return true
        default: return false
        }
    }
}
