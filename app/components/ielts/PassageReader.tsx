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
  onWordSelect?: (word: string) => void
  onHighlight?: (section: HighlightedSection) => void
  highlights?: HighlightedSection[]
  simpleMode?: boolean
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
  simpleMode = false
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
    
    if (onWordSelect) {
      onWordSelect(selectedText)
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
    
    setShowHighlightToolbar(true)
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
      <div className="prose max-w-none" onMouseUp={handleTextSelection}>
        {title && <h1 className="text-xl font-bold mb-4">{title}</h1>}
        {paragraphs.map((paragraph, index) => renderParagraphWithHighlights(paragraph, index))}
        
        {/* 高亮工具栏 */}
        {showHighlightToolbar && (
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
            <button 
              className="p-2 hover:bg-gray-100 rounded"
              onClick={lookupWord}
              title="查词典"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top Bar */}
      <div className="flex justify-between items-center px-4 py-2 bg-white border-b border-gray-300 shadow-sm">
        <div className="flex items-center justify-center bg-white border border-gray-300 rounded px-3 py-1 w-48">
          <svg
            className="w-5 h-5 text-gray-600 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium text-gray-700">
            {formatTime(timeRemaining)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-1.5 text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-md text-sm">
            Review
          </button>
          <button
            className="px-4 py-1.5 text-white bg-green-600 hover:bg-green-700 rounded-md text-sm flex items-center"
            onClick={handleSubmitWithTimerStop}
          >
            Submit
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Test Results Display */}
      {testResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 border-b border-gray-300">
          {testResults.map((test, index) => (
            <div key={index} className="bg-teal-700 text-white rounded-md p-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Test{index + 1}</h3>
                <div className="text-right">得分{test.score.toFixed(1)}</div>
              </div>
              {test.parts.map((part, partIndex) => (
                <div key={partIndex} className="mt-3 bg-white text-black p-3 rounded-md">
                  <div className="flex items-center mb-1">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{part.name} {part.score && `答对${part.score}/${part.totalQuestions}`}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Main Content: Split View */}
      <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
        {/* Left Pane: Passage */}
        <div className="overflow-y-auto bg-white p-6 border-r border-gray-300">
          <div ref={containerRef} className="prose max-w-none" onMouseUp={handleTextSelection}>
            {title && <h1 className="text-xl font-bold mb-4">{title}</h1>}
            {paragraphs.map((paragraph, index) => renderParagraphWithHighlights(paragraph, index))}
          </div>
          
          {/* 高亮工具栏 */}
          {showHighlightToolbar && (
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
              <button 
                className="p-2 hover:bg-gray-100 rounded"
                onClick={lookupWord}
                title="查词典"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Right Pane: Questions */}
        <div className="overflow-y-auto bg-white p-6">
          <div className="mb-6">
            <h2 className="font-semibold text-gray-800">
              {currentPartData.name} Questions {(currentPage - 1) * questionsPerPage + 1}-
              {Math.min(currentPage * questionsPerPage, currentQuestions.length)}
            </h2>
            <p className="text-sm text-gray-600">
              {currentQuestions.length > 0 && currentQuestions[0].type === 'multichoice' 
                ? 'Choose the correct letter A, B, C or D.' 
                : currentQuestions.length > 0 && currentQuestions[0].type === 'truefalse'
                ? 'Read the statements and decide if they are TRUE or FALSE.'
                : 'Answer the questions below.'}
            </p>
          </div>
          <div className="space-y-6">
            {pageQuestions.map((question) => (
              <div key={question.id}>
                <p className="mb-3 font-medium text-sm">
                  {question.id}. {question.text}
                </p>
                {renderQuestion(question)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
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