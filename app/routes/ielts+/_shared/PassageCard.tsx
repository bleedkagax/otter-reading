import { Form, Link } from 'react-router'
import { Passage, getDifficultyDetails } from './PassageCard.types'

interface PassageCardProps {
  passage: Passage
}

export function PassageCard({ passage }: PassageCardProps) {
  const difficultyDetails = getDifficultyDetails(passage.difficulty);
  
  return (
    <div 
      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 flex flex-col relative"
    >
      <div className={`h-2 w-full bg-gradient-to-r ${difficultyDetails.gradient} group-hover:${difficultyDetails.hoverGradient}`}></div>
      
      <div className="p-5 flex-grow">
        <div className="flex items-start gap-2 mb-3">
          <h3 className="font-bold text-gray-800 text-lg flex-grow">{passage.title}</h3>
          <span className={`${difficultyDetails.color} text-xs px-2 py-0.5 rounded-full flex-shrink-0`}>
            {difficultyDetails.label}
          </span>
        </div>
        
        {passage.topic && (
          <div className="mb-3">
            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
              {passage.topic}
            </span>
          </div>
        )}
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-3 h-16">
          {passage.content.slice(0, 150)}...
        </p>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {passage.wordCount} 词
          </span>
          
          {passage.source && (
            <span className="truncate max-w-[180px]" title={passage.source}>
              {passage.source}
            </span>
          )}
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-100 grid grid-cols-2 gap-2">
        <Link
          to={`/ielts/passages/${passage.id}/read`}
          className="text-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
        >
          阅读
        </Link>
        
        <Form action={`/ielts/passages/${passage.id}/practice`} method="get" preventScrollReset={false}>
          <button
            type="submit"
            className="w-full px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition-colors"
          >
            练习
          </button>
        </Form>
      </div>
      
      {/* 悬停时显示的卡片操作菜单 */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1">
          <button 
            className="p-1.5 bg-gray-800 bg-opacity-70 text-white rounded-full hover:bg-opacity-90"
            title="收藏"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
} 