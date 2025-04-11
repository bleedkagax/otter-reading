import { json, type LoaderFunctionArgs } from '#app/utils/router-helpers'
import { Link, useLoaderData } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { useState, useEffect } from 'react'
import { PassageCard } from '../_shared/PassageCard'
import { type Passage } from '../_shared/PassageCard.types'

interface LoaderData {
  passages: Passage[]
}

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request)

  // 获取所有文章，按照难度和主题排序
  const passages = await prisma.ieltsPassage.findMany({
    orderBy: [
      { difficulty: 'asc' },
      { topic: 'asc' },
      { createdAt: 'desc' }
    ],
  })

  return json<LoaderData>({
    passages,
  })
}

export default function IeltsPassages() {
  const { passages } = useLoaderData<typeof loader>() as LoaderData
  const [filter, setFilter] = useState({ difficulty: 'all', topic: 'all', search: '' })
  const [filteredPassages, setFilteredPassages] = useState(passages)
  const [showDebug, setShowDebug] = useState(false)

  // 获取所有可用的主题
  const topics = Array.from(new Set(passages.map(p => p.topic))).filter(Boolean)

  // 当筛选条件变化时，过滤文章
  useEffect(() => {
    let result = [...passages]

    if (filter.difficulty !== 'all') {
      result = result.filter(p => p.difficulty === filter.difficulty)
    }

    if (filter.topic !== 'all') {
      result = result.filter(p => p.topic === filter.topic)
    }

    if (filter.search.trim()) {
      const searchLower = filter.search.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        p.content.toLowerCase().includes(searchLower)
      )
    }

    setFilteredPassages(result)
  }, [filter, passages])

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">雅思阅读文章库</h1>
          <div className="flex space-x-2">
            <Link
              to="/ielts/generate"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI生成文章
            </Link>
            <Link
              to="/ielts/import"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              导入PDF
            </Link>
          </div>
        </div>

        <p className="text-gray-600 mb-6">浏览和练习各种难度思阅读文章</p>

        {/* 筛选器 */}
        <div className="flex flex-wrap gap-6">
          <div className="w-full md:w-auto flex-1 md:max-w-xs">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                id="search"
                placeholder="搜索文章..."
                value={filter.search}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          <div className="w-full md:w-auto">
            <select
              id="difficulty"
              value={filter.difficulty}
              onChange={(e) => setFilter(prev => ({ ...prev, difficulty: e.target.value }))}
              className="w-full md:w-auto px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary appearance-none bg-no-repeat bg-right"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
            >
              <option value="all">全部难度</option>
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </select>
          </div>

          <div className="w-full md:w-auto">
            <select
              id="topic"
              value={filter.topic}
              onChange={(e) => setFilter(prev => ({ ...prev, topic: e.target.value }))}
              className="w-full md:w-auto px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary appearance-none bg-no-repeat bg-right"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
            >
              <option value="all">全部主题</option>
              {topics.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-auto">
            <button
              onClick={() => setFilter({ difficulty: 'all', topic: 'all', search: '' })}
              className="w-full md:w-auto px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              重置筛选
            </button>
          </div>
        </div>

        {/* 结果数量展示 */}
        <div className="mt-4 text-sm text-gray-500">
          找到 {filteredPassages.length} 篇文章 {filter.difficulty !== 'all' || filter.topic !== 'all' || filter.search ? '(已筛选)' : ''}
        </div>
      </div>

      {/* 开发调试 - 显示文章ID */}
      {showDebug && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs overflow-auto">
          <div className="flex justify-between items-center mb-2">
            <p className="font-bold">文章ID (开发测试用):</p>
            <button
              onClick={() => setShowDebug(false)}
              className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
            >
              隐藏
            </button>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {passages.map(passage => (
              <li key={passage.id} className="mb-1">
                {passage.title}: <code className="bg-white px-1 py-0.5 rounded border border-gray-200">{passage.id}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 文章列表 */}
      {filteredPassages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPassages.map(passage => (
            <PassageCard key={passage.id} passage={passage} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-lg font-medium text-gray-700 mb-2">没有找到匹配的文章</h3>
          <p className="text-gray-500 mb-6">尝试调整筛选条件，或者上传新的文章</p>
          <div className="flex justify-center">
            <Link
              to="/ielts/import"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              导入PDF文章
            </Link>
          </div>
        </div>
      )}

      {/* 开发功能按钮 */}
      {!showDebug && (
        <div className="fixed bottom-4 right-4 z-10">
          <button
            onClick={() => setShowDebug(true)}
            className="p-2 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
            title="显示开发信息"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}