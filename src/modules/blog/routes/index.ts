export const blogRoutes = {
  admin: '/admin/blog',
  adminCategories: '/admin/blog/categories',
  adminMedia: '/admin/blog/media',
  adminPostEdit: '/admin/blog/posts/:id/edit',
  adminPostNew: '/admin/blog/posts/new',
  adminPosts: '/admin/blog/posts',
  detail: '/blog/:slug',
  list: '/blog',
} as const
