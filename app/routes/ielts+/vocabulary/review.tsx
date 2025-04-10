import { useState, useEffect } from 'react'
import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '#app/utils/router-helpers'
import { useLoaderData, useActionData, useFetcher } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { format } from 'date-fns'
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

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request)
  
  // Get URL parameters
  const url = new URL(request.url)
  const mode = url.searchParams.get('mode') || 'spaced'
  const count = parseInt(url.searchParams.get('count') || '10')
  
  // Determine which words to review based on mode
  let vocabularies: VocabularyWithPassage[] = []
  
  if (mode === 'spaced') {
    // Spaced repetition mode - prioritize words due for review
    vocabularies = await prisma.ieltsUserVocabulary.findMany({
      where: {
        userId,
        status: { not: 'mastered' }
      },
      orderBy: [
        { lastReviewed: 'asc' },
        { reviewCount: 'asc' }
      ],
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
  
  // Get vocabulary stats
  const stats = await prisma.$transaction([
    prisma.ieltsUserVocabulary.count({ where: { userId, status: 'active' } }),
    prisma.ieltsUserVocabulary.count({ where: { userId, status: 'mastered' } }),
    prisma.ieltsUserVocabulary.count({ where: { userId, status: 'difficult' } }),
    prisma.ieltsUserVocabulary.count({ where: { userId } })
  ])
  
  return json({
    vocabularies,
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

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const intent = formData.get('intent') as string
  
  if (intent === 'updateStatus') {
    const vocabId = formData.get('vocabId') as string
    const status = formData.get('status') as 'active' | 'mastered' | 'difficult'
    
    if (!vocabId || !status) {
      return json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    try {
      const vocab = await prisma.ieltsUserVocabulary.update({
        where: {
          id: vocabId,
          userId // Ensure the vocabulary belongs to the current user
        },
        data: {
          status,
          lastReviewed: new Date(),
          reviewCount: { increment: 1 }
        }
      })
      
      return json({ success: true, vocab })
    } catch (error) {
      console.error('Error updating vocabulary status:', error)
      return json({ error: 'Failed to update vocabulary status' }, { status: 500 })
    }
  }
  
  return json({ error: 'Invalid intent' }, { status: 400 })
}

export default function VocabularyReviewPage() {
  const { vocabularies, stats, mode, count } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const theme = useTheme()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showDefinition, setShowDefinition] = useState(false)
  const [definition, setDefinition] = useState<any>(null)
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false)
  const [reviewedWords, setReviewedWords] = useState<Set<string>>(new Set())
  const statusFetcher = useFetcher()
  
  const currentWord = vocabularies[currentIndex]
  
  // Load definition when a new word is shown
  useEffect(() => {
    if (currentWord && !definition) {
      loadDefinition(currentWord.word)
    }
  }, [currentWord])
  
  // Reset state when moving to a new word
  useEffect(() => {
    setShowDefinition(false)
    setDefinition(null)
  }, [currentIndex])
  
  // Load definition from dictionary API
  const loadDefinition = async (word: string) => {
    setIsLoadingDefinition(true)
    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
      const data = await response.json()
      setDefinition(data)
    } catch (error) {
      console.error('Error fetching definition:', error)
    } finally {
      setIsLoadingDefinition(false)
    }
  }
  
  // Handle marking word status
  const markWordStatus = (status: 'active' | 'mastered' | 'difficult') => {
    if (!currentWord) return
    
    statusFetcher.submit(
      {
        intent: 'updateStatus',
        vocabId: currentWord.id,
        status
      },
      { method: 'post' }
    )
    
    // Add to reviewed words
    setReviewedWords(prev => new Set(prev).add(currentWord.id))
    
    // Move to next word
    if (currentIndex < vocabularies.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }
  
  // Calculate progress
  const progress = vocabularies.length > 0 
    ? Math.round((reviewedWords.size / vocabularies.length) * 100) 
    : 0
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">词汇复习</h1>
          <p className="text-gray-600">
            {mode === 'spaced' ? '间隔重复模式' : 
             mode === 'difficult' ? '困难词汇模式' : 
             '最近添加模式'}
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center gap-4">
          <div className="text-sm text-gray-600">
            进度: {reviewedWords.size}/{vocabularies.length} ({progress}%)
          </div>
          
          <div className="flex gap-2">
            <a 
              href={`/ielts/vocabulary/review?mode=spaced&count=${count}`}
              className={`px-3 py-1.5 rounded-md text-sm ${
                mode === 'spaced' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              间隔重复
            </a>
            <a 
              href={`/ielts/vocabulary/review?mode=difficult&count=${count}`}
              className={`px-3 py-1.5 rounded-md text-sm ${
                mode === 'difficult' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              困难词汇
            </a>
            <a 
              href={`/ielts/vocabulary/review?mode=recent&count=${count}`}
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
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card text-card-foreground p-4 rounded-lg shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">总词汇量</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-card text-card-foreground p-4 rounded-lg shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">学习中</p>
          <p className="text-2xl font-bold">{stats.active}</p>
        </div>
        <div className="bg-card text-card-foreground p-4 rounded-lg shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">已掌握</p>
          <p className="text-2xl font-bold">{stats.mastered}</p>
        </div>
        <div className="bg-card text-card-foreground p-4 rounded-lg shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">困难词汇</p>
          <p className="text-2xl font-bold">{stats.difficult}</p>
        </div>
      </div>
      
      {vocabularies.length === 0 ? (
        <div className="bg-card text-card-foreground rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">没有需要复习的词汇</h2>
          <p className="text-muted-foreground mb-6">
            您可以在阅读文章时添加生词，或者尝试其他复习模式。
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
      ) : currentWord ? (
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
              <h2 className="text-2xl font-bold">{currentWord.word}</h2>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {vocabularies.length}
              </span>
            </div>
            
            {/* Word context */}
            {currentWord.context && (
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <p className="text-sm italic">"{currentWord.context}"</p>
                {currentWord.passage && (
                  <p className="text-xs text-muted-foreground mt-2">
                    — 来自 <a 
                      href={`/ielts/passages/${currentWord.passage.id}/read`}
                      className="text-primary hover:underline"
                    >
                      {currentWord.passage.title}
                    </a>
                  </p>
                )}
              </div>
            )}
            
            {/* User notes */}
            {currentWord.note && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">我的笔记:</h3>
                <p className="p-3 border border-border rounded-md">{currentWord.note}</p>
              </div>
            )}
            
            {/* Definition */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">定义:</h3>
                <button 
                  onClick={() => setShowDefinition(!showDefinition)}
                  className="text-sm text-primary hover:underline"
                >
                  {showDefinition ? '隐藏定义' : '显示定义'}
                </button>
              </div>
              
              {showDefinition && (
                <div className="p-4 border border-border rounded-md">
                  {isLoadingDefinition ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : definition && Array.isArray(definition) ? (
                    <div>
                      {definition.slice(0, 1).map((entry: any, entryIndex: number) => (
                        <div key={entryIndex}>
                          {entry.phonetics?.[0]?.text && (
                            <p className="text-sm mb-2">{entry.phonetics[0].text}</p>
                          )}
                          
                          {entry.meanings?.map((meaning: any, meaningIndex: number) => (
                            <div key={meaningIndex} className="mb-3">
                              <p className="text-sm font-medium">{meaning.partOfSpeech}</p>
                              <ol className="list-decimal pl-5 mt-1">
                                {meaning.definitions?.slice(0, 3).map((def: any, defIndex: number) => (
                                  <li key={defIndex} className="text-sm mt-1">
                                    <p>{def.definition}</p>
                                    {def.example && (
                                      <p className="text-xs italic mt-1 text-muted-foreground">
                                        "{def.example}"
                                      </p>
                                    )}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">无法加载定义</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => markWordStatus('difficult')}
                className="flex-1 py-3 bg-red-100 text-red-700 font-medium rounded-l-md hover:bg-red-200 transition-colors"
              >
                困难
              </button>
              <button
                onClick={() => markWordStatus('active')}
                className="flex-1 py-3 bg-yellow-100 text-yellow-700 font-medium hover:bg-yellow-200 transition-colors"
              >
                再复习
              </button>
              <button
                onClick={() => markWordStatus('mastered')}
                className="flex-1 py-3 bg-green-100 text-green-700 font-medium rounded-r-md hover:bg-green-200 transition-colors"
              >
                已掌握
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card text-card-foreground rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">复习完成！</h2>
          <p className="text-muted-foreground mb-6">
            您已完成所有词汇的复习。
          </p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => {
                setReviewedWords(new Set())
                setCurrentIndex(0)
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              再次复习
            </button>
            <a 
              href="/ielts/vocabulary" 
              className="px-4 py-2 border border-border rounded-md hover:bg-muted"
            >
              返回词汇管理
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
