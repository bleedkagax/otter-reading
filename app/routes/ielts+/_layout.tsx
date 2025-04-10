import { Outlet } from 'react-router'
import { type ReactNode } from 'react'
import { getUserId } from '#app/utils/auth.server'
import { json } from '#app/utils/router-helpers'
import { Link, useLoaderData } from 'react-router'

export async function loader({ request }: { request: Request }) {
  // 获取用户ID，但不要求必须登录
  const userId = await getUserId(request)
  return json({ userId })
}

export default function IeltsLayout() {
  const { userId } = useLoaderData<typeof loader>()

  return (
    <div className="flex h-full min-h-screen flex-col bg-background text-foreground">
      <header className="bg-gray-900 text-white shadow-md sticky top-0 z-10 border-b border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/ielts/passages" className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h1 className="text-xl font-bold">雅思阅读训练</h1>
            </Link>

            <div className="hidden md:flex flex-1 justify-center">
              <div className="relative px-4 py-1.5 rounded-lg bg-gray-800 max-w-lg w-full">
                <form className="flex items-center" action="/ielts/passages" method="get">
                  <input
                    type="text"
                    name="search"
                    placeholder="搜索文章..."
                    className="w-full bg-transparent border-none text-white placeholder-gray-400 focus:outline-none focus:ring-0"
                  />
                  <button type="submit" className="p-1 text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>

            <nav className="flex items-center space-x-1">
              <Link
                to="/ielts/passages"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors flex items-center space-x-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="hidden md:inline">文章库</span>
              </Link>

              <Link
                to="/ielts/import"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors flex items-center space-x-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="hidden md:inline">导入PDF</span>
              </Link>

              <Link
                to="/ielts/learning-plan"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors flex items-center space-x-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="hidden md:inline">学习计划</span>
              </Link>

              <div className="relative group">
                <Link
                  to="/ielts/vocabulary"
                  className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors flex items-center space-x-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="hidden md:inline">词汇管理</span>
                </Link>
                <div className="absolute left-0 w-48 mt-1 py-2 bg-white rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <Link to="/ielts/vocabulary" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    词汇列表
                  </Link>
                  <Link to="/ielts/vocabulary/review" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    词汇复习
                  </Link>
                  <Link to="/ielts/vocabulary/test" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    词汇测试
                  </Link>
                </div>
              </div>

              <Link
                to="/ielts/stats"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors flex items-center space-x-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="hidden md:inline">学习统计</span>
              </Link>

              {userId ? (
                <div className="ml-2 relative group">
                  <button className="flex items-center justify-center rounded-full h-8 w-8 bg-gray-700 hover:bg-gray-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>
                  <div className="absolute right-0 w-48 mt-2 py-2 bg-white rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <Link to="/account" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      账号设置
                    </Link>
                    <Link to="/logout" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      退出登录
                    </Link>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="ml-2 px-3 py-2 rounded-md text-sm font-medium bg-primary hover:bg-primary-dark transition-colors">
                  登录
                </Link>
              )}
            </nav>
          </div>
        </div>

        <div className="md:hidden bg-gray-800 px-4 py-2">
          <form className="flex items-center" action="/ielts/passages" method="get">
            <input
              type="text"
              name="search"
              placeholder="搜索文章..."
              className="w-full bg-gray-700 border-none rounded-md px-3 py-1.5 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="submit" className="p-1.5 -ml-9 text-gray-400 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 container mx-auto my-6 px-4">
        <Outlet />
      </main>

      <footer className="bg-card text-card-foreground py-6 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-gray-600">&copy; {new Date().getFullYear()} 雅思阅读训练系统</p>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-500 hover:text-gray-700">关于我们</a>
              <a href="#" className="text-gray-500 hover:text-gray-700">使用帮助</a>
              <a href="#" className="text-gray-500 hover:text-gray-700">联系我们</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}