import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminShell } from './components/AdminShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicRoute } from './components/PublicRoute'
import { ScrollToTop } from './components/ScrollToTop'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AdminAgentsPage } from './pages/AdminAgentsPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminLeadsPage } from './pages/AdminLeadsPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminPerformancePage } from './pages/AdminPerformancePage'
import { AdminPropertiesPage } from './pages/AdminPropertiesPage'
import { AdminSettingsPage } from './pages/AdminSettingsPage'
import { BrokerDashboardPage } from './pages/BrokerDashboardPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { HomePage } from './pages/HomePage'
import { AboutPage, CookiesPolicyPage, PrivacyPolicyPage, TermsPage } from './pages/InstitutionalPages'
import { LoginPage } from './pages/LoginPage'
import { PartnerPage } from './pages/PartnerPage'
import { PublicMapPage } from './pages/PublicMapPage'
import { RegisterPage } from './pages/RegisterPage'

const BlogPage = lazy(() => import('./modules/blog/pages/BlogPage').then((module) => ({ default: module.BlogPage })))
const BlogPostPage = lazy(() =>
  import('./modules/blog/pages/BlogPostPage').then((module) => ({ default: module.BlogPostPage })),
)
const AdminBlogShell = lazy(() =>
  import('./modules/blog/pages/AdminBlogShell').then((module) => ({ default: module.AdminBlogShell })),
)
const AdminBlogDashboardPage = lazy(() =>
  import('./modules/blog/pages/AdminBlogDashboardPage').then((module) => ({ default: module.AdminBlogDashboardPage })),
)
const AdminBlogPostsPage = lazy(() =>
  import('./modules/blog/pages/AdminBlogPostsPage').then((module) => ({ default: module.AdminBlogPostsPage })),
)
const AdminBlogPostFormPage = lazy(() =>
  import('./modules/blog/pages/AdminBlogPostFormPage').then((module) => ({ default: module.AdminBlogPostFormPage })),
)
const AdminBlogCategoriesPage = lazy(() =>
  import('./modules/blog/pages/AdminBlogCategoriesPage').then((module) => ({ default: module.AdminBlogCategoriesPage })),
)
const AdminBlogMediaPage = lazy(() =>
  import('./modules/blog/pages/AdminBlogMediaPage').then((module) => ({ default: module.AdminBlogMediaPage })),
)

function AdminEntry() {
  const { adminHomePath, isAuthenticated } = useAuth()
  return <Navigate to={isAuthenticated ? adminHomePath : '/admin/login'} replace />
}

function lazyRoute(element: ReactNode) {
  return <Suspense fallback={<p className="route-loading">Carregando...</p>}>{element}</Suspense>
}

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/favoritos" element={<FavoritesPage />} />
          <Route path="/aluguel" element={<PublicMapPage />} />
          <Route path="/compra" element={<PublicMapPage />} />
          <Route path="/novidades" element={<PublicMapPage />} />
          <Route path="/blog" element={lazyRoute(<BlogPage />)} />
          <Route path="/blog/:slug" element={lazyRoute(<BlogPostPage />)} />
          <Route path="/mapa" element={<PublicMapPage />} />
          <Route path="/sobre" element={<AboutPage />} />
          <Route path="/termos-de-uso" element={<TermsPage />} />
          <Route path="/politica-de-privacidade" element={<PrivacyPolicyPage />} />
          <Route path="/politica-de-cookies" element={<CookiesPolicyPage />} />
          <Route path="/seja-parceiro" element={<PartnerPage />} />

          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route path="/admin" element={<AdminEntry />} />
          <Route element={<PublicRoute />}>
            <Route path="/admin/login" element={<AdminLoginPage />} />
          </Route>

          <Route element={<ProtectedRoute loginPath="/admin/login" />}>
            <Route element={<AdminShell />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/imoveis" element={<AdminPropertiesPage />} />
              <Route path="/admin/corretores" element={<AdminAgentsPage />} />
              <Route path="/admin/leads" element={<AdminLeadsPage />} />
              <Route path="/admin/desempenho" element={<AdminPerformancePage />} />
              <Route path="/admin/configuracoes" element={<AdminSettingsPage />} />
              <Route path="/admin/corretor" element={<BrokerDashboardPage />} />
            </Route>

            <Route element={lazyRoute(<AdminBlogShell />)}>
              <Route path="/admin/blog" element={lazyRoute(<AdminBlogDashboardPage />)} />
              <Route path="/admin/blog/posts" element={lazyRoute(<AdminBlogPostsPage />)} />
              <Route path="/admin/blog/posts/new" element={lazyRoute(<AdminBlogPostFormPage />)} />
              <Route path="/admin/blog/posts/:id/edit" element={lazyRoute(<AdminBlogPostFormPage />)} />
              <Route path="/admin/blog/categories" element={lazyRoute(<AdminBlogCategoriesPage />)} />
              <Route path="/admin/blog/media" element={lazyRoute(<AdminBlogMediaPage />)} />
            </Route>
          </Route>

          <Route path="/app" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/app/users" element={<Navigate to="/admin/corretores" replace />} />
          <Route path="/app/properties" element={<Navigate to="/admin/imoveis" replace />} />
          <Route path="/users" element={<Navigate to="/admin/corretores" replace />} />
          <Route path="/properties" element={<Navigate to="/admin/imoveis" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
