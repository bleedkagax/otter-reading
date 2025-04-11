import { json, type LoaderFunctionArgs } from '#app/utils/router-helpers'
import { Link, useLoaderData } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { useState, useEffect } from 'react'

interface LoaderData {
  vocabulary: Array<{
    id: string
    word: string
    context: string | null
    mastered: boolean
  }>
  stats: {
    total: number
    mastered: number
    difficult: number
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request)

  // 获取用户的词汇（限制为最近添加的100个）
  const vocabulary = await prisma.ieltsUserVocabulary.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      word: true,
      context: true,
      mastered: true
    }
  })

  // 获取统计数据
  const totalCount = await prisma.ieltsUserVocabulary.count({ where: { userId } })
  const masteredCount = await prisma.ieltsUserVocabulary.count({ where: { userId, mastered: true } })
  const difficultCount = await prisma.ieltsUserVocabulary.count({ where: { userId, mastered: false } }) // 暂时使用未掌握的作为困难词

  return json<LoaderData>({
    vocabulary,
    stats: {
      total: totalCount,
      mastered: masteredCount,
      difficult: difficultCount
    }
  })
}

export default function VocabularyTestPage() {
  const { vocabulary, stats } = useLoaderData<typeof loader>()

  const [testWords, setTestWords] = useState<Array<{
    id: string
    word: string
    context: string | null
    options: string[]
    correctAnswer: string
  }>>([])

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [testStarted, setTestStarted] = useState(false)
  const [testCompleted, setTestCompleted] = useState(false)

  // 准备测试
  const prepareTest = (count: number = 10) => {
    if (vocabulary.length < 5) {
      alert('词汇量不足，请先添加更多单词')
      return
    }

    // 随机选择单词
    const shuffled = [...vocabulary].sort(() => 0.5 - Math.random())
    const selectedWords = shuffled.slice(0, Math.min(count, vocabulary.length))

    // 为每个单词准备选项
    const preparedWords = selectedWords.map(word => {
      // 从其他单词中随机选择3个作为干扰项
      const otherWords = vocabulary
        .filter(w => w.id !== word.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => w.word)

      // 合并正确答案和干扰项，并打乱顺序
      const options = [word.word, ...otherWords].sort(() => 0.5 - Math.random())

      return {
        id: word.id,
        word: word.word,
        context: word.context,
        options,
        correctAnswer: word.word
      }
    })

    setTestWords(preparedWords)
    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setShowResult(false)
    setScore({ correct: 0, total: 0 })
    setTestStarted(true)
    setTestCompleted(false)
  }

  // 检查答案
  const checkAnswer = () => {
    if (selectedAnswer === null) return

    const isCorrect = selectedAnswer === testWords[currentQuestion].correctAnswer
    setShowResult(true)

    if (isCorrect) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }))
    }

    setScore(prev => ({ ...prev, total: prev.total + 1 }))

    // 延迟后进入下一题
    setTimeout(() => {
      if (currentQuestion < testWords.length - 1) {
        setCurrentQuestion(currentQuestion + 1)
        setSelectedAnswer(null)
        setShowResult(false)
      } else {
        setTestCompleted(true)
      }
    }, 1500)
  }

  // 重新开始测试
  const restartTest = () => {
    setTestStarted(false)
    setTestCompleted(false)
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">词汇测试</h1>
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

      {/* 测试开始前的界面 */}
      {!testStarted && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">开始词汇测试</h2>
          <p className="text-gray-600 mb-6">
            测试将从你的词汇库中随机选择单词，通过上下文提示，选择正确的单词。这将帮助你检验自己的词汇掌握程度。
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <p className="text-sm text-gray-600">总词汇量</p>
              <p className="text-xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <p className="text-sm text-gray-600">已掌握</p>
              <p className="text-xl font-bold text-green-600">{stats.mastered}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <p className="text-sm text-gray-600">困难词</p>
              <p className="text-xl font-bold text-red-600">{stats.difficult}</p>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg text-center">
              <p className="text-sm text-gray-600">测试词数</p>
              <p className="text-xl font-bold text-yellow-600">10</p>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => prepareTest(10)}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-medium"
              disabled={vocabulary.length < 5}
            >
              开始测试
            </button>
          </div>

          {vocabulary.length < 5 && (
            <p className="text-red-500 text-center mt-4">
              词汇量不足，请先添加至少5个单词
            </p>
          )}
        </div>
      )}

      {/* 测试进行中 */}
      {testStarted && !testCompleted && testWords.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">问题 {currentQuestion + 1} / {testWords.length}</h2>
            <span className="text-sm text-gray-600">得分: {score.correct} / {score.total}</span>
          </div>

          <div className="mb-6">
            <p className="text-gray-700 mb-2">根据上下文选择正确的单词:</p>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
              {testWords[currentQuestion].context ? (
                <p className="text-gray-800 italic">
                  "...{testWords[currentQuestion].context.replace(
                    testWords[currentQuestion].word,
                    '______'
                  )}..."
                </p>
              ) : (
                <p className="text-gray-500 italic">
                  (无上下文提示)
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {testWords[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                onClick={() => setSelectedAnswer(option)}
                className={`w-full text-left p-3 rounded-lg border ${
                  selectedAnswer === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:bg-gray-50'
                } ${
                  showResult && option === testWords[currentQuestion].correctAnswer
                    ? 'bg-green-100 border-green-500'
                    : showResult && option === selectedAnswer && option !== testWords[currentQuestion].correctAnswer
                    ? 'bg-red-100 border-red-500'
                    : ''
                }`}
                disabled={showResult}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={checkAnswer}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
              disabled={selectedAnswer === null || showResult}
            >
              {showResult ? '请稍候...' : '提交答案'}
            </button>
          </div>
        </div>
      )}

      {/* 测试完成 */}
      {testCompleted && (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>

          <h2 className="text-2xl font-bold mb-2">测试完成！</h2>
          <p className="text-xl mb-6">
            你的得分: <span className="font-bold text-blue-600">{score.correct}</span> / {score.total}
            <span className="text-gray-600 ml-2">
              ({Math.round((score.correct / score.total) * 100)}%)
            </span>
          </p>

          <div className="mb-8">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${
                  score.correct / score.total >= 0.8
                    ? 'bg-green-600'
                    : score.correct / score.total >= 0.6
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${(score.correct / score.total) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={restartTest}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-medium"
            >
              再次测试
            </button>

            <Link
              to="/ielts/vocabulary/review"
              className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 font-medium"
            >
              开始复习
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
