import { useState } from 'react'
import { useLoaderData, Form } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { PassageReader } from '#app/components/ielts/PassageReader'
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '#app/utils/router-helpers'

// 高亮区域类型
interface HighlightedSection {
  start: number
  end: number
  color: string
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request)
  
  const passageId = params.passageId
  if (!passageId) throw new Response('需要指定文章ID', { status: 400 })
  
  const passage = await prisma.ieltsPassage.findUnique({
    where: { id: passageId },
  })
  
  if (!passage) throw new Response('文章不存在', { status: 404 })
  
  // 获取用户的生词本
  const userVocabulary = await prisma.ieltsUserVocabulary.findMany({
    where: {
      userId,
      passageId,
    },
  })
  
  return json({ 
    passage, 
    userVocabulary,
    userId
  })
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request)
  const passageId = params.passageId
  
  if (!passageId) {
    return json({ success: false, error: '文章ID不存在' }, { status: 400 })
  }
  
  const formData = await request.formData()
  const intent = formData.get('intent') as string
  
  if (intent === 'addVocabulary') {
    const word = formData.get('word') as string
    const context = formData.get('context') as string
    
    if (!word) {
      return json({ success: false, error: '单词不能为空' }, { status: 400 })
    }
    
    // 检查是否已存在
    const existingVocab = await prisma.ieltsUserVocabulary.findUnique({
      where: {
        userId_word: {
          userId,
          word,
        },
      },
    })
    
    if (existingVocab) {
      return json({ 
        success: true, 
        message: '单词已在生词本中',
        vocabularyId: existingVocab.id
      })
    }
    
    // 添加到生词本
    const newVocab = await prisma.ieltsUserVocabulary.create({
      data: {
        userId,
        passageId,
        word,
        context,
        status: 'active',
        note: '',
      },
    })
    
    return json({ 
      success: true, 
      message: '单词已添加到生词本',
      vocabularyId: newVocab.id
    })
  }
  
  if (intent === 'saveHighlight') {
    // 将来可以实现高亮保存功能
    return json({ success: true, message: '高亮已保存' })
  }
  
  return json({ success: false, error: '未知操作' }, { status: 400 })
}

export default function ReadPassage() {
  const { passage, userVocabulary, userId } = useLoaderData<typeof loader>()
  const [selectedWord, setSelectedWord] = useState('')
  const [wordContext, setWordContext] = useState('')
  const [highlights, setHighlights] = useState<HighlightedSection[]>([])
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null)
  const [showDictionary, setShowDictionary] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  
  // 处理单词选择
  const handleWordSelect = async (word: string, context: string) => {
    setSelectedWord(word)
    setWordContext(context)
    
    // 添加到生词本
    try {
      const formData = new FormData()
      formData.append('intent', 'addVocabulary')
      formData.append('word', word)
      formData.append('context', context)
      
      const response = await fetch(`/ielts/passages/${passage.id}/read`, {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      if (data.success) {
        setMessage({ text: data.message, type: 'success' })
        // 3秒后清除消息
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ text: data.error, type: 'error' })
      }
    } catch (error) {
      setMessage({ text: '添加单词失败', type: 'error' })
    }
  }
  
  // 处理文本高亮
  const handleHighlight = (text: string, color: string, context: string) => {
    const newHighlight = {
      start: passage.content.indexOf(text),
      end: passage.content.indexOf(text) + text.length,
      color,
    }
    
    if (newHighlight.start >= 0) {
      setHighlights([...highlights, newHighlight])
      setMessage({ text: '文本已高亮标记', type: 'success' })
      setTimeout(() => setMessage(null), 3000)
    }
  }
  
  // 切换收藏状态
  const toggleBookmark = () => {
    setIsBookmarked(prev => !prev)
    setMessage({ 
      text: isBookmarked ? '已取消收藏' : '已添加到收藏', 
      type: 'success' 
    })
    setTimeout(() => setMessage(null), 3000)
    // 这里可以添加实际的收藏API调用
  }
  
  // 显示/隐藏词典
  const toggleDictionary = () => {
    setShowDictionary(prev => !prev)
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 页面顶部工具栏 */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-6 p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <a 
              href="/ielts/passages" 
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="返回列表"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <h1 className="text-xl font-bold text-gray-800 truncate max-w-md">{passage.title}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleDictionary}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                showDictionary 
                  ? 'bg-blue-100 text-blue-700 border-blue-300' 
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>{showDictionary ? '隐藏词典' : '显示词典'}</span>
            </button>

            <button 
              onClick={toggleBookmark}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                isBookmarked 
                  ? 'bg-yellow-100 text-yellow-700 border-yellow-300' 
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span>{isBookmarked ? '已收藏' : '收藏'}</span>
            </button>

            <a 
              href={`/ielts/passages/${passage.id}/practice`}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-primary text-white hover:bg-primary-dark transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>开始练习</span>
            </a>
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div 
            className={`mb-4 px-4 py-2 rounded-md ${
              message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 主要阅读区域 */}
          <div className="lg:w-3/4 bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-medium text-gray-800">{passage.title}</h2>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <span className="mr-3">{passage.wordCount} 词</span>
                  <span className="mr-3">难度: {passage.difficulty}</span>
                  {passage.topic && <span>主题: {passage.topic}</span>}
                </div>
              </div>
            </div>
            
            <div className="prose max-w-none">
              <PassageReader 
                content={passage.content} 
                onWordSelect={handleWordSelect}
                onHighlight={handleHighlight}
                highlights={highlights}
              />
            </div>
          </div>

          {/* 侧边栏 - 词典和生词本 */}
          {showDictionary && (
            <div className="lg:w-1/4">
              <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <h3 className="font-medium text-gray-800 mb-2">在线词典</h3>
                {selectedWord ? (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-bold text-lg">{selectedWord}</div>
                      <a 
                        href={`https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(selectedWord)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        查看详细
                      </a>
                    </div>
                    {wordContext && (
                      <div className="text-sm text-gray-600 italic mb-3">
                        "...{wordContext}..."
                      </div>
                    )}
                    <div className="text-gray-500 text-sm">
                      点击文章中的单词查看详细释义
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">
                    点击文章中的单词查看释义
                  </div>
                )}
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="font-medium text-gray-800 mb-2">本篇生词</h3>
                {userVocabulary && userVocabulary.length > 0 ? (
                  <div className="space-y-3">
                    {userVocabulary.map(vocab => (
                      <div key={vocab.id} className="border-b pb-2 last:border-b-0">
                        <div className="font-medium">{vocab.word}</div>
                        {vocab.context && (
                          <div className="text-xs text-gray-500 italic mt-1">
                            "...{vocab.context}..."
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">
                    还没有添加生词，点击文章中的单词添加
                  </div>
                )}
                
                <div className="mt-4 border-t pt-3">
                  <a 
                    href="/ielts/vocabulary" 
                    className="text-blue-600 hover:underline text-sm flex items-center"
                  >
                    <span>查看全部生词</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 