import { useState } from 'react'
import { Outlet, useOutletContext } from 'react-router-dom'
import { AdminSidebar } from '../components/AdminSidebar'
import { AdminTopbar } from '../components/AdminTopbar'
import { useBlogAdminData } from '../hooks/useBlogAdminData'

export type BlogAdminWorkspaceContext = ReturnType<typeof useBlogAdminData>

export function useBlogAdminWorkspace() {
  return useOutletContext<BlogAdminWorkspaceContext>()
}

export function AdminBlogShell() {
  const adminData = useBlogAdminData()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="blog-admin-shell">
      <AdminSidebar onClose={() => setSidebarOpen(false)} open={sidebarOpen} />
      <div className="blog-admin-workspace">
        <AdminTopbar onMenuOpen={() => setSidebarOpen(true)} />
        <main className="blog-admin-content">
          <Outlet context={adminData} />
        </main>
      </div>
    </div>
  )
}
