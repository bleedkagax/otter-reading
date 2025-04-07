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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
          <Link
            to="/ielts/import"
            className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            导入PDF文章
          </Link>
        </div>
      </div>
      
      {/* 筛选器 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center border border-gray-200">
        <div className="w-full md:w-auto">
          <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">难度</label>
          <select
            id="difficulty"
            value={filter.difficulty}
            onChange={(e) => setFilter(prev => ({ ...prev, difficulty: e.target.value }))}
            className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">全部难度</option>
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
          </select>
        </div>
        
        <div className="w-full md:w-auto">
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">主题</label>
          <select
            id="topic"
            value={filter.topic}
            onChange={(e) => setFilter(prev => ({ ...prev, topic: e.target.value }))}
            className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">全部主题</option>
            {topics.map(topic => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
        </div>
        
        <div className="w-full md:flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
          <input
            type="text"
            id="search"
            placeholder="搜索文章..."
            value={filter.search}
            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="mt-auto md:self-end">
          <button
            onClick={() => setFilter({ difficulty: 'all', topic: 'all', search: '' })}
            className="w-full md:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            重置筛选
          </button>
        </div>
        
        <div className="mt-auto ml-auto md:self-end">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="w-full md:w-auto px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors"
          >
            {showDebug ? '隐藏ID' : '显示ID'}
          </button>
        </div>
      </div>
      
      {/* 开发调试 - 显示文章ID */}
      {showDebug && (
        <div className="mb-6 p-3 bg-gray-100 rounded text-xs overflow-auto">
          <p className="font-bold mb-1">文章ID (开发测试用):</p>
          <ul className="list-disc pl-5">
            {passages.map(passage => (
              <li key={passage.id} className="mb-1">
                {passage.title}: <code className="bg-white px-1 py-0.5 rounded">{passage.id}</code>
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
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-lg font-medium text-gray-700 mb-2">没有找到匹配的文章</h3>
          <p className="text-gray-500 mb-6">尝试调整筛选条件，或者上传新的文章</p>
          <div className="flex justify-center">
            <Link
              to="/ielts/import"
              className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              导入PDF文章
            </Link>
          </div>
        </div>
      )}
    </div>
  )
} 