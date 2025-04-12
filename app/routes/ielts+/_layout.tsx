import { Outlet } from 'react-router'
import { getUserId } from '#app/utils/auth.server'
import { json } from '#app/utils/router-helpers'
import { Link, useLoaderData } from 'react-router'
import { useState } from 'react'

export async function loader({ request }: { request: Request }) {
  // 获取用户ID，但不要求必须登录
  const userId = await getUserId(request)
  return json({ userId })
}

export default function IeltsLayout() {
  // We don't need to use the loader data anymore
  useLoaderData<typeof loader>()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="flex h-full min-h-screen bg-notion-bg-default text-notion-text-default">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-10 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
      {/* Toggle Button for Mobile */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-30 md:hidden bg-notion-bg-default rounded-md p-2 shadow-md border border-gray-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Left Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0 md:w-16'} bg-notion-bg-default border-r border-gray-200 fixed h-full overflow-y-auto z-20 transition-all duration-300 ease-in-out`}>
        <div className="p-4 relative">
          {/* Toggle Button */}
          <button
            onClick={toggleSidebar}
            className="absolute top-4 right-4 bg-notion-bg-gray/50 rounded-md p-1 hover:bg-notion-bg-gray transition-colors hidden md:block"
          >
            {sidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>

          <Link to="/ielts/passages" className={`flex items-center ${sidebarOpen ? 'space-x-2' : ''} text-notion-text-default hover:text-notion-text-blue transition-colors mb-8`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {sidebarOpen && <h1 className="text-lg font-medium">雅思阅读训练</h1>}
          </Link>

          {/* Top Bar Elements Moved to Sidebar */}
          <div className="flex flex-col space-y-2 mb-8">
            {/* Show in expanded mode */}
            <div className={`${sidebarOpen ? '' : 'hidden'} flex space-x-2`}>
              <Link to="/ielts/featured" className="flex-1 px-3 py-2 rounded-md text-sm border border-gray-200 bg-white hover:bg-gray-50 transition-colors flex justify-center">
                精选阅读
              </Link>

              <div className="flex-1 px-3 py-2 rounded-md text-sm border border-gray-200 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center justify-center space-x-2">
                <div className="flex items-center justify-center rounded-full h-6 w-6 overflow-hidden">
                  <img
                    src="/images/kaga-avatar.png"
                    alt="Kaga"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                    }}
                  />
                </div>
                <span className="text-sm font-medium">Kaga</span>
              </div>
            </div>

            {/* Show in collapsed mode */}
            <div className={`${sidebarOpen ? 'hidden' : ''} flex flex-col space-y-2`}>
              <Link to="/ielts/featured" className="w-full h-8 rounded-md flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </Link>

              <div className="w-full h-8 rounded-md flex items-center justify-center bg-amber-50 border border-gray-200 hover:bg-amber-100 transition-colors">
                <div className="flex items-center justify-center rounded-full h-6 w-6 overflow-hidden">
                  <img
                    src="/images/kaga-avatar.png"
                    alt="Kaga"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 font-medium text-notion-text-default">
            <Link
              to="/ielts/passages"
              className="px-3 py-2.5 rounded-md text-sm hover:bg-notion-bg-gray transition-colors flex items-center space-x-3 w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>文章库</span>
            </Link>

            <Link
              to="/ielts/import"
              className="px-3 py-2.5 rounded-md text-sm hover:bg-notion-bg-gray transition-colors flex items-center space-x-3 w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>导入PDF</span>
            </Link>

            <Link
              to="/ielts/generate"
              className="px-3 py-2.5 rounded-md text-sm hover:bg-notion-bg-gray transition-colors flex items-center space-x-3 w-full text-notion-text-blue"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>AI生成</span>
            </Link>

            <Link
              to="/ielts/learning-plan"
              className="px-3 py-2.5 rounded-md text-sm hover:bg-notion-bg-gray transition-colors flex items-center space-x-3 w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>学习计划</span>
            </Link>

            <div className="relative group w-full">
              <Link
                to="/ielts/vocabulary"
                className="px-3 py-2.5 rounded-md text-sm hover:bg-notion-bg-gray transition-colors flex items-center justify-between w-full"
              >
                <div className="flex items-center space-x-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>词汇管理</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <div className="pl-10 mt-1 space-y-1 hidden group-hover:block">
                <Link to="/ielts/vocabulary" className="block px-3 py-2 text-sm hover:bg-notion-bg-gray rounded-md">
                  词汇列表
                </Link>
                <Link to="/ielts/vocabulary/review" className="block px-3 py-2 text-sm hover:bg-notion-bg-gray rounded-md">
                  词汇复习
                </Link>
                <Link to="/ielts/vocabulary/test" className="block px-3 py-2 text-sm hover:bg-notion-bg-gray rounded-md">
                  词汇测试
                </Link>
              </div>
            </div>

            <Link
              to="/ielts/stats"
              className="px-3 py-2.5 rounded-md text-sm hover:bg-notion-bg-gray transition-colors flex items-center space-x-3 w-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>学习统计</span>
            </Link>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-0 md:ml-16'} min-h-screen transition-all duration-300`}>
        <div className="flex items-center mb-4 px-6">
          <button
            onClick={toggleSidebar}
            className="md:hidden mr-4 p-2 rounded-md hover:bg-notion-bg-gray transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xl font-medium">雅思阅读文章库</h1>
          <div className="text-sm text-notion-text-gray ml-2">浏览和练习雅思阅读文章</div>
        </div>
        <main className="container mx-auto px-6 notion-page">
          <Outlet />
        </main>

        {/* Footer removed */}
      </div>
    </div>
  )
}