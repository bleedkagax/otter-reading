import { json, type LoaderFunctionArgs } from '#app/utils/router-helpers'
import { Link, Outlet, useLoaderData } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'

interface IeltsPassage {
  id: string
  title: string
  content: string
  difficulty: string
  topic: string
  wordCount: number
  source: string | null
}

interface LoaderData {
  passages: IeltsPassage[]
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
  
  // 获取文章难度对应的颜色和标签
  const getDifficultyDetails = (difficulty: string) => {
    switch(difficulty) {
      case 'easy':
        return { color: 'bg-green-100 text-green-800', label: '简单' };
      case 'medium':
        return { color: 'bg-yellow-100 text-yellow-800', label: '中等' };
      case 'hard':
        return { color: 'bg-red-100 text-red-800', label: '困难' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: difficulty };
    }
  };
  
  return (
    <div>
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h1 className="text-2xl font-bold mb-6">雅思阅读文章库</h1>
        
        {/* 文章列表 */}
        {passages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {passages.map(passage => {
              const difficultyDetails = getDifficultyDetails(passage.difficulty);
              return (
                <div key={passage.id} className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 flex flex-col">
                  {/* 文章卡片顶部彩带 */}
                  <div className={`h-2 w-full ${passage.difficulty === 'easy' ? 'bg-gradient-to-r from-green-400 to-green-500' : 
                    passage.difficulty === 'medium' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 
                    'bg-gradient-to-r from-red-400 to-red-500'}`}></div>
                  
                  <div className="p-5 flex-grow">
                    {/* 文章标题和话题标签 */}
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-gray-800 leading-tight">{passage.title}</h3>
                      <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">{passage.topic}</span>
                    </div>
                    
                    {/* 文章预览 */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {passage.content.slice(0, 180)}...
                    </p>
                    
                    {/* 文章信息 */}
                    <div className="flex items-center gap-3 mt-auto">
                      <span className={`${difficultyDetails.color} text-xs px-2.5 py-1 rounded-full font-medium`}>
                        {difficultyDetails.label}
                      </span>
                      <span className="text-gray-500 text-xs flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        {passage.wordCount} 词
                      </span>
                    </div>
                  </div>
                  
                  {/* 卡片底部操作按钮 */}
                  <div className="bg-gray-50 p-4 border-t border-gray-100">
                    <Link
                      to={`/ielts/passages/${passage.id}/practice`}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center hover:from-blue-600 hover:to-indigo-700 transition-colors shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      开始练习
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500">没有可用的文章</p>
          </div>
        )}
      </div>
      
      <Outlet />
    </div>
  )
} 