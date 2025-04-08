import { Form, Link } from 'react-router'
import { Passage, getDifficultyDetails } from './PassageCard.types'

interface PassageCardProps {
  passage: Passage
}

export function PassageCard({ passage }: PassageCardProps) {
  const difficultyDetails = getDifficultyDetails(passage.difficulty);
  
  return (
    <div 
      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 flex flex-col h-full"
    >
      {/* Top colored bar based on difficulty */}
      <div className={`h-2 ${difficultyDetails.gradient} group-hover:${difficultyDetails.hoverGradient}`}></div>
      
      <div className="p-6 flex-grow flex flex-col">
        {/* Header with title and difficulty badge */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-gray-800 text-lg line-clamp-2 mr-2 leading-tight">{passage.title}</h3>
          <span className={`${difficultyDetails.color} text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap flex items-center`}>
            {difficultyDetails.label}
          </span>
        </div>
        
        {/* Topic tag */}
        {passage.topic && (
          <div className="mb-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {passage.topic}
            </span>
          </div>
        )}
        
        {/* Excerpt */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
          {passage.content.slice(0, 150)}...
        </p>
        
        {/* Metadata row */}
        <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {passage.wordCount} 词
          </span>
          
          {passage.source && (
            <span className="truncate max-w-[180px] flex items-center" title={passage.source}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8a2 2 0 00-2-2h-5a2 2 0 00-2 2v10a2 2 0 002 2h5z" />
              </svg>
              {passage.source}
            </span>
          )}
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="p-4 border-t border-gray-100 grid grid-cols-2 gap-3">
        <Link
          to={`/ielts/passages/${passage.id}/read`}
          className="flex justify-center items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          阅读
        </Link>
        
        <Form action={`/ielts/passages/${passage.id}/practice`} method="get" preventScrollReset={false} className="contents">
          <button
            type="submit"
            className="flex justify-center items-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            练习
          </button>
        </Form>
      </div>
      
      {/* Hover actions menu */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button 
          className="p-1.5 bg-gray-900 bg-opacity-70 text-white rounded-full hover:bg-opacity-90"
          title="收藏文章"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
        
        <button 
          className="p-1.5 bg-gray-900 bg-opacity-70 text-white rounded-full hover:bg-opacity-90"
          title="分享文章"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      </div>
    </div>
  )
} 