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

  return (
    <div className="blog-admin-shell">
      <AdminSidebar />
      <div className="blog-admin-workspace">
        <AdminTopbar onRefresh={adminData.reload} />
        <main className="blog-admin-content">
          <Outlet context={adminData} />
        </main>
      </div>
    </div>
  )
}
