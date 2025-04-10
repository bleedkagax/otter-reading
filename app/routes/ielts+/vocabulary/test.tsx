import { useState, useEffect } from 'react'
import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '#app/utils/router-helpers'
import { useLoaderData, useActionData, useFetcher } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { useTheme } from '#app/routes/resources+/theme-switch'

interface VocabularyWithPassage {
  id: string
  word: string
  context: string | null
  note: string | null
  status: string
  lastReviewed: Date | null
  reviewCount: number
  createdAt: Date
  passage: {
    id: string
    title: string
  } | null
}

interface TestQuestion {
  id: string
  word: string
  context: string | null
  options: string[]
  correctIndex: number
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request)
  
  // Get URL parameters
  const url = new URL(request.url)
  const mode = url.searchParams.get('mode') || 'mixed'
  const count = parseInt(url.searchParams.get('count') || '10')
  
  // Get vocabulary based on mode
  let vocabularies: VocabularyWithPassage[] = []
  
  if (mode === 'mixed') {
    // Mixed mode - random selection
    vocabularies = await prisma.ieltsUserVocabulary.findMany({
      where: { userId },
      orderBy: { lastReviewed: 'asc' },
      take: count,
      include: {
        passage: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })
  } else if (mode === 'difficult') {
    // Difficult words mode
    vocabularies = await prisma.ieltsUserVocabulary.findMany({
      where: {
        userId,
        status: 'difficult'
      },
      orderBy: { lastReviewed: 'asc' },
      take: count,
      include: {
        passage: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })
  } else if (mode === 'recent') {
    // Recently added words
    vocabularies = await prisma.ieltsUserVocabulary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: count,
      include: {
        passage: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })
  }
  
  // Get additional words for options
  const allWords = await prisma.ieltsUserVocabulary.findMany({
    where: { 
      userId,
      id: { notIn: vocabularies.map(v => v.id) }
    },
    select: { word: true },
    take: count * 3 // Get 3 times as many words for options
  })
  
  // Create test questions
  const questions: TestQuestion[] = vocabularies.map(vocab => {
    // Get 3 random words for options
    const randomWords = getRandomItems(
      allWords.map(w => w.word).filter(w => w !== vocab.word), 
      3
    )
    
    // Create options with the correct answer at a random position
    const options = [...randomWords]
    const correctIndex = Math.floor(Math.random() * 4) // Random position (0-3)
    options.splice(correctIndex, 0, vocab.word)
    
    return {
      id: vocab.id,
      word: vocab.word,
      context: vocab.context,
      options,
      correctIndex
    }
  })
  
  // Get vocabulary stats
  const stats = await prisma.$transaction([
    prisma.ieltsUserVocabulary.count({ where: { userId, status: 'active' } }),
    prisma.ieltsUserVocabulary.count({ where: { userId, status: 'mastered' } }),
    prisma.ieltsUserVocabulary.count({ where: { userId, status: 'difficult' } }),
    prisma.ieltsUserVocabulary.count({ where: { userId } })
  ])
  
  return json({
    questions,
    stats: {
      active: stats[0],
      mastered: stats[1],
      difficult: stats[2],
      total: stats[3]
    },
    mode,
    count
  })
}

// Helper function to get random items from an array
function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const intent = formData.get('intent') as string
  
  if (intent === 'submitTest') {
    const results = JSON.parse(formData.get('results') as string)
    
    if (!results || !Array.isArray(results)) {
      return json({ error: 'Invalid results data' }, { status: 400 })
    }
    
    try {
      // Update vocabulary statuses based on test results
      for (const result of results) {
        await prisma.ieltsUserVocabulary.update({
          where: {
            id: result.id,
            userId // Ensure the vocabulary belongs to the current user
          },
          data: {
            status: result.isCorrect ? 'mastered' : 'difficult',
            lastReviewed: new Date(),
            reviewCount: { increment: 1 }
          }
        })
      }
      
      return json({ 
        success: true, 
        correctCount: results.filter((r: any) => r.isCorrect).length,
        totalCount: results.length
      })
    } catch (error) {
      console.error('Error updating vocabulary statuses:', error)
      return json({ error: 'Failed to update vocabulary statuses' }, { status: 500 })
    }
  }
  
  return json({ error: 'Invalid intent' }, { status: 400 })
}

export default function VocabularyTestPage() {
  const { questions, stats, mode, count } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const theme = useTheme()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [results, setResults] = useState<{
    correctCount: number
    totalCount: number
    details: Array<{
      id: string
      word: string
      isCorrect: boolean
      selectedOption: number
      correctOption: number
    }>
  } | null>(null)
  const submitFetcher = useFetcher()
  
  const currentQuestion = questions[currentIndex]
  
  // Handle option selection
  const selectOption = (optionIndex: number) => {
    if (isSubmitted) return
    
    setSelectedOption(optionIndex)
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionIndex
    }))
  }
  
  // Move to next question
  const goToNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedOption(answers[questions[currentIndex + 1]?.id] ?? null)
    }
  }
  
  // Move to previous question
  const goToPreviousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setSelectedOption(answers[questions[currentIndex - 1]?.id] ?? null)
    }
  }
  
  // Submit test
  const submitTest = () => {
    if (Object.keys(answers).length === 0) return
    
    // Calculate results
    const details = questions.map(question => {
      const selectedOption = answers[question.id] ?? -1
      return {
        id: question.id,
        word: question.word,
        isCorrect: selectedOption === question.correctIndex,
        selectedOption,
        correctOption: question.correctIndex
      }
    })
    
    const correctCount = details.filter(d => d.isCorrect).length
    
    setResults({
      correctCount,
      totalCount: questions.length,
      details
    })
    
    setIsSubmitted(true)
    
    // Submit results to server
    submitFetcher.submit(
      {
        intent: 'submitTest',
        results: JSON.stringify(details)
      },
      { method: 'post' }
    )
  }
  
  // Reset test
  const resetTest = () => {
    setCurrentIndex(0)
    setSelectedOption(null)
    setAnswers({})
    setIsSubmitted(false)
    setResults(null)
    window.location.reload()
  }
  
  // Calculate progress
  const answeredCount = Object.keys(answers).length
  const progress = questions.length > 0 
    ? Math.round((answeredCount / questions.length) * 100) 
    : 0
  
  // If test is submitted, show results
  if (isSubmitted && results) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-card text-card-foreground rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-8 text-center">测试结果</h1>
          
          <div className="bg-muted rounded-lg p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
              <div>
                <p className="text-muted-foreground mb-1">得分</p>
                <p className={`text-4xl font-bold ${
                  (results.correctCount / results.totalCount) >= 0.7 ? 'text-green-600' : 
                  (results.correctCount / results.totalCount) >= 0.4 ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>
                  {Math.round((results.correctCount / results.totalCount) * 100)}%
                </p>
              </div>
              
              <div>
                <p className="text-muted-foreground mb-1">正确答案</p>
                <p className="text-4xl font-bold">
                  {results.correctCount}/{results.totalCount}
                </p>
              </div>
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-muted-foreground">
                {(results.correctCount / results.totalCount) >= 0.7 ? '优秀！你的词汇掌握得很好！' : 
                 (results.correctCount / results.totalCount) >= 0.4 ? '不错的尝试！继续练习，你会做得更好！' : 
                 '继续努力！通过更多练习，你的词汇量会提高！'}
              </p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4">详细结果</h2>
            
            {results.details.map((result, idx) => (
              <div key={result.id} className={`p-4 rounded-lg border ${
                result.isCorrect
                  ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                  : 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
              }`}>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">单词 {idx + 1}: {result.word}</span>
                  <span className={
                    result.isCorrect
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }>
                    {result.isCorrect ? '✓ 正确' : '✗ 错误'}
                  </span>
                </div>
                
                <div className="text-sm mt-2">
                  <p className="mb-1">你的选择: <strong>
                    {result.selectedOption >= 0 
                      ? questions[idx].options[result.selectedOption] 
                      : '(未回答)'}
                  </strong></p>
                  {!result.isCorrect && (
                    <p>正确答案: <strong>{questions[idx].options[result.correctOption]}</strong></p>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={resetTest}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              再次测试
            </button>
            
            <a 
              href="/ielts/vocabulary"
              className="px-4 py-2 border border-border rounded-md hover:bg-muted"
            >
              返回词汇管理
            </a>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">词汇测试</h1>
          <p className="text-muted-foreground">
            {mode === 'mixed' ? '混合模式' : 
             mode === 'difficult' ? '困难词汇模式' : 
             '最近添加模式'}
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            进度: {answeredCount}/{questions.length} ({progress}%)
          </div>
          
          <div className="flex gap-2">
            <a 
              href={`/ielts/vocabulary/test?mode=mixed&count=${count}`}
              className={`px-3 py-1.5 rounded-md text-sm ${
                mode === 'mixed' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              混合模式
            </a>
            <a 
              href={`/ielts/vocabulary/test?mode=difficult&count=${count}`}
              className={`px-3 py-1.5 rounded-md text-sm ${
                mode === 'difficult' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              困难词汇
            </a>
            <a 
              href={`/ielts/vocabulary/test?mode=recent&count=${count}`}
              className={`px-3 py-1.5 rounded-md text-sm ${
                mode === 'recent' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              最近添加
            </a>
          </div>
        </div>
      </div>
      
      {questions.length === 0 ? (
        <div className="bg-card text-card-foreground rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">没有足够的词汇进行测试</h2>
          <p className="text-muted-foreground mb-6">
            您需要添加更多词汇才能进行测试。
          </p>
          <div className="flex justify-center gap-4">
            <a 
              href="/ielts/passages" 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              浏览文章
            </a>
            <a 
              href="/ielts/vocabulary" 
              className="px-4 py-2 border border-border rounded-md hover:bg-muted"
            >
              词汇管理
            </a>
          </div>
        </div>
      ) : currentQuestion ? (
        <div className="bg-card text-card-foreground rounded-lg shadow-md overflow-hidden">
          {/* Progress bar */}
          <div className="w-full h-1 bg-muted">
            <div 
              className="h-full bg-primary" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold mb-1">选择正确的单词</h2>
                <p className="text-sm text-muted-foreground">
                  根据上下文选择正确的单词
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {questions.length}
              </span>
            </div>
            
            {/* Context */}
            {currentQuestion.context && (
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <p className="text-base">
                  {currentQuestion.context.replace(
                    new RegExp(currentQuestion.word, 'gi'), 
                    '________'
                  )}
                </p>
              </div>
            )}
            
            {/* Options */}
            <div className="space-y-3 mb-8">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => selectOption(idx)}
                  className={`w-full p-4 text-left rounded-md border ${
                    selectedOption === idx
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-6 h-6 flex items-center justify-center rounded-full mr-3 ${
                      selectedOption === idx
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-base">{option}</span>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={goToPreviousQuestion}
                disabled={currentIndex === 0}
                className={`px-4 py-2 rounded-md ${
                  currentIndex === 0
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                上一题
              </button>
              
              {currentIndex === questions.length - 1 ? (
                <button
                  onClick={submitTest}
                  disabled={answeredCount < questions.length}
                  className={`px-4 py-2 rounded-md ${
                    answeredCount < questions.length
                      ? 'bg-primary/50 text-primary-foreground cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  提交测试
                </button>
              ) : (
                <button
                  onClick={goToNextQuestion}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  下一题
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
      
      {/* Question navigation */}
      <div className="mt-6 bg-card text-card-foreground rounded-lg shadow-sm p-4">
        <h3 className="text-sm font-medium mb-3">题目导航:</h3>
        <div className="flex flex-wrap gap-2">
          {questions.map((question, idx) => (
            <button
              key={question.id}
              onClick={() => {
                setCurrentIndex(idx)
                setSelectedOption(answers[question.id] ?? null)
              }}
              className={`w-8 h-8 flex items-center justify-center rounded-full ${
                currentIndex === idx
                  ? 'bg-primary text-primary-foreground' 
                  : question.id in answers
                    ? 'bg-muted text-foreground' 
                    : 'bg-muted/50 text-muted-foreground'
              }`}
              aria-label={`跳转到问题 ${idx + 1}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
