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
              词典
            </button>
            
            <button 
              onClick={toggleBookmark}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                isBookmarked 
                  ? 'bg-yellow-100 text-yellow-700 border-yellow-300' 
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={isBookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              {isBookmarked ? '已收藏' : '收藏'}
            </button>
            
            <a 
              href={`/ielts/passages/${passage.id}/practice`}
              className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-full text-sm hover:bg-primary-dark transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              开始练习
            </a>
          </div>
        </div>
        
        {/* 操作提示 */}
        {message && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg animate-fade-in ${
            message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* 主内容区 - 左右两栏布局 */}
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
          {/* 左侧阅读文章 */}
          <div className={`${showDictionary ? 'lg:w-2/3' : 'lg:w-full'} h-full overflow-hidden flex flex-col bg-white rounded-lg shadow-md transition-all duration-300`}>
            <div className="p-5 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    passage.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    passage.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {passage.difficulty === 'easy' ? '简单' : 
                     passage.difficulty === 'medium' ? '中等' : '困难'}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">{passage.wordCount} 单词</span>
                </div>
                <div className="text-sm text-gray-500">
                  {passage.topic && `主题: ${passage.topic}`}
                </div>
              </div>
            </div>
            
            <div className="overflow-y-auto p-6 flex-grow">
              <PassageReader 
                content={passage.content} 
                showParagraphNumbers={true}
                onWordSelect={handleWordSelect}
                onHighlight={handleHighlight}
                highlightedSections={highlights}
              />
            </div>
          </div>

          {/* 右侧词典面板，只有在showDictionary为true时显示 */}
          {showDictionary && (
            <div className="lg:w-1/3 bg-white rounded-lg shadow-md h-full flex flex-col overflow-hidden transition-all duration-300">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="font-bold text-lg">词典 & 生词本</h2>
                <button 
                  onClick={toggleDictionary}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="关闭词典"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="overflow-y-auto p-4 flex-grow">
                {selectedWord ? (
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-2">选中的单词</h3>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="font-bold text-xl mb-2">{selectedWord}</p>
                      <p className="text-sm text-gray-600 mb-3">
                        <span className="text-gray-400">上下文:</span> ...{wordContext}...
                      </p>
                      
                      <Form method="post" className="mb-3">
                        <input type="hidden" name="intent" value="addVocabulary" />
                        <input type="hidden" name="word" value={selectedWord} />
                        <input type="hidden" name="context" value={wordContext} />
                        <button 
                          type="submit"
                          className="w-full bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          添加到生词本
                        </button>
                      </Form>
                      
                      <div className="border-t border-blue-200 pt-3">
                        <h4 className="font-medium text-sm mb-2">在线查询</h4>
                        <div className="flex flex-wrap gap-2">
                          <a 
                            href={`https://dictionary.cambridge.org/dictionary/english/${selectedWord}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                          >
                            剑桥词典
                          </a>
                          <a 
                            href={`https://www.collinsdictionary.com/dictionary/english/${selectedWord}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                          >
                            柯林斯词典
                          </a>
                          <a 
                            href={`https://www.thesaurus.com/browse/${selectedWord}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200"
                          >
                            同义词典
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                    </svg>
                    <p>在文章中选择单词以查看详情</p>
                  </div>
                )}
                
                {/* 生词本列表 */}
                {userVocabulary && userVocabulary.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-lg mb-2">本文生词 ({userVocabulary.length})</h3>
                    <div className="bg-gray-50 rounded-lg">
                      {userVocabulary.map((vocab) => (
                        <div key={vocab.id} className="p-3 border-b border-gray-200 last:border-b-0">
                          <p className="font-medium">{vocab.word}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="text-gray-400">上下文:</span> ...{vocab.context}...
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4">
                      <a 
                        href="/ielts/vocabulary" 
                        className="text-primary hover:underline text-sm flex items-center"
                      >
                        查看所有生词
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 