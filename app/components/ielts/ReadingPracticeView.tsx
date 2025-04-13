import { useState, useRef, useEffect } from 'react'
import { Button } from '../ui/button'

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
  questionId?: string
  isCorrect?: boolean
  correctAnswer?: string
}

interface HighlightedSection {
  start: number
  end: number
  color: string
  text: string
  paragraphIndex: number
  textOffset: number
}

interface ReadingPracticeViewProps {
  title: string
  content: string
  parts?: Part[]
  timeLimit?: number
  wordCount?: number
  difficulty?: string
  topic?: string
  testResults?: ReadingTestResult[]
  highlights?: HighlightedSection[]
  onSubmit?: (answers: Record<number, string>) => void
  onHighlight?: (highlight: HighlightedSection) => void
  onWordSelect?: (word: string, context?: string) => void
}

export function ReadingPracticeView({
  title,
  content,
  parts = [],
  timeLimit = 60,
  wordCount = 0,
  difficulty = '',
  topic = '', // Topic is used in the UI for display
  testResults = [],
  highlights = [],
  onSubmit,
  onHighlight,
  onWordSelect
}: ReadingPracticeViewProps) {
  // State for answers and timer
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [currentPart, setCurrentPart] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userHighlights, setUserHighlights] = useState<HighlightedSection[]>(highlights || [])
  const [showHighlightToolbar, setShowHighlightToolbar] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectionPosition, setSelectionPosition] = useState({ x: 0, y: 0 })
  const [currentSelectionInfo, setCurrentSelectionInfo] = useState<{
    paragraphIndex: number,
    textOffset: number
  } | null>(null)

  // Refs
  const timerRef = useRef<number | null>(null)
  const timerActiveRef = useRef(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Basic paragraph splitting
  const paragraphs = content.split(/\n+/).filter(Boolean)

  // Format time display
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Timer functions
  const startTimer = () => {
    if (timerRef.current !== null) return

    timerRef.current = window.setInterval(() => {
      if (!timerActiveRef.current) return

      setTimeRemaining(prev => {
        if (prev <= 0) {
          stopTimer()
          handleSubmit(answers)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // Timer pause/resume functions for future use
  // const pauseTimer = () => {
  //   timerActiveRef.current = false
  // }
  //
  // const resumeTimer = () => {
  //   timerActiveRef.current = true
  // }

  // Start timer on component mount
  useEffect(() => {
    startTimer()
    return () => stopTimer()
  }, [])

  // Handle text selection for highlighting
  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) {
      setShowHighlightToolbar(false)
      return
    }

    const selectedText = selection.toString().trim()
    if (!selectedText) {
      setShowHighlightToolbar(false)
      return
    }

    setSelectedText(selectedText)

    // Calculate selection position
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    setSelectionPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + window.scrollY + 5
    })

    // Find text location in paragraphs
    const findTextLocation = () => {
      if (!containerRef.current) return null

      const nodes = containerRef.current.querySelectorAll('p')
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (node && selection.anchorNode && node.contains(selection.anchorNode)) {
          // Found the paragraph
          const paragraphText = node.textContent || ''
          const selectionText = selection.toString()

          // Find the offset of the selection in the paragraph
          const textOffset = paragraphText.indexOf(selectionText)
          if (textOffset >= 0) {
            return {
              paragraphIndex: i,
              textOffset
            }
          }
        }
      }
      return null
    }

    const locationInfo = findTextLocation()
    setCurrentSelectionInfo(locationInfo)
    setShowHighlightToolbar(true)
  }

  // Add highlight
  const addHighlight = (color: string) => {
    if (!selectedText || !currentSelectionInfo) return

    const newHighlight: HighlightedSection = {
      start: 0,
      end: 0,
      color,
      text: selectedText,
      paragraphIndex: currentSelectionInfo.paragraphIndex,
      textOffset: currentSelectionInfo.textOffset
    }

    setUserHighlights(prev => [...prev, newHighlight])
    setShowHighlightToolbar(false)

    // Call the onHighlight callback if provided
    onHighlight?.(newHighlight)

    // Clear selection
    window.getSelection()?.removeAllRanges()
  }

  // Render paragraph with highlights
  const renderParagraphWithHighlights = (paragraph: string, paragraphIndex: number) => {
    // Find highlights for this paragraph
    const paragraphHighlights = userHighlights.filter(h =>
      h.paragraphIndex === paragraphIndex ||
      // For backward compatibility
      (h.paragraphIndex === undefined && paragraph.includes(h.text))
    )

    // If no highlights, return plain paragraph
    if (paragraphHighlights.length === 0) {
      return <p key={paragraphIndex} className="notion-text">{paragraph}</p>
    }

    // Sort highlights by position
    const sortedHighlights = [...paragraphHighlights].sort((a, b) =>
      (a.textOffset || 0) - (b.textOffset || 0)
    )

    // Create highlighted paragraph
    let result = []
    let lastIndex = 0

    // Process each highlight
    for (const highlight of sortedHighlights) {
      // Use precise position if available
      let startPos = highlight.textOffset

      // Fallback to text search for backward compatibility
      if (startPos === undefined) {
        startPos = paragraph.indexOf(highlight.text, lastIndex)
        if (startPos === -1) continue
      }

      const endPos = startPos + highlight.text.length

      // Add text before highlight
      if (startPos > lastIndex) {
        result.push(paragraph.substring(lastIndex, startPos))
      }

      // Map color to Notion highlight classes
      let highlightClass = 'notion-highlight-yellow'

      if (highlight.color === 'rgba(173, 216, 230, 0.7)' ||
          highlight.color === 'rgba(0, 120, 215, 0.3)' ||
          highlight.color.includes('blue')) {
        highlightClass = 'notion-highlight-blue'
      } else if (highlight.color === 'rgba(152, 251, 152, 0.7)' ||
                highlight.color.includes('green')) {
        highlightClass = 'notion-highlight-green'
      } else if (highlight.color === 'rgba(255, 182, 193, 0.7)' ||
                highlight.color.includes('pink')) {
        highlightClass = 'notion-highlight-pink'
      } else if (highlight.color === 'rgba(230, 230, 250, 0.7)' ||
                highlight.color.includes('purple')) {
        highlightClass = 'notion-highlight-purple'
      }

      // Add highlighted text
      result.push(
        <span
          key={`highlight-${startPos}`}
          className={highlightClass}
        >
          {highlight.text}
        </span>
      )

      lastIndex = endPos
    }

    // Add remaining text
    if (lastIndex < paragraph.length) {
      result.push(paragraph.substring(lastIndex))
    }

    return <p key={paragraphIndex} className="notion-text">{result}</p>
  }

  // Handle question rendering
  const renderQuestion = (question: Question) => {
    switch (question.type) {
      case 'truefalse':
        return (
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`question-${question.id}`}
                value="true"
                checked={answers[question.id] === 'true'}
                onChange={() => handleAnswerChange(question.id, 'true')}
                disabled={isSubmitted}
                className="text-notion-blue"
              />
              <span>True</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name={`question-${question.id}`}
                value="false"
                checked={answers[question.id] === 'false'}
                onChange={() => handleAnswerChange(question.id, 'false')}
                disabled={isSubmitted}
                className="text-notion-blue"
              />
              <span>False</span>
            </label>
          </div>
        )
      case 'multichoice':
        return (
          <div className="space-y-2">
            {question.options?.map((option, idx) => {
              const optionValue = String.fromCharCode(65 + idx) // A, B, C, D...
              return (
                <label key={idx} className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={optionValue}
                    checked={answers[question.id] === optionValue}
                    onChange={() => handleAnswerChange(question.id, optionValue)}
                    disabled={isSubmitted}
                    className="mt-1 text-notion-blue"
                  />
                  <span>
                    <span className="font-medium">{optionValue}.</span> {option}
                  </span>
                </label>
              )
            })}
          </div>
        )
      case 'fillblank':
        return (
          <div className="mt-2">
            <input
              type="text"
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your answer..."
              disabled={isSubmitted}
            />
          </div>
        )
      case 'matching':
        return (
          <div className="mt-2">
            <select
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitted}
            >
              <option value="">Select an option...</option>
              {question.options?.map((option, idx) => {
                const optionValue = String.fromCharCode(65 + idx) // A, B, C, D...
                return (
                  <option key={idx} value={optionValue}>
                    {optionValue}. {option}
                  </option>
                )
              })}
            </select>
          </div>
        )
      default:
        return null
    }
  }

  // Handle answer changes
  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  // Handle submission
  const handleSubmit = (submittedAnswers: Record<number, string>) => {
    stopTimer()
    setIsSubmitted(true)
    onSubmit?.(submittedAnswers)
  }

  // Get current part questions
  const currentPartData = parts[currentPart] || { questions: [], name: '' }
  const currentQuestions = currentPartData.questions || []
  const answeredCount = Object.keys(answers).length

  // Handle part change
  const handlePartChange = (partIndex: number) => {
    setCurrentPart(partIndex)
    setCurrentQuestion(0)
  }

  // Handle word selection when text is clicked
  const handleWordClick = (event: React.MouseEvent) => {
    // Only process if the target is a text node
    if (event.target instanceof HTMLElement) {
      const word = event.target.textContent?.trim()
      if (word && onWordSelect) {
        onWordSelect(word)
      }
    }
  }

  // Add word click handler to paragraphs
  useEffect(() => {
    const paragraphElements = containerRef.current?.querySelectorAll('p')
    if (paragraphElements && onWordSelect) {
      paragraphElements.forEach(p => {
        p.addEventListener('click', handleWordClick as unknown as EventListener)
      })

      return () => {
        paragraphElements.forEach(p => {
          p.removeEventListener('click', handleWordClick as unknown as EventListener)
        })
      }
    }
  }, [paragraphs.length, onWordSelect])

  return (
    <div className="flex flex-col h-full bg-notion-bg-default">
      {/* IELTS Exam Header - Notion style */}
      <div className="sticky top-0 z-10 bg-notion-bg-default border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-medium text-notion-text-default">IELTS Reading Test</h1>
              {wordCount > 0 && (
                <span className="text-sm text-notion-text-gray">
                  {wordCount} words
                </span>
              )}
              {difficulty && (
                <span className={`text-sm px-2 py-1 rounded-full ${
                  difficulty.toLowerCase() === 'easy' ? 'bg-notion-bg-green text-notion-text-green' :
                  difficulty.toLowerCase() === 'medium' ? 'bg-notion-bg-yellow text-notion-text-yellow' :
                  'bg-notion-bg-red text-notion-text-red'
                }`}>
                  {difficulty}
                </span>
              )}
              {topic && (
                <span className="text-sm text-notion-text-gray bg-notion-bg-gray px-2 py-1 rounded-full">
                  {topic}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-1 ${timeRemaining < 300 ? 'text-notion-text-red' : 'text-notion-text-default'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={`font-mono ${timeRemaining < 300 ? 'font-bold' : ''}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>

              {!isSubmitted ? (
                <Button
                  onClick={() => handleSubmit(answers)}
                  className="bg-notion-bg-blue text-notion-text-blue hover:bg-notion-bg-blue/80"
                >
                  Submit ({answeredCount}/{currentQuestions.length})
                </Button>
              ) : (
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-notion-bg-green text-notion-text-green hover:bg-notion-bg-green/80"
                >
                  Restart
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
        {/* Left Column: Reading Passage */}
        <div className="overflow-y-auto bg-notion-bg-default p-4 md:p-6 border-b lg:border-b-0 lg:border-r border-gray-200">
          <div
            ref={containerRef}
            className="notion-reader-container"
            onMouseUp={handleTextSelection}
          >
            {title && <h1 className="notion-h1">{title}</h1>}
            {paragraphs.map((paragraph, index) => renderParagraphWithHighlights(paragraph, index))}
          </div>

          {/* Highlight Toolbar */}
          {showHighlightToolbar && (
            <div
              className="notion-selection-toolbar notion-fade-in"
              style={{ left: selectionPosition.x, top: selectionPosition.y }}
            >
              <button
                className="notion-selection-toolbar-item"
                onClick={() => addHighlight('#FFEB3B80')}
                title="Yellow Highlight"
              >
                <div className="w-4 h-4 rounded-full bg-notion-bg-yellow border border-notion-yellow"></div>
              </button>
              <button
                className="notion-selection-toolbar-item"
                onClick={() => addHighlight('#A5D6A780')}
                title="Green Highlight"
              >
                <div className="w-4 h-4 rounded-full bg-notion-bg-green border border-notion-green"></div>
              </button>
              <button
                className="notion-selection-toolbar-item"
                onClick={() => addHighlight('#90CAF980')}
                title="Blue Highlight"
              >
                <div className="w-4 h-4 rounded-full bg-notion-bg-blue border border-notion-blue"></div>
              </button>
              <button
                className="notion-selection-toolbar-item"
                onClick={() => addHighlight('#E1BEE780')}
                title="Purple Highlight"
              >
                <div className="w-4 h-4 rounded-full bg-notion-bg-purple border border-notion-purple"></div>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Questions */}
        <div className="overflow-y-auto bg-notion-bg-default p-4 md:p-6 border-t lg:border-t-0 lg:border-l border-gray-200">
          <div className="mb-6">
            <h2 className="notion-h2 mb-3">
              {currentPartData.name || 'Questions'}
            </h2>

            {/* Question Navigation */}
            <div className="flex flex-wrap gap-2 mb-6">
              {currentQuestions.map((question, index) => (
                <button
                  key={question.id}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${
                    currentQuestion === index
                      ? 'bg-notion-bg-blue text-notion-text-blue'
                      : answers[question.id]
                        ? 'bg-notion-bg-gray text-notion-text-default'
                        : 'border border-gray-300 hover:bg-notion-bg-gray/50'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {/* Current Question */}
            {currentQuestions.length > 0 && (
              <div className="notion-card p-4">
                <div className="flex">
                  <div className="w-8 h-8 bg-notion-bg-blue text-notion-text-blue flex items-center justify-center rounded-full font-medium">
                    {currentQuestion + 1}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="mb-3 notion-text">
                      {currentQuestions[currentQuestion]?.text}
                    </div>
                    {currentQuestions[currentQuestion] && renderQuestion(currentQuestions[currentQuestion])}

                    {/* Show correct answer in test results view */}
                    {isSubmitted && testResults.length > 0 && (
                      <div className="mt-3 text-sm">
                        {/* Find the result for this question */}
                        {testResults.find(r => r.questionId === String(currentQuestions[currentQuestion]?.id))?.isCorrect ? (
                          <div className="text-notion-text-green font-medium flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Correct
                          </div>
                        ) : (
                          <div className="text-notion-text-red font-medium flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Incorrect. Correct answer: {testResults.find(r => r.questionId === String(currentQuestions[currentQuestion]?.id))?.correctAnswer}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Part Navigation and Highlights */}
      <div className="bg-notion-bg-default border-t border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {parts.map((part, index) => (
              <button
                key={part.id}
                className={`notion-block px-3 py-1 rounded-md text-sm font-medium ${
                  currentPart === index
                    ? 'bg-notion-bg-blue text-notion-text-blue'
                    : 'hover:bg-notion-bg-gray'
                }`}
                onClick={() => handlePartChange(index)}
              >
                {part.name}
              </button>
            ))}
          </div>

          <div className="flex items-center">
            <div className="flex space-x-2">
              <button
                onClick={() => currentQuestion > 0 && setCurrentQuestion(currentQuestion - 1)}
                disabled={currentQuestion === 0}
                className="px-3 py-1 rounded-md text-sm font-medium hover:bg-notion-bg-gray disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => currentQuestion < currentQuestions.length - 1 && setCurrentQuestion(currentQuestion + 1)}
                disabled={currentQuestion >= currentQuestions.length - 1}
                className="px-3 py-1 rounded-md text-sm font-medium hover:bg-notion-bg-gray disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          {/* Highlight Counter */}
          <div className="flex items-center">
            {userHighlights.length > 0 && (
              <div className="text-xs text-notion-text-gray">
                {userHighlights.length} highlights
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}