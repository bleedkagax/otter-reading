import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '#app/utils/router-helpers'
import { Link, useLoaderData, useActionData, Form } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { useState, useEffect } from 'react'
import { VocabularyFlashcard } from '#app/components/ielts/VocabularyFlashcard'

interface LoaderData {
  vocabulary: Array<{
    id: string
    word: string
    context: string | null
    note: string | null
    mastered: boolean
    status: string
    lastReviewed: Date | null
    reviewCount: number
    passage?: {
      id: string
      title: string | null
    } | null
  }>
  stats: {
    total: number
    due: number
    mastered: number
    difficult: number
    active: number
  }
  learningMode: string
}

interface ActionData {
  success?: boolean
  error?: string
  vocabularyId?: string
}

// 计算下一次复习时间（间隔重复算法）
function calculateNextReviewDate(reviewCount: number, status: string): Date {
  const now = new Date()
  let daysToAdd = 1

  // 暂时使用简化的逻辑，只根据status判断
  if (status === 'mastered') {
    // 已掌握的词汇，根据复习次数增加间隔
    if (reviewCount <= 1) daysToAdd = 2
    else if (reviewCount <= 3) daysToAdd = 7
    else if (reviewCount <= 5) daysToAdd = 14
    else daysToAdd = 30
  } else {
    // 其他所有词汇（困难或普通）
    if (reviewCount <= 1) daysToAdd = 1
    else if (reviewCount <= 3) daysToAdd = 3
    else if (reviewCount <= 5) daysToAdd = 7
    else daysToAdd = 14
  }

  const nextDate = new Date(now)
  nextDate.setDate(now.getDate() + daysToAdd)
  return nextDate
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request)

  // 获取学习模式
  const url = new URL(request.url)
  const learningMode = url.searchParams.get('mode') || 'new'

  // 根据学习模式获取词汇
  let vocabularyQuery: any = {
    where: { userId },
    take: 50,
    include: {
      passage: {
        select: {
          id: true,
          title: true
        }
      }
    }
  }

  if (learningMode === 'new') {
    // 新词模式：获取最近添加且未掌握的词汇
    vocabularyQuery.where.mastered = false
    vocabularyQuery.where.reviewCount = 0
    vocabularyQuery.orderBy = { createdAt: 'desc' }
  } else if (learningMode === 'due') {
    // 待复习模式：获取今天需要复习的词汇
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    vocabularyQuery.where.OR = [
      { lastReviewed: null },
      { nextReviewDate: { lte: today } }
    ]
    vocabularyQuery.orderBy = [
      // 暂时去掉status排序
      { lastReviewed: 'asc' } // 最久未复习的优先
    ]
  } else if (learningMode === 'difficult') {
    // 困难词模式：暂时使用未掌握的词汇
    vocabularyQuery.where.mastered = false
    vocabularyQuery.orderBy = { lastReviewed: 'asc' }
  } else if (learningMode === 'mastered') {
    // 已掌握模式：获取已掌握的词汇进行巩固
    vocabularyQuery.where.mastered = true
    vocabularyQuery.orderBy = { lastReviewed: 'asc' }
  }

  const vocabulary = await prisma.ieltsUserVocabulary.findMany(vocabularyQuery)

  // 获取统计数据 - 暂时使用mastered字段
  const totalCount = await prisma.ieltsUserVocabulary.count({ where: { userId } })
  const masteredCount = await prisma.ieltsUserVocabulary.count({ where: { userId, mastered: true } })
  const difficultCount = await prisma.ieltsUserVocabulary.count({ where: { userId, mastered: false } }) // 暂时使用未掌握的词作为困难词
  const activeCount = await prisma.ieltsUserVocabulary.count({ where: { userId, mastered: false } }) // 暂时使用未掌握的词作为活跃词

  // 获取待复习的词汇数量
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueCount = await prisma.ieltsUserVocabulary.count({
    where: {
      userId,
      OR: [
        { lastReviewed: null },
        { nextReviewDate: { lte: today } }
      ]
    }
  })

  return json<LoaderData>({
    vocabulary,
    stats: {
      total: totalCount,
      due: dueCount,
      mastered: masteredCount,
      difficult: difficultCount,
      active: activeCount
    },
    learningMode
  })
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const intent = formData.get('intent') as string

  if (intent === 'updateStatus') {
    const id = formData.get('id') as string
    const status = formData.get('status') as string

    if (!id || !status) {
      return json<ActionData>({ success: false, error: '参数错误' }, { status: 400 })
    }

    // 验证是否是用户的单词
    const vocab = await prisma.ieltsUserVocabulary.findFirst({
      where: { id, userId }
    })

    if (!vocab) {
      return json<ActionData>({ success: false, error: '单词不存在或无权限' }, { status: 403 })
    }

    // 计算下一次复习时间
    const nextReviewDate = calculateNextReviewDate(vocab.reviewCount, status)

    // 更新状态 - 暂时只使用mastered字段
    const mastered = status === 'mastered'

    await prisma.ieltsUserVocabulary.update({
      where: { id },
      data: {
        // status字段暂时不使用
        mastered,
        lastReviewed: new Date(),
        nextReviewDate,
        reviewCount: {
          increment: 1
        }
      }
    })

    return json<ActionData>({ success: true, vocabularyId: id })
  }

  return json<ActionData>({ success: false, error: '未知操作' }, { status: 400 })
}

export default function VocabularyLearnPage() {
  const { vocabulary, stats, learningMode } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [remainingVocabulary, setRemainingVocabulary] = useState(vocabulary)
  const [showDefinition, setShowDefinition] = useState(false)
  const [definition, setDefinition] = useState<any>(null)
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false)

  // 当有单词状态更新时，从列表中移除该单词
  useEffect(() => {
    if (actionData?.success && actionData.vocabularyId) {
      setRemainingVocabulary(prev =>
        prev.filter(v => v.id !== actionData.vocabularyId)
      )
      setReviewedCount(prev => prev + 1)
      setShowDefinition(false)
      setDefinition(null)
    }
  }, [actionData])

  // 处理状态变更
  const handleStatusChange = (status: 'active' | 'mastered' | 'difficult') => {
    if (remainingVocabulary.length === 0) return

    const currentVocab = remainingVocabulary[currentIndex]

    // 提交表单更新状态
    const form = document.createElement('form')
    form.method = 'post'
    form.style.display = 'none'

    const intentInput = document.createElement('input')
    intentInput.name = 'intent'
    intentInput.value = 'updateStatus'
    form.appendChild(intentInput)

    const idInput = document.createElement('input')
    idInput.name = 'id'
    idInput.value = currentVocab.id
    form.appendChild(idInput)

    const statusInput = document.createElement('input')
    statusInput.name = 'status'
    statusInput.value = status
    form.appendChild(statusInput)

    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)
  }

  // 处理下一个单词
  const handleNext = () => {
    if (currentIndex < remainingVocabulary.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setShowDefinition(false)
      setDefinition(null)
    } else {
      // 已经是最后一个单词，重置索引
      setCurrentIndex(0)
      setShowDefinition(false)
      setDefinition(null)
    }
  }

  // 查询单词定义
  const fetchDefinition = async (word: string) => {
    if (!word) return

    setIsLoadingDefinition(true)

    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
      const data = await response.json()

      if (response.ok) {
        setDefinition(data)
      } else {
        setDefinition(null)
      }
    } catch (error) {
      console.error('Error fetching definition:', error)
      setDefinition(null)
    } finally {
      setIsLoadingDefinition(false)
    }
  }

  // 切换显示定义
  const toggleDefinition = () => {
    if (remainingVocabulary.length === 0) return

    const currentWord = remainingVocabulary[currentIndex].word

    if (!showDefinition) {
      fetchDefinition(currentWord)
    }

    setShowDefinition(!showDefinition)
  }

  // 当前要显示的单词
  const currentVocab = remainingVocabulary.length > 0 ? remainingVocabulary[currentIndex] : null

  // 获取学习模式的显示名称
  const getLearningModeName = (mode: string) => {
    switch (mode) {
      case 'new': return '新词学习'
      case 'due': return '待复习'
      case 'difficult': return '困难词汇'
      case 'mastered': return '巩固记忆'
      default: return '词汇学习'
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{getLearningModeName(learningMode)}</h1>
        <Link
          to="/ielts/vocabulary"
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          返回词汇库
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
      </div>

      {/* 学习模式选择 */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex flex-wrap gap-2">
          <Link
            to="/ielts/vocabulary/learn?mode=new"
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              learningMode === 'new'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            新词学习
            {stats.total > 0 && stats.mastered < stats.total && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {stats.total - stats.mastered}
              </span>
            )}
          </Link>

          <Link
            to="/ielts/vocabulary/learn?mode=due"
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              learningMode === 'due'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            待复习
            {stats.due > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {stats.due}
              </span>
            )}
          </Link>

          <Link
            to="/ielts/vocabulary/learn?mode=difficult"
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              learningMode === 'difficult'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            困难词汇
            {stats.difficult > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {stats.difficult}
              </span>
            )}
          </Link>

          <Link
            to="/ielts/vocabulary/learn?mode=mastered"
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              learningMode === 'mastered'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            巩固记忆
            {stats.mastered > 0 && (
              <span className="ml-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {stats.mastered}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* 进度统计 */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <p className="text-sm text-gray-600">今日待复习</p>
            <p className="text-xl font-bold text-blue-600">{stats.due}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <p className="text-sm text-gray-600">已掌握</p>
            <p className="text-xl font-bold text-green-600">{stats.mastered}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <p className="text-sm text-gray-600">困难词</p>
            <p className="text-xl font-bold text-red-600">{stats.difficult}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <p className="text-sm text-gray-600">总词汇量</p>
            <p className="text-xl font-bold text-gray-600">{stats.total}</p>
          </div>
        </div>

        <div className="mb-2 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">学习进度</span>
          <span className="text-sm text-gray-600">{reviewedCount} / {vocabulary.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${vocabulary.length > 0 ? (reviewedCount / vocabulary.length * 100) : 0}%` }}
          ></div>
        </div>
      </div>

      {/* 单词卡片 */}
      {remainingVocabulary.length > 0 ? (
        <div className="mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">
                  {currentIndex + 1} / {remainingVocabulary.length}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  currentVocab?.status === 'difficult'
                    ? 'bg-red-100 text-red-800'
                    : currentVocab?.status === 'mastered'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {currentVocab?.status === 'difficult'
                    ? '困难'
                    : currentVocab?.status === 'mastered'
                    ? '已掌握'
                    : '学习中'}
                </span>
              </div>
              <button
                onClick={toggleDefinition}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                {showDefinition ? '隐藏释义' : '查看释义'}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>

            <VocabularyFlashcard
              word={currentVocab?.word || ''}
              context={currentVocab?.context || undefined}
              note={currentVocab?.note || undefined}
              status={currentVocab?.status as any || 'active'}
              mastered={currentVocab?.mastered || false}
              onStatusChange={handleStatusChange}
              onNext={handleNext}
            />

            {currentVocab?.passage && (
              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  来自文章:
                  <Link
                    to={`/ielts/passages/${currentVocab.passage.id}/read`}
                    className="text-blue-600 hover:underline ml-1"
                  >
                    {currentVocab.passage.title}
                  </Link>
                </p>
              </div>
            )}

            {/* 单词释义 */}
            {showDefinition && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-lg font-medium mb-2">单词释义</h3>

                {isLoadingDefinition && (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                )}

                {!isLoadingDefinition && definition && (
                  <div className="space-y-4">
                    {definition.map((entry: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                          <h4 className="text-lg font-medium">{entry.word}</h4>
                          {entry.phonetics && entry.phonetics.length > 0 && entry.phonetics[0].text && (
                            <span className="text-sm text-gray-600 ml-2">{entry.phonetics[0].text}</span>
                          )}
                        </div>

                        {entry.meanings && entry.meanings.map((meaning: any, mIndex: number) => (
                          <div key={mIndex} className="mb-3">
                            <h5 className="text-sm font-medium text-gray-700 mb-1">
                              {meaning.partOfSpeech}
                            </h5>

                            <ol className="list-decimal pl-5 space-y-1">
                              {meaning.definitions.slice(0, 3).map((def: any, dIndex: number) => (
                                <li key={dIndex} className="text-sm">
                                  <p>{def.definition}</p>
                                  {def.example && (
                                    <p className="text-xs italic mt-1 text-gray-500">
                                      "{def.example}"
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ol>

                            {meaning.synonyms && meaning.synonyms.length > 0 && (
                              <div className="mt-2">
                                <h6 className="text-xs font-medium text-gray-500">
                                  同义词:
                                </h6>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {meaning.synonyms.slice(0, 5).map((synonym: string, sIndex: number) => (
                                    <span
                                      key={sIndex}
                                      className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded"
                                    >
                                      {synonym}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {!isLoadingDefinition && !definition && (
                  <div className="bg-gray-100 p-4 rounded text-gray-700">
                    <p>无法加载"{currentVocab?.word}"的释义</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-800 mb-2">学习完成！</h2>
          <p className="text-gray-600 mb-6">你已经完成了当前模式下的所有单词学习。</p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/ielts/vocabulary"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              返回词汇库
            </Link>
            <Link
              to="/ielts/vocabulary/test"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              开始测试
            </Link>
          </div>
        </div>
      )}

      {/* 学习提示 */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">学习提示</h3>
        <p className="text-sm text-yellow-700 mb-2">
          使用间隔重复法学习词汇是提高记忆效率的最佳方式。根据你对每个单词的掌握程度，系统会自动安排下次复习时间：
        </p>
        <ul className="list-disc pl-5 text-sm text-yellow-700 space-y-1">
          <li><span className="font-medium">困难</span>：每天复习</li>
          <li><span className="font-medium">学习中</span>：根据复习次数，间隔1-14天</li>
          <li><span className="font-medium">已掌握</span>：根据复习次数，间隔2-30天</li>
        </ul>
      </div>
    </div>
  )
}
