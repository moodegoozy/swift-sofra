/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      colors: {
        // تغيير الأبيض إلى رمادي فاتح
        white: '#f1f5f9', // slate-100
        primary: '#0EA5E9',      // 💎 سماوي فاخر
        secondary: '#F0F9FF',    // ⚪ أبيض سماوي خفيف
        accent: '#38BDF8',       // ✨ سماوي لامع
        dark: '#0C4A6E',         // 🌊 أزرق داكن فخم
        sky: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
        },
      },
      boxShadow: {
        'luxury': '0 25px 50px -12px rgba(14, 165, 233, 0.25)',
        'glow': '0 0 40px rgba(56, 189, 248, 0.4)',
        'card': '0 10px 40px rgba(0, 0, 0, 0.1)',
      },
      backgroundImage: {
        'gradient-luxury': 'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 50%, #7DD3FC 100%)',
        'gradient-white': 'linear-gradient(180deg, #FFFFFF 0%, #F0F9FF 100%)',
      },
      screens: {
        'xs': '375px',      // iPhone SE
        'sm': '640px',      // موبايلات كبيرة
        'md': '768px',      // آيباد
        'lg': '1024px',     // آيباد برو / لابتوب
        'xl': '1280px',     // شاشات كبيرة
        '2xl': '1536px',    // شاشات عريضة
      },
    },
  },
  plugins: [],
}
