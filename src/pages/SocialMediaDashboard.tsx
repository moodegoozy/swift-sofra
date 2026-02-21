// src/pages/SocialMediaDashboard.tsx
// لوحة تحكم مسؤولة السوشيال ميديا - إدارة المحتوى والإحصائيات التسويقية
import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/auth'
import { db } from '@/firebase'
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc, addDoc, deleteDoc, orderBy, limit, Timestamp, setDoc } from 'firebase/firestore'
import { useToast } from '@/components/ui/Toast'
import { 
  LayoutDashboard,
  Users,
  Heart,
  MousePointer,
  TrendingUp,
  Calendar,
  FileText,
  BarChart3,
  Image,
  Video,
  Link2,
  Eye,
  MessageCircle,
  Share2,
  Plus,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Target,
  Megaphone,
  Instagram,
  Send,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  Star,
  Sparkles,
  ExternalLink,
  Zap
} from 'lucide-react'

// ====== الأنواع ======
interface SocialStats {
  followers: number
  followersGrowth: number // نسبة النمو
  engagementRate: number // نسبة التفاعل
  appClicks: number // نقرات رابط التطبيق
  whatsappClicks: number // نقرات واتساب
  totalReach: number // الوصول الكلي
  impressions: number // الظهور
}

interface ContentPost {
  id: string
  title: string
  description?: string
  type: 'image' | 'video' | 'carousel' | 'reel' | 'story'
  platform: 'instagram' | 'twitter' | 'tiktok' | 'snapchat' | 'all'
  status: 'draft' | 'scheduled' | 'published' | 'archived'
  scheduledAt?: Date
  publishedAt?: Date
  mediaUrl?: string
  // إحصائيات المنشور
  views?: number
  likes?: number
  comments?: number
  shares?: number
  saves?: number
  clicks?: number
  createdAt: Date
  updatedAt?: Date
}

interface Campaign {
  id: string
  name: string
  description?: string
  platform: string
  budget: number
  spent: number
  startDate: Date
  endDate?: Date
  status: 'active' | 'paused' | 'completed' | 'draft'
  // الأداء
  impressions: number
  reach: number
  clicks: number
  conversions: number
  costPerClick?: number
  roi?: number // العائد على الاستثمار
}

interface ContentCalendarItem {
  id: string
  date: Date
  posts: ContentPost[]
}

// ====== المكون الرئيسي ======
export const SocialMediaDashboard: React.FC = () => {
  const { user } = useAuth()
  const toast = useToast()
  
  // ====== الحالات ======
  const [activeTab, setActiveTab] = useState<'dashboard' | 'content' | 'calendar' | 'campaigns' | 'reports'>('dashboard')
  const [stats, setStats] = useState<SocialStats>({
    followers: 0,
    followersGrowth: 0,
    engagementRate: 0,
    appClicks: 0,
    whatsappClicks: 0,
    totalReach: 0,
    impressions: 0
  })
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter'>('month')
  const [showAddPost, setShowAddPost] = useState(false)
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null)
  const [expandedPost, setExpandedPost] = useState<string | null>(null)

  // نموذج منشور جديد
  const [newPost, setNewPost] = useState({
    title: '',
    description: '',
    type: 'image' as ContentPost['type'],
    platform: 'instagram' as ContentPost['platform'],
    status: 'draft' as ContentPost['status'],
    scheduledAt: ''
  })

  // ====== جلب البيانات ======
  useEffect(() => {
    if (!user?.uid) return

    setLoading(true)

    // جلب إحصائيات السوشيال ميديا
    const statsRef = doc(db, 'socialMediaStats', 'current')
    const unsubStats = onSnapshot(statsRef, (snap) => {
      if (snap.exists()) {
        setStats(snap.data() as SocialStats)
      }
    })

    // جلب المنشورات
    const postsQuery = query(
      collection(db, 'socialMediaPosts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    const unsubPosts = onSnapshot(postsQuery, (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || new Date(),
        scheduledAt: d.data().scheduledAt?.toDate?.(),
        publishedAt: d.data().publishedAt?.toDate?.(),
        updatedAt: d.data().updatedAt?.toDate?.()
      })) as ContentPost[]
      setPosts(data)
    })

    // جلب الحملات
    const campaignsQuery = query(
      collection(db, 'socialMediaCampaigns'),
      orderBy('startDate', 'desc'),
      limit(20)
    )
    const unsubCampaigns = onSnapshot(campaignsQuery, (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        startDate: d.data().startDate?.toDate?.() || new Date(),
        endDate: d.data().endDate?.toDate?.()
      })) as Campaign[]
      setCampaigns(data)
    })

    setLoading(false)

    return () => {
      unsubStats()
      unsubPosts()
      unsubCampaigns()
    }
  }, [user?.uid])

  // ====== حسابات الإحصائيات ======
  const contentStats = useMemo(() => {
    const published = posts.filter(p => p.status === 'published')
    const scheduled = posts.filter(p => p.status === 'scheduled')
    const drafts = posts.filter(p => p.status === 'draft')

    const totalViews = published.reduce((sum, p) => sum + (p.views || 0), 0)
    const totalLikes = published.reduce((sum, p) => sum + (p.likes || 0), 0)
    const totalComments = published.reduce((sum, p) => sum + (p.comments || 0), 0)
    const totalShares = published.reduce((sum, p) => sum + (p.shares || 0), 0)

    // أفضل منشور بالتفاعل
    const bestPost = published.sort((a, b) => 
      ((b.likes || 0) + (b.comments || 0) + (b.shares || 0)) - 
      ((a.likes || 0) + (a.comments || 0) + (a.shares || 0))
    )[0]

    return {
      totalPosts: posts.length,
      published: published.length,
      scheduled: scheduled.length,
      drafts: drafts.length,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      bestPost,
      avgEngagement: published.length > 0 
        ? ((totalLikes + totalComments + totalShares) / published.length).toFixed(1)
        : 0
    }
  }, [posts])

  const campaignStats = useMemo(() => {
    const active = campaigns.filter(c => c.status === 'active')
    const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0)
    const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0)
    const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0)
    const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0)

    return {
      total: campaigns.length,
      active: active.length,
      totalBudget,
      totalSpent,
      totalClicks,
      totalConversions,
      avgCPC: totalClicks > 0 ? (totalSpent / totalClicks).toFixed(2) : 0
    }
  }, [campaigns])

  // ====== إضافة منشور ======
  const handleAddPost = async () => {
    if (!newPost.title.trim()) {
      toast.warning('يرجى إدخال عنوان المنشور')
      return
    }

    try {
      await addDoc(collection(db, 'socialMediaPosts'), {
        ...newPost,
        scheduledAt: newPost.scheduledAt ? new Date(newPost.scheduledAt) : null,
        createdAt: new Date(),
        createdBy: user?.uid,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        clicks: 0
      })
      
      toast.success('تم إضافة المنشور')
      setShowAddPost(false)
      setNewPost({
        title: '',
        description: '',
        type: 'image',
        platform: 'instagram',
        status: 'draft',
        scheduledAt: ''
      })
    } catch (err) {
      toast.error('فشل إضافة المنشور')
    }
  }

  // ====== حذف منشور ======
  const handleDeletePost = async (postId: string) => {
    if (!confirm('هل تريد حذف هذا المنشور؟')) return
    
    try {
      await deleteDoc(doc(db, 'socialMediaPosts', postId))
      toast.success('تم حذف المنشور')
    } catch (err) {
      toast.error('فشل حذف المنشور')
    }
  }

  // ====== تغيير حالة المنشور ======
  const handleUpdatePostStatus = async (postId: string, status: ContentPost['status']) => {
    try {
      await updateDoc(doc(db, 'socialMediaPosts', postId), {
        status,
        updatedAt: new Date(),
        ...(status === 'published' ? { publishedAt: new Date() } : {})
      })
      toast.success('تم تحديث حالة المنشور')
    } catch (err) {
      toast.error('فشل تحديث الحالة')
    }
  }

  // ====== تحديث الإحصائيات ======
  const handleUpdateStats = async (field: keyof SocialStats, value: number) => {
    try {
      await setDoc(doc(db, 'socialMediaStats', 'current'), {
        ...stats,
        [field]: value,
        updatedAt: new Date(),
        updatedBy: user?.uid
      }, { merge: true })
      toast.success('تم تحديث الإحصائيات')
    } catch (err) {
      toast.error('فشل تحديث الإحصائيات')
    }
  }

  // ====== تنسيق التاريخ ======
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // ====== أيقونة نوع المحتوى ======
  const getTypeIcon = (type: ContentPost['type']) => {
    switch (type) {
      case 'image': return <Image className="w-4 h-4" />
      case 'video': return <Video className="w-4 h-4" />
      case 'reel': return <Zap className="w-4 h-4" />
      case 'story': return <Sparkles className="w-4 h-4" />
      case 'carousel': return <FileText className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  // ====== أيقونة المنصة ======
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="w-4 h-4" />
      case 'twitter': return <Send className="w-4 h-4" />
      case 'tiktok': return <Video className="w-4 h-4" />
      default: return <Share2 className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 flex items-center justify-center">
        <div className="text-indigo-400 text-xl">جارٍ التحميل...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white" dir="rtl">
      {/* الهيدر */}
      <header className="bg-slate-900/50 backdrop-blur-xl border-b border-indigo-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                لوحة تحكم السوشيال ميديا
              </h1>
              <p className="text-xs text-slate-400">إدارة المحتوى والتسويق</p>
            </div>
          </div>
          
          {/* إحصائيات سريعة */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-3 py-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="font-bold">{stats.followers.toLocaleString()}</span>
              <span className="text-xs text-slate-400">متابع</span>
            </div>
            <div className="flex items-center gap-2 bg-pink-500/10 border border-pink-500/30 rounded-xl px-3 py-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <span className="font-bold">{stats.engagementRate.toFixed(1)}%</span>
              <span className="text-xs text-slate-400">تفاعل</span>
            </div>
          </div>
        </div>
      </header>

      {/* التبويبات */}
      <nav className="bg-slate-900/30 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {[
              { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'content', label: 'المحتوى', icon: <FileText className="w-4 h-4" /> },
              { id: 'calendar', label: 'جدول النشر', icon: <Calendar className="w-4 h-4" /> },
              { id: 'campaigns', label: 'الحملات', icon: <Target className="w-4 h-4" /> },
              { id: 'reports', label: 'التقارير', icon: <BarChart3 className="w-4 h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-700/50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* المحتوى */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* ====== الرئيسية ====== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* بطاقات الإحصائيات الرئيسية */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* المتابعين */}
              <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-400" />
                  </div>
                  <span className="text-sm text-slate-400">المتابعين</span>
                </div>
                <div className="text-2xl font-bold text-indigo-400">{stats.followers.toLocaleString()}</div>
                <div className="flex items-center gap-1 mt-1">
                  {stats.followersGrowth >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <TrendingUp className="w-3 h-3 text-red-400 rotate-180" />
                  )}
                  <span className={`text-xs ${stats.followersGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {stats.followersGrowth}%
                  </span>
                </div>
              </div>

              {/* نسبة التفاعل */}
              <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 border border-pink-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-pink-500/20 rounded-xl flex items-center justify-center">
                    <Heart className="w-5 h-5 text-pink-400" />
                  </div>
                  <span className="text-sm text-slate-400">نسبة التفاعل</span>
                </div>
                <div className="text-2xl font-bold text-pink-400">{stats.engagementRate.toFixed(1)}%</div>
              </div>

              {/* نقرات التطبيق */}
              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <MousePointer className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-sm text-slate-400">نقرات التطبيق</span>
                </div>
                <div className="text-2xl font-bold text-emerald-400">{stats.appClicks.toLocaleString()}</div>
              </div>

              {/* نقرات واتساب */}
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-sm text-slate-400">نقرات واتساب</span>
                </div>
                <div className="text-2xl font-bold text-green-400">{stats.whatsappClicks.toLocaleString()}</div>
              </div>
            </div>

            {/* إحصائيات الوصول */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-400" />
                  الوصول والظهور
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl">
                    <span className="text-slate-400">إجمالي الوصول</span>
                    <span className="font-bold text-indigo-400">{stats.totalReach.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-xl">
                    <span className="text-slate-400">الظهور (Impressions)</span>
                    <span className="font-bold">{stats.impressions.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* أداء المحتوى */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  أداء المحتوى
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-slate-700/30 rounded-xl">
                    <div className="text-2xl font-bold">{contentStats.totalPosts}</div>
                    <div className="text-xs text-slate-500">إجمالي المنشورات</div>
                  </div>
                  <div className="text-center p-3 bg-slate-700/30 rounded-xl">
                    <div className="text-2xl font-bold text-emerald-400">{contentStats.published}</div>
                    <div className="text-xs text-slate-500">منشور</div>
                  </div>
                  <div className="text-center p-3 bg-slate-700/30 rounded-xl">
                    <div className="text-2xl font-bold text-pink-400">{contentStats.totalLikes}</div>
                    <div className="text-xs text-slate-500">إعجاب</div>
                  </div>
                  <div className="text-center p-3 bg-slate-700/30 rounded-xl">
                    <div className="text-2xl font-bold text-blue-400">{contentStats.avgEngagement}</div>
                    <div className="text-xs text-slate-500">متوسط التفاعل</div>
                  </div>
                </div>
              </div>
            </div>

            {/* أداء الحملات */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                أداء الحملات الإعلانية
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                  <div className="text-3xl font-bold text-amber-400">{campaignStats.active}</div>
                  <div className="text-sm text-slate-400">حملة نشطة</div>
                </div>
                <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                  <div className="text-3xl font-bold">{campaignStats.totalClicks.toLocaleString()}</div>
                  <div className="text-sm text-slate-400">نقرات</div>
                </div>
                <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                  <div className="text-3xl font-bold text-emerald-400">{campaignStats.totalConversions}</div>
                  <div className="text-sm text-slate-400">تحويلات</div>
                </div>
                <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                  <div className="text-3xl font-bold text-indigo-400">{campaignStats.avgCPC}</div>
                  <div className="text-sm text-slate-400">تكلفة النقرة</div>
                </div>
              </div>
            </div>

            {/* تعديل الإحصائيات يدوياً */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Edit className="w-5 h-5 text-slate-400" />
                تحديث الإحصائيات
              </h3>
              <p className="text-sm text-slate-500 mb-4">يمكنك تحديث الإحصائيات يدوياً من هنا</p>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">عدد المتابعين</label>
                  <input
                    type="number"
                    value={stats.followers}
                    onChange={e => handleUpdateStats('followers', parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">نسبة النمو %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={stats.followersGrowth}
                    onChange={e => handleUpdateStats('followersGrowth', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">نسبة التفاعل %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={stats.engagementRate}
                    onChange={e => handleUpdateStats('engagementRate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">نقرات التطبيق</label>
                  <input
                    type="number"
                    value={stats.appClicks}
                    onChange={e => handleUpdateStats('appClicks', parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">نقرات واتساب</label>
                  <input
                    type="number"
                    value={stats.whatsappClicks}
                    onChange={e => handleUpdateStats('whatsappClicks', parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">الوصول الكلي</label>
                  <input
                    type="number"
                    value={stats.totalReach}
                    onChange={e => handleUpdateStats('totalReach', parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====== إدارة المحتوى ====== */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">إدارة المحتوى</h2>
              <button
                onClick={() => setShowAddPost(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                منشور جديد
              </button>
            </div>

            {/* نموذج إضافة منشور */}
            {showAddPost && (
              <div className="bg-slate-800/50 border border-indigo-500/30 rounded-2xl p-4">
                <h3 className="font-bold mb-4">إضافة منشور جديد</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">العنوان *</label>
                    <input
                      type="text"
                      value={newPost.title}
                      onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))}
                      placeholder="عنوان المنشور"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">نوع المحتوى</label>
                    <select
                      value={newPost.type}
                      onChange={e => setNewPost(p => ({ ...p, type: e.target.value as any }))}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="image">صورة</option>
                      <option value="video">فيديو</option>
                      <option value="reel">ريلز</option>
                      <option value="story">ستوري</option>
                      <option value="carousel">كاروسيل</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">المنصة</label>
                    <select
                      value={newPost.platform}
                      onChange={e => setNewPost(p => ({ ...p, platform: e.target.value as any }))}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="instagram">انستقرام</option>
                      <option value="twitter">تويتر</option>
                      <option value="tiktok">تيك توك</option>
                      <option value="snapchat">سناب شات</option>
                      <option value="all">جميع المنصات</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">تاريخ النشر (اختياري)</label>
                    <input
                      type="datetime-local"
                      value={newPost.scheduledAt}
                      onChange={e => setNewPost(p => ({ ...p, scheduledAt: e.target.value, status: e.target.value ? 'scheduled' : 'draft' }))}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-500 block mb-1">الوصف</label>
                    <textarea
                      value={newPost.description}
                      onChange={e => setNewPost(p => ({ ...p, description: e.target.value }))}
                      placeholder="وصف المنشور..."
                      rows={3}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAddPost}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm"
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => setShowAddPost(false)}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-sm"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {/* قائمة المنشورات */}
            <div className="space-y-3">
              {posts.length === 0 ? (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 text-center">
                  <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <div className="text-slate-400">لا توجد منشورات</div>
                </div>
              ) : (
                posts.map(post => (
                  <div 
                    key={post.id}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden"
                  >
                    <div 
                      className="p-4 cursor-pointer hover:bg-slate-700/20 transition-colors"
                      onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-700/50 rounded-xl flex items-center justify-center">
                            {getTypeIcon(post.type)}
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {post.title}
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                post.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' :
                                post.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                                post.status === 'draft' ? 'bg-slate-500/20 text-slate-400' :
                                'bg-slate-600/20 text-slate-500'
                              }`}>
                                {post.status === 'published' ? 'منشور' :
                                 post.status === 'scheduled' ? 'مجدول' :
                                 post.status === 'draft' ? 'مسودة' : 'مؤرشف'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                              {getPlatformIcon(post.platform)}
                              {post.platform === 'instagram' ? 'انستقرام' :
                               post.platform === 'twitter' ? 'تويتر' :
                               post.platform === 'tiktok' ? 'تيك توك' :
                               post.platform === 'snapchat' ? 'سناب شات' : 'جميع المنصات'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          {post.status === 'published' && (
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" /> {post.views || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" /> {post.likes || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" /> {post.comments || 0}
                              </span>
                            </div>
                          )}
                          {expandedPost === post.id ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* التفاصيل الموسعة */}
                    {expandedPost === post.id && (
                      <div className="border-t border-slate-700/50 p-4 bg-slate-800/30">
                        {post.description && (
                          <p className="text-sm text-slate-400 mb-4">{post.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-2">
                          {post.status === 'draft' && (
                            <>
                              <button
                                onClick={() => handleUpdatePostStatus(post.id, 'published')}
                                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-3 py-1 rounded-lg text-sm"
                              >
                                نشر الآن
                              </button>
                              <button
                                onClick={() => handleUpdatePostStatus(post.id, 'scheduled')}
                                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1 rounded-lg text-sm"
                              >
                                جدولة
                              </button>
                            </>
                          )}
                          {post.status === 'scheduled' && (
                            <button
                              onClick={() => handleUpdatePostStatus(post.id, 'published')}
                              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-3 py-1 rounded-lg text-sm"
                            >
                              نشر الآن
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdatePostStatus(post.id, 'archived')}
                            className="bg-slate-500/20 hover:bg-slate-500/30 text-slate-400 px-3 py-1 rounded-lg text-sm"
                          >
                            أرشفة
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1 rounded-lg text-sm"
                          >
                            حذف
                          </button>
                        </div>

                        <div className="text-xs text-slate-500 mt-3">
                          أُنشئ: {formatDate(post.createdAt)}
                          {post.publishedAt && ` • نُشر: ${formatDate(post.publishedAt)}`}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ====== جدول النشر ====== */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-400" />
              جدول نشر المحتوى
            </h2>
            
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                  <div className="text-2xl font-bold text-emerald-400">{contentStats.published}</div>
                  <div className="text-sm text-slate-400">منشور</div>
                </div>
                <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                  <div className="text-2xl font-bold text-blue-400">{contentStats.scheduled}</div>
                  <div className="text-sm text-slate-400">مجدول</div>
                </div>
                <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                  <div className="text-2xl font-bold text-slate-400">{contentStats.drafts}</div>
                  <div className="text-sm text-slate-400">مسودة</div>
                </div>
              </div>

              {/* المنشورات المجدولة */}
              <h3 className="font-bold mb-3">المنشورات المجدولة القادمة</h3>
              <div className="space-y-2">
                {posts.filter(p => p.status === 'scheduled').length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    لا توجد منشورات مجدولة
                  </div>
                ) : (
                  posts.filter(p => p.status === 'scheduled').map(post => (
                    <div key={post.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(post.type)}
                        <div>
                          <div className="font-medium">{post.title}</div>
                          <div className="text-xs text-slate-500">
                            {post.scheduledAt ? formatDate(post.scheduledAt) : 'غير محدد'}
                          </div>
                        </div>
                      </div>
                      {getPlatformIcon(post.platform)}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====== الحملات ====== */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Target className="w-6 h-6 text-amber-400" />
              الحملات الإعلانية
            </h2>

            {/* ملخص الحملات */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-amber-400">{campaignStats.total}</div>
                <div className="text-sm text-slate-400">إجمالي الحملات</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-emerald-400">{campaignStats.active}</div>
                <div className="text-sm text-slate-400">نشطة الآن</div>
              </div>
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-blue-400">{campaignStats.totalBudget.toLocaleString()}</div>
                <div className="text-sm text-slate-400">إجمالي الميزانية</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-purple-400">{campaignStats.totalSpent.toLocaleString()}</div>
                <div className="text-sm text-slate-400">إجمالي المصروف</div>
              </div>
            </div>

            {/* قائمة الحملات */}
            <div className="space-y-3">
              {campaigns.length === 0 ? (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 text-center">
                  <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <div className="text-slate-400">لا توجد حملات</div>
                </div>
              ) : (
                campaigns.map(campaign => (
                  <div 
                    key={campaign.id}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold">{campaign.name}</h3>
                        <div className="text-sm text-slate-500">{campaign.platform}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        campaign.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                        campaign.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                        campaign.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {campaign.status === 'active' ? 'نشطة' :
                         campaign.status === 'paused' ? 'متوقفة' :
                         campaign.status === 'completed' ? 'مكتملة' : 'مسودة'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div className="bg-slate-700/30 rounded-lg p-2">
                        <div className="font-bold">{campaign.impressions.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">ظهور</div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-2">
                        <div className="font-bold">{campaign.clicks.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">نقرات</div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-2">
                        <div className="font-bold text-emerald-400">{campaign.conversions}</div>
                        <div className="text-xs text-slate-500">تحويلات</div>
                      </div>
                      <div className="bg-slate-700/30 rounded-lg p-2">
                        <div className="font-bold text-amber-400">{campaign.spent.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">مصروف</div>
                      </div>
                    </div>

                    {/* شريط التقدم */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>الميزانية المستخدمة</span>
                        <span>{campaign.budget > 0 ? ((campaign.spent / campaign.budget) * 100).toFixed(0) : 0}%</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                          style={{ width: `${campaign.budget > 0 ? Math.min((campaign.spent / campaign.budget) * 100, 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ====== التقارير ====== */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-indigo-400" />
                التقارير والإحصائيات
              </h2>
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value as any)}
                className="bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm"
              >
                <option value="week">آخر أسبوع</option>
                <option value="month">آخر شهر</option>
                <option value="quarter">آخر 3 أشهر</option>
              </select>
            </div>

            {/* تقرير نمو الحساب */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                نمو الحساب
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                  <div className="text-3xl font-bold text-indigo-400">{stats.followers.toLocaleString()}</div>
                  <div className="text-sm text-slate-400">إجمالي المتابعين</div>
                  <div className={`text-xs mt-1 ${stats.followersGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {stats.followersGrowth >= 0 ? '+' : ''}{stats.followersGrowth}% هذا الشهر
                  </div>
                </div>
                <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                  <div className="text-3xl font-bold text-pink-400">{stats.engagementRate.toFixed(1)}%</div>
                  <div className="text-sm text-slate-400">متوسط التفاعل</div>
                </div>
                <div className="text-center p-4 bg-slate-700/30 rounded-xl">
                  <div className="text-3xl font-bold text-emerald-400">{stats.totalReach.toLocaleString()}</div>
                  <div className="text-sm text-slate-400">الوصول الكلي</div>
                </div>
              </div>
            </div>

            {/* أفضل محتوى */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400" />
                أفضل المحتوى أداءً
              </h3>
              {contentStats.bestPost ? (
                <div className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    {getTypeIcon(contentStats.bestPost.type)}
                    <div>
                      <div className="font-bold">{contentStats.bestPost.title}</div>
                      <div className="text-xs text-slate-500">
                        {contentStats.bestPost.publishedAt ? formatDate(contentStats.bestPost.publishedAt) : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4 text-slate-400" />
                      {contentStats.bestPost.views || 0} مشاهدة
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4 text-pink-400" />
                      {contentStats.bestPost.likes || 0} إعجاب
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4 text-blue-400" />
                      {contentStats.bestPost.comments || 0} تعليق
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  لا توجد منشورات بعد
                </div>
              )}
            </div>

            {/* الحملات الناجحة */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                أداء الحملات
              </h3>
              <div className="space-y-3">
                {campaigns.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    لا توجد حملات
                  </div>
                ) : (
                  campaigns.slice(0, 5).map(campaign => (
                    <div key={campaign.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                      <div>
                        <div className="font-medium">{campaign.name}</div>
                        <div className="text-xs text-slate-500">{campaign.platform}</div>
                      </div>
                      <div className="text-left">
                        <div className="text-emerald-400 font-bold">{campaign.conversions} تحويل</div>
                        <div className="text-xs text-slate-500">
                          CPC: {campaign.clicks > 0 ? (campaign.spent / campaign.clicks).toFixed(2) : 0} ر.س
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ملاحظة الصلاحيات */}
      <div className="fixed bottom-4 left-4 bg-slate-800/90 backdrop-blur border border-indigo-500/30 rounded-xl p-3 text-xs text-slate-400 max-w-xs">
        <div className="flex items-center gap-2 text-indigo-400 font-medium mb-1">
          <Lock className="w-3 h-3" />
          صلاحياتك
        </div>
        <p>إدارة المحتوى والإحصائيات التسويقية فقط. لا يمكنك تعديل الطلبات أو الأرباح.</p>
      </div>
    </div>
  )
}

// مكون القفل للصلاحيات
const Lock: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export default SocialMediaDashboard
