import { Outlet } from 'react-router'

export default function PassagesLayout() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">雅思阅读文章库</h1>
        <p className="text-gray-600 mt-2">浏览和练习各种雅思阅读文章</p>
      </div>
      
      <Outlet />
    </div>
  )
} 