// src/components/TopBar.tsx
import React from 'react'
import { Sparkles } from 'lucide-react'

export const TopBar: React.FC = () => {
  return (
    <div 
      className="w-full bg-gradient-to-r from-sky-500 via-sky-400 to-sky-500 text-white py-2 sm:py-3 overflow-hidden shadow-lg"
    >
      <div className="flex items-center justify-center gap-1 sm:gap-2 px-2">
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse flex-shrink-0" />
        <div className="marquee whitespace-nowrap font-bold text-xs sm:text-sm tracking-wide">
          ✨ مرحباً بك في سفرة البيت — أشهى الأكلات توصلك لين باب بيتك! 🚗💨
        </div>
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse flex-shrink-0" />
      </div>
    </div>
  )
}
