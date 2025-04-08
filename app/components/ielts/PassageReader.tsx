import { useState, useRef, useCallback } from 'react'

interface HighlightedSection {
  start: number
  end: number
  color: string
  text: string
  paragraphIndex: number
  textOffset: number
}

interface Question {
  id: number
  text: string
  type: 'truefalse' | 'multichoice' | 'fillblank' | 'matching'
  options?: string[]
  answer?: string
}

interface Part {
  id: string
  name: string
  questions: Question[]
  score?: number
  totalQuestions?: number
}

interface ReadingTestResult {
  id: string
  score: number
  parts: Part[]
}

interface PassageReaderProps {
  title?: string
  content: string
  parts?: Part[]
  timeLimit?: number
  wordCount?: number
  difficulty?: string
  topic?: string
  testResults?: ReadingTestResult[]
  onSubmit?: (answers: Record<number, string>) => void
  onWordSelect?: (word: string, context?: string) => void
  onHighlight?: (section: HighlightedSection) => void
  highlights?: HighlightedSection[]
  simpleMode?: boolean
  disableNativeToolbar?: boolean
}

export function PassageReader({
  title,
  content,
  parts = [],
  timeLimit = 60,
  wordCount = 0,
  difficulty = '',
  topic = '',
  testResults = [],
  onSubmit,
  onWordSelect,
  onHighlight,
  highlights = [],
  simpleMode = false,
  disableNativeToolbar = false
}: PassageReaderProps) {
  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60)
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [currentPart, setCurrentPart] = useState(0)
  const questionsPerPage = 5
  const timerRef = useRef<number | null>(null)
  const timerActiveRef = useRef(true)
  
  // 高亮功能状态
  const [selectedText, setSelectedText] = useState('')
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 })
  const [showHighlightToolbar, setShowHighlightToolbar] = useState(false)
  const [userHighlights, setUserHighlights] = useState<HighlightedSection[]>(highlights || [])
  const [currentSelectionInfo, setCurrentSelectionInfo] = useState<{
    paragraphIndex: number,
    textOffset: number
  } | null>(null)

  // Basic paragraph splitting
  const paragraphs = content.split(/\n+/).filter(Boolean)

  // Initialize timer when component mounts
  useRef(() => {
    startTimer();
    return () => stopTimer();
  }).current;

  // Start/stop timer functions
  const startTimer = useCallback(() => {
    if (!simpleMode && timerRef.current === null) {
      timerActiveRef.current = true;
      const tick = () => {
        if (!timerActiveRef.current) return;
        
        setTimeRemaining(prevTime => {
          const newTime = prevTime - 1;
          if (newTime <= 0) {
            stopTimer();
            return 0;
          }
          timerRef.current = window.setTimeout(tick, 1000);
          return newTime;
        });
      };
      
      timerRef.current = window.setTimeout(tick, 1000);
    }
  }, [simpleMode]);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      timerActiveRef.current = false;
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const answeredCount = Object.keys(answers).length

  // Get current part questions
  const currentPartData = parts[currentPart] || { questions: [] }
  
  // Calculate pagination
  const currentQuestions = currentPartData.questions || []
  const totalPages = Math.ceil(currentQuestions.length / questionsPerPage)
  const pageQuestions = currentQuestions.slice(
    (currentPage - 1) * questionsPerPage,
    currentPage * questionsPerPage
  )

  // Handle part change
  const handlePartChange = (partIndex: number) => {
    setCurrentPart(partIndex)
    setCurrentPage(1)
  }

  // 查找选择的文本属于哪个段落及其在段落中的位置
  const findTextLocation = (selection: Selection): { paragraphIndex: number, textOffset: number } | null => {
    if (!selection || !selection.anchorNode) return null
    
    // 查找包含选择的段落元素
    let node = selection.anchorNode
    while (node && node.nodeName !== 'P') {
      node = node.parentNode
    }
    
    if (!node) return null
    
    // 查找段落在所有段落中的索引
    const paragraphs = containerRef.current?.querySelectorAll('p')
    if (!paragraphs) return null
    
    let paragraphIndex = -1
    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i] === node) {
        paragraphIndex = i
        break
      }
    }
    
    if (paragraphIndex === -1) return null
    
    // 计算文本在段落中的偏移位置
    const paragraphText = node.textContent || ''
    const selectionText = selection.toString().trim()
    
    // 找到选择文本在段落中的位置
    // 注意：这里假设selection.anchorOffset提供了在段落中的正确位置
    // 但在复杂的DOM结构中可能需要更精确的计算
    const textOffset = paragraphText.indexOf(selectionText, Math.max(0, selection.anchorOffset - selectionText.length))
    
    if (textOffset === -1) return null
    
    return { paragraphIndex, textOffset }
  }

  // Handle word selection for dictionary lookup and highlighting
  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.toString().trim().length === 0) {
      setShowHighlightToolbar(false)
      return
    }
    
    const selectedText = selection.toString().trim()
    setSelectedText(selectedText)
    
    // Get surrounding context for the word (up to 50 characters before and after)
    let context = '';
    if (selection.anchorNode && selection.anchorNode.textContent) {
      const nodeText = selection.anchorNode.textContent;
      const selectionStart = selection.anchorOffset;
      const selectionEnd = selection.focusOffset;
      
      const start = Math.max(0, Math.min(selectionStart, selectionEnd) - 50);
      const end = Math.min(nodeText.length, Math.max(selectionStart, selectionEnd) + 50);
      
      context = nodeText.substring(start, end).trim();
    }
    
    if (onWordSelect) {
      onWordSelect(selectedText, context);
    }
    
    // 计算选择区域的位置
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    
    setSelectionPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + window.scrollY + 5
    })
    
    // 查找文本在段落中的位置信息
    const locationInfo = findTextLocation(selection)
    setCurrentSelectionInfo(locationInfo)
    
    // Only show highlight toolbar if native toolbar is not shown
    // or if we're explicitly disabling the native one
    setShowHighlightToolbar(disableNativeToolbar);
  }

  // 添加高亮
  const addHighlight = (color: string) => {
    if (!selectedText || !currentSelectionInfo) return
    
    const selection = window.getSelection()
    if (!selection) return
    
    const range = selection.getRangeAt(0)
    
    // 创建新的高亮信息，包含准确的位置信息
    const newHighlight: HighlightedSection = {
      start: range.startOffset,
      end: range.endOffset,
      color,
      text: selectedText,
      paragraphIndex: currentSelectionInfo.paragraphIndex,
      textOffset: currentSelectionInfo.textOffset
    }
    
    // 更新高亮状态
    setUserHighlights(prev => [...prev, newHighlight])
    
    // 调用外部的高亮回调（如果存在）
    if (onHighlight) {
      onHighlight(newHighlight)
    }
    
    // 关闭工具栏
    setShowHighlightToolbar(false)
    
    // 清除选择
    selection.removeAllRanges()
  }
  
  // 移除高亮
  const removeHighlight = (index: number) => {
    setUserHighlights(prev => prev.filter((_, i) => i !== index))
  }

  // 查找单词（打开字典）
  const lookupWord = () => {
    if (!selectedText) return
    window.open(`https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(selectedText)}`, '_blank')
    setShowHighlightToolbar(false)
  }

  // Handle submit with timer stop
  const handleSubmitWithTimerStop = () => {
    stopTimer();
    onSubmit?.(answers);
  };

  // Render question based on type
  const renderQuestion = (question: Question) => {
    switch (question.type) {
      case 'truefalse':
        return (
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name={`question-${question.id}`}
                value="true"
                checked={answers[question.id] === "true"}
                onChange={() => handleAnswerSelect(question.id, "true")}
                className="form-radio h-4 w-4 text-blue-600"
              />
              <span className="text-sm">TRUE</span>
            </label>
            <label className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name={`question-${question.id}`}
                value="false"
                checked={answers[question.id] === "false"}
                onChange={() => handleAnswerSelect(question.id, "false")}
                className="form-radio h-4 w-4 text-blue-600"
              />
              <span className="text-sm">FALSE</span>
            </label>
          </div>
        )
      case 'multichoice':
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <label
                key={index}
                className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={String.fromCharCode(65 + index)}
                  checked={answers[question.id] === String.fromCharCode(65 + index)}
                  onChange={() => handleAnswerSelect(question.id, String.fromCharCode(65 + index))}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="text-sm">
                  <span className="font-semibold mr-1">{String.fromCharCode(65 + index)}</span> {option}
                </span>
              </label>
            ))}
          </div>
        )
      case 'fillblank':
        return (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Type your answer here"
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerSelect(question.id, e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
        )
      case 'matching':
        return (
          <div className="space-y-2">
            <select
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerSelect(question.id, e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">Select an option</option>
              {question.options?.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )
      default:
        return null
    }
  }
  
  // 渲染带有高亮的段落
  const renderParagraphWithHighlights = (paragraph: string, paragraphIndex: number) => {
    // 找出属于这个段落的高亮
    const paragraphHighlights = userHighlights.filter(h => 
      h.paragraphIndex === paragraphIndex || 
      // 兼容旧数据：如果没有paragraphIndex但文本匹配
      (h.paragraphIndex === undefined && paragraph.includes(h.text))
    )
    
    // 如果没有高亮，直接返回段落
    if (paragraphHighlights.length === 0) {
      return <p key={paragraphIndex} className="mb-4 text-sm leading-relaxed">{paragraph}</p>
    }
    
    // 按照位置对高亮进行排序
    const sortedHighlights = [...paragraphHighlights].sort((a, b) => 
      (a.textOffset || 0) - (b.textOffset || 0)
    )
    
    // 制作高亮标记
    let result = []
    let lastIndex = 0
    
    // 对每个高亮，分别处理
    for (const highlight of sortedHighlights) {
      // 如果有精确位置信息，使用它
      let startPos = highlight.textOffset
      
      // 如果没有精确位置信息（兼容旧数据），查找文本
      if (startPos === undefined) {
        startPos = paragraph.indexOf(highlight.text, lastIndex)
        if (startPos === -1) continue
      }
      
      const endPos = startPos + highlight.text.length
      
      // 添加高亮前的文本
      if (startPos > lastIndex) {
        result.push(paragraph.substring(lastIndex, startPos))
      }
      
      // 添加高亮的文本
      result.push(
        <span 
          key={`highlight-${startPos}`} 
          style={{ backgroundColor: highlight.color, padding: '0 2px', borderRadius: '2px' }}
        >
          {highlight.text}
        </span>
      )
      
      lastIndex = endPos
    }
    
    // 添加最后一段文本
    if (lastIndex < paragraph.length) {
      result.push(paragraph.substring(lastIndex))
    }
    
    return <p key={paragraphIndex} className="mb-4 text-sm leading-relaxed">{result}</p>
  }

  // Simple reading mode with just the content
  if (simpleMode) {
    return (
      <>
        {disableNativeToolbar && (
          <style jsx>{`
            .disable-native-toolbar::selection {
              background: rgba(59, 130, 246, 0.3);
            }
            .disable-native-toolbar::-moz-selection {
              background: rgba(59, 130, 246, 0.3);
            }
            /* CSS to disable browser context menu */
            .disable-native-toolbar {
              -webkit-touch-callout: none;
              -webkit-user-select: none;
              -khtml-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
              user-select: none;
            }
            
            /* Re-enable selection for content */
            .disable-native-toolbar p,
            .disable-native-toolbar h1,
            .disable-native-toolbar h2,
            .disable-native-toolbar h3,
            .disable-native-toolbar h4,
            .disable-native-toolbar h5,
            .disable-native-toolbar h6,
            .disable-native-toolbar span,
            .disable-native-toolbar div {
              -webkit-user-select: text;
              -moz-user-select: text;
              -ms-user-select: text;
              user-select: text;
            }
          `}</style>
        )}
        
        <div 
          className={`prose max-w-none ${disableNativeToolbar ? 'disable-native-toolbar' : ''}`}
          onMouseUp={handleTextSelection}
        >
          {title && <h1 className="text-xl font-bold mb-4">{title}</h1>}
          {paragraphs.map((paragraph, index) => renderParagraphWithHighlights(paragraph, index))}
          
          {/* 高亮工具栏 */}
          {showHighlightToolbar && !disableNativeToolbar && (
            <div 
              className="fixed bg-white shadow-lg rounded-lg z-50 flex items-center p-1"
              style={{ left: selectionPosition.x, top: selectionPosition.y, transform: 'translateX(-50%)' }}
            >
              <button 
                className="p-2 hover:bg-yellow-100 rounded"
                onClick={() => addHighlight('#FFEB3B80')}
                title="黄色标记"
              >
                <div className="w-5 h-5 bg-yellow-300 rounded-full"></div>
              </button>
              <button 
                className="p-2 hover:bg-green-100 rounded"
                onClick={() => addHighlight('#A5D6A780')}
                title="绿色标记"
              >
                <div className="w-5 h-5 bg-green-300 rounded-full"></div>
              </button>
              <button 
                className="p-2 hover:bg-blue-100 rounded"
                onClick={() => addHighlight('#90CAF980')}
                title="蓝色标记"
              >
                <div className="w-5 h-5 bg-blue-300 rounded-full"></div>
              </button>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header with info and controls */}
      <div className="p-4 bg-white shadow-sm z-10 border-b border-gray-300">
        <div className="max-w-full mx-auto flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold">{title}</h1>
            <div className="flex items-center text-xs text-gray-500 mt-1">
              {difficulty && (
                <span className="mr-3 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {difficulty}
                </span>
              )}
              {topic && (
                <span className="mr-3 flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {topic}
                </span>
              )}
              {wordCount > 0 && (
                <span className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  {wordCount} words
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!simpleMode && (
              <div className="px-3 py-1 bg-gray-100 rounded-md flex items-center gap-1 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={timeRemaining < 300 ? 'text-red-500 font-bold' : ''}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
            {!simpleMode && onSubmit && (
              <button
                onClick={handleSubmitWithTimerStop}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
              >
                Submit ({answeredCount}/{currentQuestions.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {disableNativeToolbar && (
        <style jsx global>{`
          .disable-native-toolbar::selection {
            background: rgba(59, 130, 246, 0.3);
          }
          .disable-native-toolbar::-moz-selection {
            background: rgba(59, 130, 246, 0.3);
          }
          /* CSS to disable browser context menu */
          .disable-native-toolbar {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -khtml-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          }
          
          /* Re-enable selection for content */
          .disable-native-toolbar p,
          .disable-native-toolbar h1,
          .disable-native-toolbar h2,
          .disable-native-toolbar h3,
          .disable-native-toolbar h4,
          .disable-native-toolbar h5,
          .disable-native-toolbar h6,
          .disable-native-toolbar span,
          .disable-native-toolbar div {
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
            user-select: text;
          }
        `}</style>
      )}

      <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
        {/* Left Pane: Passage */}
        <div className="overflow-y-auto bg-white p-6 border-r border-gray-300">
          <div 
            ref={containerRef} 
            className={`prose max-w-none ${disableNativeToolbar ? 'disable-native-toolbar' : ''}`} 
            onMouseUp={handleTextSelection}
          >
            {title && <h1 className="text-xl font-bold mb-4">{title}</h1>}
            {paragraphs.map((paragraph, index) => renderParagraphWithHighlights(paragraph, index))}
          </div>
          
          {/* 高亮工具栏 */}
          {showHighlightToolbar && !disableNativeToolbar && (
            <div 
              className="fixed bg-white shadow-lg rounded-lg z-50 flex items-center p-1"
              style={{ left: selectionPosition.x, top: selectionPosition.y, transform: 'translateX(-50%)' }}
            >
              <button 
                className="p-2 hover:bg-yellow-100 rounded"
                onClick={() => addHighlight('#FFEB3B80')}
                title="黄色标记"
              >
                <div className="w-5 h-5 bg-yellow-300 rounded-full"></div>
              </button>
              <button 
                className="p-2 hover:bg-green-100 rounded"
                onClick={() => addHighlight('#A5D6A780')}
                title="绿色标记"
              >
                <div className="w-5 h-5 bg-green-300 rounded-full"></div>
              </button>
              <button 
                className="p-2 hover:bg-blue-100 rounded"
                onClick={() => addHighlight('#90CAF980')}
                title="蓝色标记"
              >
                <div className="w-5 h-5 bg-blue-300 rounded-full"></div>
              </button>
            </div>
          )}
        </div>

        {/* Right Pane: Questions */}
        <div className="overflow-y-auto bg-white p-6 border-l border-gray-300">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">
              {currentPartData.name || 'Questions'}
            </h2>
            <div className="space-y-6">
              {pageQuestions.map((question, index) => (
                <div key={question.id} className="p-4 border border-gray-200 rounded-md">
                  <div className="flex">
                    <div className="w-8 h-8 bg-blue-600 text-white flex items-center justify-center rounded-full font-medium">
                      {(currentPage - 1) * questionsPerPage + index + 1}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="mb-3 text-base">
                        {question.text}
                      </div>
                      {renderQuestion(question)}
                      
                      {/* Show correct answer in test results view */}
                      {testResults.length > 0 && (
                        <div className="mt-3 text-sm">
                          {/* Find the result for this question */}
                          {testResults.find(r => r.questionId === question.id)?.isCorrect ? (
                            <div className="text-green-600 font-medium flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Correct
                            </div>
                          ) : (
                            <div className="text-red-600 font-medium flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Incorrect. Correct answer: {testResults.find(r => r.questionId === question.id)?.correctAnswer}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer pagination & part navigation */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-gray-300">
        <div className="flex items-center gap-2">
          {parts.map((part, index) => (
            <button
              key={part.id}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                currentPart === index
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => handlePartChange(index)}
            >
              {part.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              className={`w-8 h-8 rounded text-sm font-medium ${
                currentPage === i + 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
        
        {/* 高亮管理 */}
        <div className="flex items-center">
          {userHighlights.length > 0 && (
            <div className="text-xs text-gray-600 mr-2">
              {userHighlights.length} 处标记
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 