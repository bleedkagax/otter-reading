import { json, type LoaderFunctionArgs } from '#app/utils/router-helpers'
import { Link, useLoaderData } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { useState, useEffect } from 'react'

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request)

  // 获取用户学习统计数据
  let userStats = await prisma.ieltsUserStats.findUnique({
    where: { userId },
  })

  if (!userStats) {
    // 如果不存在，创建初始统计数据
    userStats = await prisma.ieltsUserStats.create({
      data: {
        userId,
        readingTimeTotal: 0,
        passagesCompleted: 0,
        testsCompleted: 0,
        vocabLearned: 0,
      },
    })
  }

  // 获取最近的学习活动
  const recentAttempts = await prisma.ieltsAttempt.findMany({
    where: { userId },
    take: 5,
    orderBy: { startedAt: 'desc' },
    include: {
      passage: true,
      responses: true
    },
  })

  // 获取用户词汇学习情况
  const vocabularyStats = await prisma.$transaction([
    prisma.ieltsUserVocabulary.count({ where: { userId, mastered: false } }),
    prisma.ieltsUserVocabulary.count({ where: { userId, mastered: true } }),
    prisma.ieltsUserVocabulary.count({ where: { userId, mastered: false } }), // 暂时使用mastered字段
    prisma.ieltsUserVocabulary.count({ where: { userId } })
  ])

  // 获取每周学习进度
  const today = new Date()
  const oneWeekAgo = new Date(today)
  oneWeekAgo.setDate(today.getDate() - 7)

  const dailyActivity = await prisma.ieltsAttempt.groupBy({
    by: ['startedAt'],
    where: {
      userId,
      startedAt: {
        gte: oneWeekAgo
      }
    },
    _count: {
      id: true
    }
  })

  // 计算每种题型的正确率
  const questionTypeAccuracy = await prisma.ieltsResponse.groupBy({
    by: ['isCorrect'],
    where: {
      attempt: {
        userId
      },
      question: {
        type: 'multiple-choice'
      }
    },
    _count: {
      id: true
    }
  })

  // 获取推荐的文章 (简单实现：获取用户尚未完成的文章)
  const recommendedPassages = await prisma.ieltsPassage.findMany({
    take: 3,
    where: {
      NOT: {
        attempts: {
          some: {
            userId,
            completedAt: { not: null },
          },
        },
      },
    },
  })

  // 计算用户的学习进度
  const totalPassages = await prisma.ieltsPassage.count()
  const completedPassages = userStats.passagesCompleted
  const progressPercentage = totalPassages > 0 ? Math.round((completedPassages / totalPassages) * 100) : 0

  // 计算学习连续天数
  const streakDays = 5 // 模拟数据，实际应该基于用户的学习记录计算

  return json({
    userStats,
    recentAttempts,
    recommendedPassages,
    vocabularyStats,
    dailyActivity,
    questionTypeAccuracy,
    progressPercentage,
    streakDays,
    totalPassages
  })
}

export default function IeltsDashboard() {
  const {
    userStats,
    recentAttempts,
    recommendedPassages,
    vocabularyStats,
    dailyActivity,
    questionTypeAccuracy,
    progressPercentage,
    streakDays,
    totalPassages
  } = useLoaderData<typeof loader>()

  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">雅思阅读学习中心</h1>
        <div className="flex space-x-2">
          <Link
            to="/ielts/generate"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI生成文章
          </Link>
        </div>
      </div>

      {/* 导航标签 */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('overview')}
        >
          学习概览
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'vocabulary' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('vocabulary')}
        >
          词汇进度
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'performance' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('performance')}
        >
          成绩分析
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* 学习概览 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* 学习进度卡片 */}
            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
              <h3 className="text-lg font-semibold mb-2">总体进度</h3>
              <div className="flex-1 flex flex-col justify-center items-center">
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#eee"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="3"
                      strokeDasharray={`${progressPercentage}, 100`}
                    />
                    <text x="18" y="20.5" textAnchor="middle" fontSize="8" fill="#333">
                      {progressPercentage}%
                    </text>
                  </svg>
                </div>
                <p className="text-center text-gray-600">已完成 {userStats.passagesCompleted} / {totalPassages} 篇文章</p>
              </div>
            </div>

            {/* 学习连续天数 */}
            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
              <h3 className="text-lg font-semibold mb-2">学习连续天数</h3>
              <div className="flex-1 flex flex-col justify-center items-center">
                <div className="text-5xl font-bold text-indigo-600 mb-2">{streakDays}</div>
                <p className="text-gray-600">天</p>
                <div className="mt-4 flex space-x-1">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${i < streakDays ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 学习统计数据 */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4">学习统计</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">总阅读时间</span>
                  <span className="font-semibold">{userStats.readingTimeTotal} 分钟</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">完成文章</span>
                  <span className="font-semibold">{userStats.passagesCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">测试完成</span>
                  <span className="font-semibold">{userStats.testsCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">学习词汇</span>
                  <span className="font-semibold">{userStats.vocabLearned}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'vocabulary' && (
        <>
          {/* 词汇学习统计 */}
          <section className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4">词汇学习统计</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-gray-600">已掌握</p>
                <p className="text-2xl font-bold text-green-600">{vocabularyStats[1]}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <p className="text-gray-600">学习中</p>
                <p className="text-2xl font-bold text-yellow-600">{vocabularyStats[0]}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <p className="text-gray-600">困难词</p>
                <p className="text-2xl font-bold text-red-600">{vocabularyStats[2]}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-gray-600">总词汇量</p>
                <p className="text-2xl font-bold text-blue-600">{vocabularyStats[3]}</p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">词汇掌握进度</h3>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-600 h-4 rounded-full"
                  style={{ width: `${vocabularyStats[3] > 0 ? (vocabularyStats[1] / vocabularyStats[3] * 100) : 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-600">
                <span>0%</span>
                <span>{vocabularyStats[3] > 0 ? Math.round(vocabularyStats[1] / vocabularyStats[3] * 100) : 0}% 已掌握</span>
                <span>100%</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/ielts/vocabulary"
                className="inline-flex items-center text-blue-600 hover:text-blue-800"
              >
                查看词汇库
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </section>
        </>
      )}

      {activeTab === 'performance' && (
        <>
          {/* 成绩分析 */}
          <section className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4">成绩分析</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3">各题型正确率</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">多选题</span>
                      <span className="text-sm font-medium">75%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">判断题</span>
                      <span className="text-sm font-medium">68%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '68%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">填空题</span>
                      <span className="text-sm font-medium">62%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-yellow-600 h-2.5 rounded-full" style={{ width: '62%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-3">最近测试成绩</h3>
                <div className="space-y-2">
                  {recentAttempts.filter(a => a.isTest && a.completedAt).slice(0, 3).map((attempt, index) => {
                    const correctCount = attempt.responses.filter(r => r.isCorrect).length
                    const totalCount = attempt.responses.length
                    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

                    return (
                      <div key={index} className="border rounded p-3">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium truncate max-w-[200px]">{attempt.passage?.title || '未命名测试'}</span>
                          <span className="text-sm font-medium">{percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${percentage >= 80 ? 'bg-green-600' : percentage >= 60 ? 'bg-yellow-600' : 'bg-red-600'}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(attempt.completedAt || '').toLocaleDateString()}
                        </div>
                      </div>
                    )
                  })}

                  {recentAttempts.filter(a => a.isTest && a.completedAt).length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      暂无测试数据
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* 最近活动 */}
      <section className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">最近学习活动</h2>
          <Link
            to="/ielts/stats"
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            查看全部记录
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {recentAttempts.length > 0 ? (
          <div className="space-y-4">
            {recentAttempts.map(attempt => {
              // 计算正确率（如果有响应）
              const correctCount = attempt.responses?.filter(r => r.isCorrect)?.length || 0
              const totalCount = attempt.responses?.length || 0
              const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

              return (
                <div key={attempt.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-800">{attempt.passage.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {attempt.completedAt
                          ? `完成于 ${new Date(attempt.completedAt).toLocaleString()}`
                          : `开始于 ${new Date(attempt.startedAt).toLocaleString()}`}
                      </p>
                    </div>
                    <div>
                      {attempt.isTest ? (
                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs">
                          测试模式
                        </span>
                      ) : (
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                          练习模式
                        </span>
                      )}
                    </div>
                  </div>

                  {attempt.completedAt && totalCount > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
                        <span>正确率</span>
                        <span>{accuracy}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${accuracy >= 80 ? 'bg-green-600' : accuracy >= 60 ? 'bg-yellow-600' : 'bg-red-600'}`}
                          style={{ width: `${accuracy}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex justify-end">
                    {attempt.completedAt ? (
                      <Link
                        to={`/ielts/passages/${attempt.passageId}/read`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        查看文章
                      </Link>
                    ) : (
                      <Link
                        to={`/ielts/passages/${attempt.passageId}/${attempt.isTest ? 'test' : 'practice'}`}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
                      >
                        继续学习
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 mb-4">还没有学习记录</p>
            <Link
              to="/ielts/passages"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              开始学习
            </Link>
          </div>
        )}
      </section>

      {/* 推荐阅读 */}
      <section className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">推荐阅读</h2>
          <Link
            to="/ielts/passages"
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            查看全部
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {recommendedPassages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedPassages.map(passage => (
              <div key={passage.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-800 line-clamp-2">{passage.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${passage.difficulty === 'easy' ? 'bg-green-100 text-green-800' : passage.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {passage.difficulty === 'easy' ? '简单' : passage.difficulty === 'medium' ? '中等' : '困难'}
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span>{passage.wordCount || 0} 词</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-700">{passage.topic}</span>
                  <div className="flex space-x-2">
                    <Link
                      to={`/ielts/passages/${passage.id}/read`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      阅读
                    </Link>
                    <Link
                      to={`/ielts/passages/${passage.id}/practice`}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      练习
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-gray-500 mb-4">暂无推荐文章</p>
            <Link
              to="/ielts/passages"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              浏览所有文章
            </Link>
          </div>
        )}
      </section>

      {/* 开始按钮 */}
      <section className="text-center py-6">
        <a
          href="/ielts/passages"
          className="bg-primary text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-opacity-90 inline-block"
        >
          浏览所有阅读文章
        </a>
      </section>
      {/* 快速开始区域 */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-lg shadow-md text-white text-center">
        <h2 className="text-2xl font-bold mb-4">准备好提升你的雅思阅读能力了吗？</h2>
        <p className="mb-6 max-w-2xl mx-auto">使用我们的AI生成功能创建真实的雅思阅读文章，或者从我们的文章库中选择已有的文章进行练习。</p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/ielts/generate"
            className="bg-white text-blue-700 px-6 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI生成文章
          </Link>

          <Link
            to="/ielts/passages"
            className="bg-transparent text-white border border-white px-6 py-3 rounded-md font-medium hover:bg-white/10 transition-colors inline-flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            浏览文章库
          </Link>
        </div>
      </section>
    </div>
  )
}