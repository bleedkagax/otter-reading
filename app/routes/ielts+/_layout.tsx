import { Outlet, Form } from 'react-router'
import { getUserId } from '#app/utils/auth.server'
import { json } from '#app/utils/router-helpers'
import { Link, useLoaderData } from 'react-router'
import { useState } from 'react'
import { ThemeSwitch } from '#app/routes/resources+/theme-switch.tsx'
import { getUserImgSrc } from '#app/utils/misc.tsx'
import { Img } from 'openimg/react'
import { prisma } from '#app/utils/db.server'

import { getTheme, type Theme } from '#app/utils/theme.server.ts'

export async function loader({ request }: { request: Request }) {
  // 获取用户ID，但不要求必须登录
  const userId = await getUserId(request)

  // 获取用户信息
  let user = null
  if (userId) {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        username: true,
        image: { select: { objectKey: true } }
      }
    })
  }

  return json({
    userId,
    user,
    userPrefs: {
      theme: getTheme(request),
    }
  })
}

// 定义加载器返回的数据类型
type LoaderData = {
  userId: string | null;
  user: {
    id: string;
    name: string | null;
    username: string;
    image: { objectKey: string } | null;
  } | null;
  userPrefs: {
    theme: Theme | null;
  };
};

export default function IeltsLayout() {
  // Get loader data for theme preferences
  const data = useLoaderData<typeof loader>() as LoaderData
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
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0 md:w-14'} bg-notion-bg-default border-r border-gray-200 fixed h-full overflow-y-auto z-20 transition-all duration-300 ease-in-out`}>
        <div className={`${sidebarOpen ? 'p-4' : 'p-2'} relative`}>
          {/* Toggle Button */}
          <button
            onClick={toggleSidebar}
            className={`absolute ${sidebarOpen ? 'top-4 right-4' : 'top-2 right-2'} bg-notion-bg-gray/50 rounded-md p-1 hover:bg-notion-bg-gray transition-colors hidden md:block`}
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

          <Link to="/ielts/passages" className={`flex ${sidebarOpen ? 'items-center space-x-2' : 'justify-center'} text-notion-text-default hover:text-notion-text-blue transition-colors mb-6`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {sidebarOpen && <h1 className="text-lg font-medium">雅思阅读训练</h1>}
          </Link>

          {/* Spacer */}
          <div className="mb-8"></div>

          {/* Navigation Links */}
          <nav className="space-y-1 font-medium text-notion-text-default">
            <Link
              to="/ielts/dashboard"
              className={`px-3 py-2.5 rounded-md text-sm hover:bg-notion-bg-gray transition-colors flex ${sidebarOpen ? 'items-center space-x-3' : 'justify-center'} w-full`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h2a1 1 0 001-1v-7m-6 0a1 1 0 00-1 1v3" />
              </svg>
              {sidebarOpen && <span>仪表盘</span>}
            </Link>

            <Link
              to="/ielts/passages"
              className={`px-3 py-2.5 rounded-md text-sm hover:bg-notion-bg-gray transition-colors flex ${sidebarOpen ? 'items-center space-x-3' : 'justify-center'} w-full`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {sidebarOpen && <span>文章库</span>}
            </Link>

            <Link
              to="/ielts/import"
              className={`px-3 py-2.5 rounded-md text-sm hover:bg-notion-bg-gray transition-colors flex ${sidebarOpen ? 'items-center space-x-3' : 'justify-center'} w-full`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              {sidebarOpen && <span>导入PDF</span>}
            </Link>

            <Link
              to="/ielts/generate"
              className={`px-3 py-2.5 rounded-md text-sm hover:bg-notion-bg-gray transition-colors flex ${sidebarOpen ? 'items-center space-x-3' : 'justify-center'} w-full text-notion-text-blue`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {sidebarOpen && <span>AI生成</span>}
            </Link>

            <Link
              to="/ielts/learning-plan"
              className={`px-3 py-2.5 rounded-md text-sm hover:bg-notion-bg-gray transition-colors flex ${sidebarOpen ? 'items-center space-x-3' : 'justify-center'} w-full`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {sidebarOpen && <span>学习计划</span>}
            </Link>

            <div className="relative group w-full">
              <Link
                to="/ielts/vocabulary"
                className={`px-3 py-2.5 rounded-md text-sm hover:bg-notion-bg-gray transition-colors flex ${sidebarOpen ? 'items-center justify-between' : 'justify-center'} w-full`}
              >
                {sidebarOpen ? (
                  <>
                    <div className="flex items-center space-x-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span>词汇管理</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                )}
              </Link>
              <div className={`${sidebarOpen ? 'pl-10' : 'pl-2'} mt-1 space-y-1 hidden group-hover:block`}>
                {sidebarOpen ? (
                  <>
                    <Link to="/ielts/vocabulary" className="block px-3 py-2 text-sm hover:bg-notion-bg-gray rounded-md">
                      词汇列表
                    </Link>
                    <Link to="/ielts/vocabulary/review" className="block px-3 py-2 text-sm hover:bg-notion-bg-gray rounded-md">
                      词汇复习
                    </Link>
                    <Link to="/ielts/vocabulary/test" className="block px-3 py-2 text-sm hover:bg-notion-bg-gray rounded-md">
                      词汇测试
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/ielts/vocabulary" className="block p-2 text-sm hover:bg-notion-bg-gray rounded-md flex justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </Link>
                    <Link to="/ielts/vocabulary/review" className="block p-2 text-sm hover:bg-notion-bg-gray rounded-md flex justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </Link>
                    <Link to="/ielts/vocabulary/test" className="block p-2 text-sm hover:bg-notion-bg-gray rounded-md flex justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </Link>
                  </>
                )}
              </div>
            </div>

            <Link
              to="/ielts/stats"
              className={`px-3 py-2.5 rounded-md text-sm hover:bg-notion-bg-gray transition-colors flex ${sidebarOpen ? 'items-center space-x-3' : 'justify-center'} w-full`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {sidebarOpen && <span>学习统计</span>}
            </Link>
          </nav>

          {/* User Profile */}
          {data.user ? (
            <div className={`mb-6 ${sidebarOpen ? 'px-3' : 'flex justify-center'}`}>
              <div className="relative group">
                <div className={`flex ${sidebarOpen ? 'items-center space-x-3' : 'justify-center'} px-3 py-2.5 rounded-md hover:bg-notion-bg-gray transition-colors cursor-pointer`}>
                  <div className="flex items-center justify-center rounded-full h-8 w-8 overflow-hidden bg-amber-50 border border-gray-200">
                    <Img
                      className="h-full w-full object-cover"
                      alt={data.user.name ?? data.user.username}
                      src={getUserImgSrc(data.user.image?.objectKey)}
                      width={256}
                      height={256}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                      }}
                    />
                  </div>
                  {sidebarOpen && (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-medium">{data.user.name ?? data.user.username}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Dropdown Menu */}
                {sidebarOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-notion-bg-default border border-gray-200 rounded-md shadow-lg z-50 hidden group-hover:block">
                    <div className="py-1">
                      <Link to={`/users/${data.user.username}`} className="block px-4 py-2 text-sm hover:bg-notion-bg-gray">
                        <div className="flex items-center space-x-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>个人资料</span>
                        </div>
                      </Link>
                      <Link to={`/users/${data.user.username}/notes`} className="block px-4 py-2 text-sm hover:bg-notion-bg-gray">
                        <div className="flex items-center space-x-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>笔记</span>
                        </div>
                      </Link>
                      <Form action="/logout" method="POST" className="block">
                        <button type="submit" className="w-full text-left px-4 py-2 text-sm hover:bg-notion-bg-gray">
                          <div className="flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>退出登录</span>
                          </div>
                        </button>
                      </Form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`mb-6 ${sidebarOpen ? 'px-3' : 'flex justify-center'}`}>
              <Link to="/login" className={`flex ${sidebarOpen ? 'items-center space-x-3' : 'justify-center'} px-3 py-2.5 rounded-md hover:bg-notion-bg-gray transition-colors`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                {sidebarOpen && <span className="text-sm font-medium">登录</span>}
              </Link>
            </div>
          )}

          {/* Theme Switch */}
          <div className={`mt-auto pt-6 pb-4 ${sidebarOpen ? '' : 'flex justify-center'}`}>
            <div className={sidebarOpen ? '' : 'hidden'}>
              <ThemeSwitch userPreference={data.userPrefs.theme} />
            </div>
            {!sidebarOpen && (
              <button
                className="p-2 rounded-md hover:bg-notion-bg-gray/70 transition-colors"
                onClick={() => {
                  // 切换主题
                  const form = document.createElement('form');
                  form.method = 'POST';
                  form.action = '/resources/theme-switch';

                  const themeInput = document.createElement('input');
                  themeInput.type = 'hidden';
                  themeInput.name = 'theme';
                  // 切换为下一个主题
                  themeInput.value = data.userPrefs.theme === 'light' ? 'dark' : 'light';

                  form.appendChild(themeInput);
                  document.body.appendChild(form);
                  form.submit();
                  document.body.removeChild(form);
                }}
              >
                {data.userPrefs.theme === 'light' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </button>
            )}
          </div>
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