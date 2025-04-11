import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '#app/utils/router-helpers'
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
  }
}

interface ActionData {
  success?: boolean
  error?: string
  vocabularyId?: string
}

// 计算下一次复习时间（简化版间隔重复算法）
function calculateNextReviewDate(reviewCount: number, isMastered: boolean): Date {
  const now = new Date()
  let daysToAdd = 1

  if (isMastered) {
    // 已掌握的词汇，根据复习次数增加间隔
    if (reviewCount <= 1) daysToAdd = 2
    else if (reviewCount <= 3) daysToAdd = 7
    else if (reviewCount <= 5) daysToAdd = 14
    else daysToAdd = 30
  } else {
    // 未掌握的词汇
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

  // 获取需要复习的词汇 - 暂时使用未掌握的词汇
  const dueVocabulary = await prisma.ieltsUserVocabulary.findMany({
    where: {
      userId,
      mastered: false
    },
    orderBy: [
      { lastReviewed: 'asc' } // 最久未复习的优先
    ],
    take: 50, // 限制每次复习的数量
    include: {
      passage: {
        select: {
          id: true,
          title: true
        }
      }
    }
  })

  // 获取统计数据
  const totalCount = await prisma.ieltsUserVocabulary.count({ where: { userId } })
  const masteredCount = await prisma.ieltsUserVocabulary.count({ where: { userId, mastered: true } })
  const difficultCount = await prisma.ieltsUserVocabulary.count({ where: { userId, mastered: false } }) // 暂时使用未掌握的作为困难词
  const dueCount = await prisma.ieltsUserVocabulary.count({
    where: {
      userId,
      mastered: false
    }
  })

  return json<LoaderData>({
    vocabulary: dueVocabulary,
    stats: {
      total: totalCount,
      due: dueCount,
      mastered: masteredCount,
      difficult: difficultCount
    }
  })
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const intent = formData.get('intent') as string

  if (intent === 'updateStatus') {
    const id = formData.get('id') as string
    const status = formData.get('status') as string
    const masteredStr = formData.get('mastered') as string

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

    // 更新状态 - 使用从表单中获取的mastered值
    const mastered = masteredStr === 'true'

    // 更新状态
    await prisma.ieltsUserVocabulary.update({
      where: { id },
      data: {
        mastered,
        lastReviewed: new Date(),
        reviewCount: {
          increment: 1
        }
      }
    })

    return json<ActionData>({ success: true, vocabularyId: id })
  }

  return json<ActionData>({ success: false, error: '未知操作' }, { status: 400 })
}

export default function VocabularyReviewPage() {
  const { vocabulary, stats } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [remainingVocabulary, setRemainingVocabulary] = useState(vocabulary)

  // 当有单词状态更新时，从列表中移除该单词
  useEffect(() => {
    if (actionData?.success && actionData.vocabularyId) {
      setRemainingVocabulary(prev =>
        prev.filter(v => v.id !== actionData.vocabularyId)
      )
      setReviewedCount(prev => prev + 1)
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

    // 将status转换为mastered字段
    const masteredInput = document.createElement('input')
    masteredInput.name = 'mastered'
    masteredInput.value = (status === 'mastered').toString()
    form.appendChild(masteredInput)

    // 保存原始状态以便于将来迁移
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
    } else {
      // 已经是最后一个单词，重置索引
      setCurrentIndex(0)
    }
  }

  // 当前要显示的单词
  const currentVocab = remainingVocabulary.length > 0 ? remainingVocabulary[currentIndex] : null

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">词汇复习</h1>
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
          <span className="text-sm font-medium text-gray-700">今日复习进度</span>
          <span className="text-sm text-gray-600">{reviewedCount} / {stats.due}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${stats.due > 0 ? (reviewedCount / stats.due * 100) : 0}%` }}
          ></div>
        </div>
      </div>

      {/* 单词卡片 */}
      {remainingVocabulary.length > 0 ? (
        <div className="mb-8">
          <VocabularyFlashcard
            word={currentVocab?.word || ''}
            context={currentVocab?.context || undefined}
            note={currentVocab?.note || undefined}
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
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-800 mb-2">今日复习完成！</h2>
          <p className="text-gray-600 mb-6">你已经完成了今天所有需要复习的单词。明天再来继续提高吧！</p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/ielts/vocabulary"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              返回词汇库
            </Link>
            <Link
              to="/ielts/passages"
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              阅读更多文章
            </Link>
          </div>
        </div>
      )}

      {/* 复习提示 */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">间隔重复提示</h3>
        <p className="text-sm text-yellow-700 mb-2">
          使用间隔重复法学习词汇是提高记忆效率的最佳方式。根据你对每个单词的掌握程度，系统会自动安排下次复习时间：
        </p>
        <ul className="list-disc pl-5 text-sm text-yellow-700 space-y-1">
          <li><span className="font-medium">困难</span>：每天复习</li>
          <li><span className="font-medium">复习</span>：根据复习次数，间隔1-14天</li>
          <li><span className="font-medium">掌握</span>：根据复习次数，间隔2-30天</li>
        </ul>
      </div>
    </div>
  )
}
