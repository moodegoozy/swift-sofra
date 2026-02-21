/**
 * مكون صورة محسّن - سفرة البيت
 * يدعم:
 * ✔ Lazy Loading - تحميل كسول عند الظهور
 * ✔ Placeholder - صورة مؤقتة أثناء التحميل
 * ✔ Blur effect - تأثير الضبابية أثناء التحميل
 * ✔ Error handling - معالجة أخطاء التحميل
 * ✔ Intersection Observer - رصد ظهور الصورة
 */

import React, { useState, useRef, useEffect, memo } from 'react'

interface OptimizedImageProps {
  src?: string
  alt: string
  className?: string
  placeholderClassName?: string
  fallback?: React.ReactNode
  width?: number
  height?: number
  lazy?: boolean // default: true
  blur?: boolean // default: true
  objectFit?: 'cover' | 'contain' | 'fill' | 'none'
}

// 🎨 Placeholder SVG (صورة مؤقتة رمادية)
const PlaceholderSVG = () => (
  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
    <svg 
      className="w-8 h-8 text-gray-300" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
      />
    </svg>
  </div>
)

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  fallback,
  width,
  height,
  lazy = true,
  blur = true,
  objectFit = 'cover'
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isVisible, setIsVisible] = useState(!lazy)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 👁 رصد ظهور الصورة في الشاشة
  useEffect(() => {
    if (!lazy || !containerRef.current) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '100px', // بدء التحميل 100px قبل الظهور
        threshold: 0.01
      }
    )

    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [lazy])

  // 🔄 معالجة تحميل الصورة
  const handleLoad = () => {
    setIsLoaded(true)
    setHasError(false)
  }

  // ❌ معالجة خطأ التحميل
  const handleError = () => {
    setHasError(true)
    setIsLoaded(true)
  }

  // إذا لا يوجد src أو حدث خطأ
  if (!src || hasError) {
    return (
      <div 
        ref={containerRef}
        className={`${className} overflow-hidden`}
        style={{ width, height }}
      >
        {fallback || <PlaceholderSVG />}
      </div>
    )
  }

  const objectFitClass = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none'
  }[objectFit]

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${placeholderClassName}`}
      style={{ width, height }}
    >
      {/* Placeholder أثناء التحميل */}
      {!isLoaded && (
        <div className="absolute inset-0 z-10">
          {fallback || <PlaceholderSVG />}
        </div>
      )}

      {/* الصورة الفعلية */}
      {isVisible && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`
            ${className} 
            ${objectFitClass}
            ${!isLoaded && blur ? 'blur-sm scale-105' : ''}
            transition-all duration-300 ease-out
          `}
          style={{ 
            width: width || '100%', 
            height: height || '100%',
            opacity: isLoaded ? 1 : 0
          }}
        />
      )}
    </div>
  )
})

/**
 * مكون صورة مصغرة (Avatar) محسّن
 */
interface OptimizedAvatarProps {
  src?: string
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  fallbackText?: string
}

export const OptimizedAvatar = memo(function OptimizedAvatar({
  src,
  alt,
  size = 'md',
  className = '',
  fallbackText
}: OptimizedAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-20 h-20 text-lg'
  }

  const fallback = (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold`}>
      {fallbackText?.charAt(0)?.toUpperCase() || alt?.charAt(0)?.toUpperCase() || '؟'}
    </div>
  )

  if (!src) {
    return <div className={className}>{fallback}</div>
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={`${sizeClasses[size]} rounded-full ${className}`}
      fallback={fallback}
      lazy={true}
      blur={false}
    />
  )
})

/**
 * مكون صورة منتج محسّن
 */
interface ProductImageProps {
  src?: string
  alt: string
  className?: string
  aspectRatio?: '1:1' | '4:3' | '16:9'
}

export const ProductImage = memo(function ProductImage({
  src,
  alt,
  className = '',
  aspectRatio = '1:1'
}: ProductImageProps) {
  const aspectClasses = {
    '1:1': 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '16:9': 'aspect-video'
  }

  const fallback = (
    <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
      <span className="text-4xl">🍽️</span>
    </div>
  )

  return (
    <div className={`${aspectClasses[aspectRatio]} ${className}`}>
      <OptimizedImage
        src={src}
        alt={alt}
        className="w-full h-full"
        fallback={fallback}
        lazy={true}
        blur={true}
      />
    </div>
  )
})

export default OptimizedImage
