import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        // تقسيم الحزم لتحميل أسرع
        rollupOptions: {
            output: {
                manualChunks: {
                    // مكتبات React الأساسية
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    // Firebase - أكبر مكتبة
                    'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
                    // PayPal
                    'vendor-paypal': ['@paypal/react-paypal-js'],
                    // Lucide icons
                    'vendor-icons': ['lucide-react'],
                },
            },
        },
        // رفع الحد لأن Firebase كبير
        chunkSizeWarningLimit: 600,
    },
});
