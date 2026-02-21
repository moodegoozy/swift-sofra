// src/components/StoryViewer.tsx
// مكون عرض الستوريات للعملاء (مثل إنستغرام)
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Story, StoryGroup } from '@/types'
import { X, ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX, ShoppingBag, ExternalLink } from 'lucide-react'
import { db } from '@/firebase'
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore'

type Props = {
  storyGroups: StoryGroup[]
  initialGroupIndex: number
  currentUserId?: string
  onClose: () => void
}

export const StoryViewer: React.FC<Props> = ({ 
  storyGroups, 
  initialGroupIndex, 
  currentUserId, 
  onClose 
}) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex)
  const [storyIndex, setStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const currentGroup = storyGroups[groupIndex]
  const currentStory = currentGroup?.stories[storyIndex]
  const STORY_DURATION = currentStory?.type === 'video' ? 15000 : 5000 // 15s للفيديو، 5s للصور

  // تسجيل المشاهدة
  const recordView = useCallback(async (story: Story) => {
    if (!currentUserId || !story.id) return
    if (story.viewedBy?.includes(currentUserId)) return
    
    try {
      await updateDoc(doc(db, 'stories', story.id), {
        viewsCount: increment(1),
        viewedBy: arrayUnion(currentUserId)
      })
    } catch (err) {
      console.warn('Error recording view:', err)
    }
  }, [currentUserId])

  // الانتقال للستوري التالي
  const nextStory = useCallback(() => {
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(prev => prev + 1)
      setProgress(0)
    } else if (groupIndex < storyGroups.length - 1) {
      setGroupIndex(prev => prev + 1)
      setStoryIndex(0)
      setProgress(0)
    } else {
      onClose()
    }
  }, [storyIndex, groupIndex, currentGroup, storyGroups.length, onClose])

  // الانتقال للستوري السابق
  const prevStory = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1)
      setProgress(0)
    } else if (groupIndex > 0) {
      setGroupIndex(prev => prev - 1)
      const prevGroup = storyGroups[groupIndex - 1]
      setStoryIndex(prevGroup.stories.length - 1)
      setProgress(0)
    }
  }, [storyIndex, groupIndex, storyGroups])

  // تشغيل المؤقت
  useEffect(() => {
    if (!currentStory || isPaused) return

    recordView(currentStory)

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = (elapsed / STORY_DURATION) * 100
      
      if (newProgress >= 100) {
        clearInterval(interval)
        nextStory()
      } else {
        setProgress(newProgress)
      }
    }, 50)

    timerRef.current = interval
    return () => clearInterval(interval)
  }, [currentStory, isPaused, STORY_DURATION, nextStory, recordView])

  // التحكم بالفيديو
  useEffect(() => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pause()
      } else {
        videoRef.current.play().catch(() => {})
      }
    }
  }, [isPaused, currentStory])

  // إغلاق بـ Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') nextStory()
      if (e.key === 'ArrowLeft') prevStory()
      if (e.key === ' ') setIsPaused(p => !p)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, nextStory, prevStory])

  if (!currentStory) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* الخلفية */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black" />

      {/* المحتوى */}
      <div className="relative w-full max-w-md h-full max-h-[100vh] flex flex-col">
        {/* شريط التقدم */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
          {currentGroup.stories.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-100"
                style={{ 
                  width: idx < storyIndex ? '100%' : 
                         idx === storyIndex ? `${progress}%` : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* رأس الستوري */}
        <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {currentGroup.restaurantLogo ? (
              <img 
                src={currentGroup.restaurantLogo} 
                alt="" 
                className="w-10 h-10 rounded-full border-2 border-white object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {currentGroup.restaurantName?.charAt(0) || '?'}
              </div>
            )}
            <div>
              <p className="text-white font-bold text-sm">{currentGroup.restaurantName}</p>
              <p className="text-white/60 text-xs">
                {new Date(currentStory.createdAt || Date.now()).toLocaleTimeString('ar-SA', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* زر الصوت للفيديو */}
            {currentStory.type === 'video' && (
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 text-white/80 hover:text-white"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            )}
            {/* زر الإيقاف */}
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 text-white/80 hover:text-white"
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
            {/* زر الإغلاق */}
            <button onClick={onClose} className="p-2 text-white/80 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* محتوى الستوري */}
        <div 
          className="flex-1 flex items-center justify-center relative"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            if (x < rect.width / 3) {
              prevStory()
            } else if (x > (rect.width * 2) / 3) {
              nextStory()
            } else {
              setIsPaused(p => !p)
            }
          }}
        >
          {currentStory.type === 'text' ? (
            <div 
              className="w-full h-full flex items-center justify-center p-8"
              style={{ backgroundColor: currentStory.backgroundColor }}
            >
              <p 
                className="text-center text-2xl font-bold leading-relaxed"
                style={{ color: currentStory.textColor }}
              >
                {currentStory.caption}
              </p>
            </div>
          ) : currentStory.type === 'video' ? (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              muted={isMuted}
              loop={false}
            />
          ) : (
            <img 
              src={currentStory.mediaUrl} 
              alt="" 
              className="w-full h-full object-contain"
            />
          )}

          {/* النص المصاحب */}
          {currentStory.caption && currentStory.type !== 'text' && (
            <div className="absolute bottom-24 left-0 right-0 px-4">
              <div className="bg-black/50 backdrop-blur-sm rounded-xl p-3">
                <p className="text-white text-sm">{currentStory.caption}</p>
              </div>
            </div>
          )}
        </div>

        {/* أسهم التنقل */}
        {groupIndex > 0 && (
          <button
            onClick={prevStory}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full hover:bg-white/30 transition z-30"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}
        {groupIndex < storyGroups.length - 1 && (
          <button
            onClick={nextStory}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full hover:bg-white/30 transition z-30"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}

        {/* رابط الصنف */}
        {currentStory.menuItemId && (
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <a
              href={`/menu?restaurant=${currentStory.ownerId}`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold shadow-lg"
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
            >
              <ShoppingBag className="w-5 h-5" />
              اطلب {currentStory.menuItemName}
            </a>
          </div>
        )}
      </div>

      {/* معاينة المجموعات الأخرى */}
      <div className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 flex-col gap-2">
        {storyGroups.slice(Math.max(0, groupIndex - 2), groupIndex).map((group, idx) => (
          <button
            key={group.ownerId}
            onClick={() => { setGroupIndex(groupIndex - (groupIndex - idx)); setStoryIndex(0); setProgress(0) }}
            className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/30 hover:border-white transition opacity-50 hover:opacity-100"
          >
            {group.restaurantLogo ? (
              <img src={group.restaurantLogo} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                {group.restaurantName?.charAt(0)}
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2">
        {storyGroups.slice(groupIndex + 1, groupIndex + 3).map((group, idx) => (
          <button
            key={group.ownerId}
            onClick={() => { setGroupIndex(groupIndex + idx + 1); setStoryIndex(0); setProgress(0) }}
            className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/30 hover:border-white transition opacity-50 hover:opacity-100"
          >
            {group.restaurantLogo ? (
              <img src={group.restaurantLogo} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                {group.restaurantName?.charAt(0)}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default StoryViewer
