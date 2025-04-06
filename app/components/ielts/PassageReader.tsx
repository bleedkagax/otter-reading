import { useState, useEffect, useRef } from 'react'

interface HighlightedSection {
  start: number
  end: number
  color: string
}

interface PassageReaderProps {
  content: string
  onWordSelect?: (word: string, context: string) => void
  highlightedSections?: HighlightedSection[]
  showParagraphNumbers?: boolean
}

export function PassageReader({
  content,
  onWordSelect,
  highlightedSections = [],
  showParagraphNumbers = false,
}: PassageReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selection, setSelection] = useState<{ word: string; context: string; position: { x: number, y: number } } | null>(null)
  
  // 将文章内容分割成段落
  const paragraphs = content.split(/\n+/).filter(Boolean)
  
  // 处理文本选择
  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setSelection(null)
      return
    }
    
    // 获取选中的文本
    const selectedText = selection.toString().trim()
    if (selectedText.length === 0) {
      setSelection(null)
      return
    }
    
    // 获取上下文（前后各10个字）
    const range = selection.getRangeAt(0)
    const startNode = range.startContainer
    const startOffset = range.startOffset
    const endNode = range.endContainer
    const endOffset = range.endOffset
    
    // 获取选择范围的坐标位置
    const rect = range.getBoundingClientRect()
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    }
    
    // 简单处理，仅当在同一文本节点内选择时
    if (startNode === endNode && startNode.nodeType === Node.TEXT_NODE) {
      const textContent = startNode.textContent || ''
      const start = Math.max(0, startOffset - 10)
      const end = Math.min(textContent.length, endOffset + 10)
      const context = textContent.substring(start, end)
      
      setSelection({
        word: selectedText,
        context,
        position
      })
    } else {
      // 处理跨节点选择时的上下文
      setSelection({
        word: selectedText,
        context: selectedText,
        position
      })
    }
  }
  
  // 处理单词点击
  const handleWordClick = (e: React.MouseEvent) => {
    if (!onWordSelect || !selection) return
    e.preventDefault()
    onWordSelect(selection.word, selection.context)
    setSelection(null)
  }
  
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    // 监听选择变化
    document.addEventListener('selectionchange', handleTextSelection)
    
    return () => {
      document.removeEventListener('selectionchange', handleTextSelection)
    }
  }, [])
  
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
            {paragraph}
          </p>
        ))}
      </div>
      
      {/* 选词浮层 */}
      {selection && (
        <div 
          className="fixed bg-white shadow-lg rounded-lg p-4 border border-gray-200 z-50 max-w-md"
          style={{ 
            minWidth: '300px',
            left: `${selection.position.x}px`,
            top: `${selection.position.y}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">{selection.word}</h3>
            <button 
              onClick={() => setSelection(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            <span className="text-gray-400">上下文:</span> ...{selection.context}...
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleWordClick}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
            >
              添加到生词本
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 