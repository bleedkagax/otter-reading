import { json, type LoaderFunctionArgs } from '#app/utils/router-helpers'
import { Link, Outlet, useLoaderData, useSearchParams } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request)
  
  const url = new URL(request.url)
  const topic = url.searchParams.get('topic')
  const difficulty = url.searchParams.get('difficulty')
  const search = url.searchParams.get('search')
  
  // 构建查询条件
  const where: any = {}
  
  if (topic) {
    where.topic = topic
  }
  
  if (difficulty) {
    where.difficulty = difficulty
  }
  
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ]
  }
  
  // 获取所有文章
  const passages = await prisma.ieltsPassage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  
  // 获取所有主题和难度级别（用于筛选）
  const topics = await prisma.ieltsPassage.findMany({
    select: { topic: true },
    distinct: ['topic'],
  })
  
  const difficulties = await prisma.ieltsPassage.findMany({
    select: { difficulty: true },
    distinct: ['difficulty'],
  })
  
  return json({
    passages,
    topics: topics.map(t => t.topic),
    difficulties: difficulties.map(d => d.difficulty),
  })
}

export default function IeltsPassages() {
  const { passages, topics, difficulties } = useLoaderData<typeof loader>()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const selectedTopic = searchParams.get('topic') || ''
  const selectedDifficulty = searchParams.get('difficulty') || ''
  const searchQuery = searchParams.get('search') || ''
  
  // 更新筛选条件
  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set(key, value)
    } else {
      newParams.delete(key)
    }
    setSearchParams(newParams)
  }
  
  return (
    <div>
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h1 className="text-2xl font-bold mb-6">雅思阅读文章库</h1>
        
        {/* 筛选区域 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">主题</label>
            <select
              id="topic"
              value={selectedTopic}
              onChange={e => updateFilter('topic', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">全部主题</option>
              {topics.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">难度</label>
            <select
              id="difficulty"
              value={selectedDifficulty}
              onChange={e => updateFilter('difficulty', e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">全部难度</option>
              {difficulties.map(difficulty => (
                <option key={difficulty} value={difficulty}>{difficulty}</option>
              ))}
            </select>
          </div>
          
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
            <div className="flex">
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={e => updateFilter('search', e.target.value)}
                placeholder="搜索文章标题或内容..."
                className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                onClick={() => updateFilter('search', searchQuery)}
                className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600"
              >
                搜索
              </button>
            </div>
          </div>
        </div>
        
        {/* 文章列表 */}
        {passages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {passages.map(passage => (
              <div key={passage.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-medium text-lg mb-2">{passage.title}</h3>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-600">
                    难度: <span className={`font-medium 
                      ${passage.difficulty === 'easy' ? 'text-green-600' : 
                        passage.difficulty === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
                      {passage.difficulty}
                    </span>
                  </span>
                  <span className="text-gray-600">{passage.wordCount} 词</span>
                </div>
                <p className="text-gray-700 mb-4 line-clamp-2">
                  {passage.content.slice(0, 150)}...
                </p>
                <div className="flex justify-between items-center">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">{passage.topic}</span>
                  <div className="flex gap-2">
                    <Link
                      to={`/ielts/passages/${passage.id}/read`}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                    >
                      阅读
                    </Link>
                    <Link
                      to={`/ielts/passages/${passage.id}/practice`}
                      className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                    >
                      练习
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">没有找到符合条件的文章</p>
            <button
              onClick={() => setSearchParams({})}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              清除筛选条件
            </button>
          </div>
        )}
      </div>
      
      <Outlet />
    </div>
  )
} 