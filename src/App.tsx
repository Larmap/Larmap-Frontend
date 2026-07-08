import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminShell } from './components/AdminShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicRoute } from './components/PublicRoute'
import { ScrollToTop } from './components/ScrollToTop'
import { SEO } from './components/SEO'
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
import { getPublicPageConfig } from './seo/sitemap/config'

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

function publicPageRoute(path: string, element: ReactNode) {
  const seo = getPublicPageConfig(path)

  return (
    <>
      {seo ? <SEO canonical={seo.path} description={seo.description} title={seo.title} /> : null}
      {element}
    </>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <SEO />
      <ScrollToTop />
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={publicPageRoute('/', <HomePage />)}
          />
          <Route path="/favoritos" element={<FavoritesPage />} />
          <Route
            path="/aluguel"
            element={publicPageRoute('/aluguel', <PublicMapPage />)}
          />
          <Route
            path="/compra"
            element={publicPageRoute('/compra', <PublicMapPage />)}
          />
          <Route
            path="/novidades"
            element={publicPageRoute('/novidades', <PublicMapPage />)}
          />
          <Route
            path="/blog"
            element={publicPageRoute('/blog', lazyRoute(<BlogPage />))}
          />
          <Route path="/blog/:slug" element={lazyRoute(<BlogPostPage />)} />
          <Route
            path="/mapa"
            element={publicPageRoute('/mapa', <PublicMapPage />)}
          />
          <Route
            path="/sobre"
            element={publicPageRoute('/sobre', <AboutPage />)}
          />
          <Route
            path="/termos-de-uso"
            element={publicPageRoute('/termos-de-uso', <TermsPage />)}
          />
          <Route
            path="/politica-de-privacidade"
            element={publicPageRoute('/politica-de-privacidade', <PrivacyPolicyPage />)}
          />
          <Route
            path="/politica-de-cookies"
            element={publicPageRoute('/politica-de-cookies', <CookiesPolicyPage />)}
          />
          <Route
            path="/seja-parceiro"
            element={publicPageRoute('/seja-parceiro', <PartnerPage />)}
          />

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
