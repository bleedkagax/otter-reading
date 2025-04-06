import { Outlet } from 'react-router'
import { type ReactNode } from 'react'
import { getUserId } from '#app/utils/auth.server'
import { json } from '#app/utils/router-helpers'

export async function loader({ request }: { request: Request }) {
  // 获取用户ID，但不要求必须登录
  const userId = await getUserId(request)
  return json({ userId })
}

export default function IeltsLayout() {
  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="bg-primary p-4 text-white">
        <div className="container mx-auto flex justify-between">
          <h1 className="text-2xl font-bold">雅思阅读训练</h1>
          <nav className="flex items-center gap-4">
            <a href="/ielts/passages" className="hover:underline">文章库</a>
            <a href="/ielts/vocabulary" className="hover:underline">词汇管理</a>
            <a href="/ielts/stats" className="hover:underline">学习统计</a>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto my-8 px-4">
        <Outlet />
      </main>
      
      <footer className="bg-gray-100 p-4 border-t">
        <div className="container mx-auto text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} 雅思阅读训练系统</p>
        </div>
      </footer>
    </div>
  )
} 