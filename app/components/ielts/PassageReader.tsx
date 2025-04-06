import { useState, useEffect, useRef, useCallback } from 'react'

interface HighlightedSection {
  start: number
  end: number
  color: string
}

interface PassageReaderProps {
  content: string
  onWordSelect?: (word: string, context: string) => void
  onHighlight?: (text: string, color: string, context: string) => void
  highlightedSections?: HighlightedSection[]
  showParagraphNumbers?: boolean
}

export function PassageReader({
  content,
  onWordSelect,
  onHighlight,
  highlightedSections = [],
  showParagraphNumbers = false,
}: PassageReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState<{ 
    word: string; 
    context: string; 
    position: { x: number, y: number } 
  } | null>(null)
  const [userHighlights, setUserHighlights] = useState<HighlightedSection[]>([])
  const [showHighlightOptions, setShowHighlightOptions] = useState(false)
  
  // 所有高亮区域，包括传入的和用户创建的
  const allHighlights = [...highlightedSections, ...userHighlights]
  
  // 将文章内容分割成段落
  const paragraphs = content.split(/\n+/).filter(Boolean)
  
  // 处理文本选择
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      return
    }
    
    // 获取选中的文本
    const selectedText = selection.toString().trim()
    if (selectedText.length === 0) {
      return
    }
    
    // 获取选择范围的坐标位置
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    }
    
    // 获取上下文
    let context = ''
    if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
      const textContent = range.startContainer.textContent || ''
      const start = Math.max(0, range.startOffset - 10)
      const end = Math.min(textContent.length, range.endOffset + 10)
      context = textContent.substring(start, end)
    } else {
      context = selectedText
    }
    
    setSelection({
      word: selectedText,
      context,
      position
    })
    setShowHighlightOptions(true)
  }, [])
  
  // 添加高亮
  const addHighlight = (color: string) => {
    if (!selection) return
    
    // 在实际应用中，这里应该计算文本在整篇文章中的起始和结束位置
    // 这里简化处理，使用简单的文本匹配
    const start = content.indexOf(selection.word)
    const end = start + selection.word.length
    
    if (start >= 0) {
      const newHighlight = { start, end, color }
      setUserHighlights([...userHighlights, newHighlight])
      
      // 如果有回调函数，调用它
      if (onHighlight) {
        onHighlight(selection.word, color, selection.context)
      }
    }
    
    // 关闭选项面板，清除选择
    setShowHighlightOptions(false)
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }
  
  // 处理单词点击
  const handleSaveWord = (e: React.MouseEvent) => {
    if (!onWordSelect || !selection) return
    e.preventDefault()
    onWordSelect(selection.word, selection.context)
    setSelection(null)
    setShowHighlightOptions(false)
  }
  
  // 关闭弹出窗口并清除选择
  const handleClose = () => {
    setSelection(null)
    setShowHighlightOptions(false)
    window.getSelection()?.removeAllRanges()
  }
  
  // 监听鼠标释放事件
  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(handleTextSelection, 10)
    }
    
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleTextSelection])
  
  // 渲染带有高亮的文本
  const renderHighlightedText = (text: string, paragraphIndex: number) => {
    // 查找这个段落中的所有高亮
    const relevantHighlights = allHighlights.filter(highlight => {
      // 计算当前段落在整篇文章中的位置
      const previousText = paragraphs.slice(0, paragraphIndex).join('\n')
      const startOffset = previousText.length + (paragraphIndex > 0 ? 1 : 0) // +1 是为了换行符
      const paragraphStart = startOffset
      const paragraphEnd = paragraphStart + text.length
      
      return (
        (highlight.start >= paragraphStart && highlight.start < paragraphEnd) ||
        (highlight.end > paragraphStart && highlight.end <= paragraphEnd) ||
        (highlight.start <= paragraphStart && highlight.end >= paragraphEnd)
      )
    })
    
    if (relevantHighlights.length === 0) {
      return text
    }
    
    // 对这个段落应用高亮
    const previousText = paragraphs.slice(0, paragraphIndex).join('\n')
    const startOffset = previousText.length + (paragraphIndex > 0 ? 1 : 0)
    
    // 将文本分割成高亮和非高亮部分
    let lastIndex = 0
    const parts = []
    
    for (const highlight of relevantHighlights) {
      const relativeSectionStart = Math.max(0, highlight.start - startOffset)
      const relativeSectionEnd = Math.min(text.length, highlight.end - startOffset)
      
      if (relativeSectionStart > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.substring(lastIndex, relativeSectionStart)}
          </span>
        )
      }
      
      if (relativeSectionEnd > relativeSectionStart && relativeSectionStart < text.length) {
        parts.push(
          <span
            key={`highlight-${relativeSectionStart}`}
            className={`${highlight.color === 'yellow' ? 'bg-yellow-200' : 'bg-blue-200'} rounded px-0.5`}
          >
            {text.substring(relativeSectionStart, relativeSectionEnd)}
          </span>
        )
      }
      
      lastIndex = relativeSectionEnd
    }
    
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {text.substring(lastIndex)}
        </span>
      )
    }
    
    return <>{parts}</>
  }
  
  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className="bg-white p-6 rounded-lg prose max-w-none ielts-passage"
      >
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="relative mb-4 pl-7 sm:pl-0">
            {showParagraphNumbers && (
              <span className="text-gray-400 absolute left-0 sm:-left-6 top-0 text-sm font-mono">{String.fromCharCode(65 + index)}</span>
            )}
            {renderHighlightedText(paragraph, index)}
          </p>
        ))}
      </div>
      
      {/* 选择工具菜单 */}
      {selection && showHighlightOptions && (
        <div 
          className="fixed bg-white shadow-lg rounded-lg border border-gray-200 z-50 min-w-[320px] animate-fade-in"
          style={{ 
            left: `${selection.position.x}px`,
            top: `${selection.position.y}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex justify-between items-center p-3 border-b">
            <h3 className="font-bold truncate max-w-[200px]">{selection.word}</h3>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="关闭"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="p-3">
            <p className="text-sm text-gray-600 mb-3">
              <span className="text-gray-400">上下文:</span> ...{selection.context}...
            </p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => addHighlight('yellow')}
                className="flex items-center gap-1 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-1.5 rounded-full text-sm hover:bg-yellow-200 transition-colors"
              >
                <span className="inline-block w-3 h-3 bg-yellow-300 rounded-full"></span>
                标记为黄色
              </button>
              <button
                onClick={() => addHighlight('blue')}
                className="flex items-center gap-1 bg-blue-100 border border-blue-300 text-blue-800 px-3 py-1.5 rounded-full text-sm hover:bg-blue-200 transition-colors"
              >
                <span className="inline-block w-3 h-3 bg-blue-300 rounded-full"></span>
                标记为蓝色
              </button>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleSaveWord}
                className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded text-sm hover:bg-primary-dark transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                添加到生词本
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 添加CSS动画 */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px) translateX(-50%); }
          to { opacity: 1; transform: translateY(0) translateX(-50%); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  )
} 