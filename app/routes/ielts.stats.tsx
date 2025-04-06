import { json, type LoaderFunctionArgs } from '#app/utils/router-helpers'
import { useLoaderData } from 'react-router'
import { getUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'

// 简单定义MetaFunction类型
interface MetaFunction {
  (): { title: string }[];
}

export const meta: MetaFunction = () => [{ title: '学习统计 | 雅思阅读训练' }]

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request)
  
  // 如果用户未登录，返回空数据
  if (!userId) {
    return json({
      userStats: null,
      recentAttempts: [],
      recommendedPassages: [],
      isLoggedIn: false
    })
  }
  
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
    take: 10,
    orderBy: { startedAt: 'desc' },
    include: { passage: true },
  })
  
  // 获取最近添加的生词
  const recentVocabulary = await prisma.ieltsUserVocabulary.findMany({
    where: { userId },
    take: 5,
    orderBy: { createdAt: 'desc' },
  })
  
  // 获取进行中的学习计划
  const activePlans = await prisma.ieltsStudyPlan.findMany({
    where: { 
      userId,
      isActive: true 
    },
    take: 3,
    include: {
      tasks: {
        where: { status: 'pending' },
        take: 5,
        orderBy: { dueDate: 'asc' }
      }
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
  
  // 计算阅读进度和趋势
  const lastWeekAttempts = await prisma.ieltsAttempt.findMany({
    where: { 
      userId,
      startedAt: { 
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
      }
    },
    include: { 
      responses: true
    }
  })
  
  // 简单计算过去一周的统计
  const weeklyStats = {
    attemptsCount: lastWeekAttempts.length,
    readingTime: lastWeekAttempts.reduce((sum, attempt) => sum + (attempt.timeSpent || 0), 0) / 60, // 转换为分钟
    averageScore: lastWeekAttempts.length > 0 
      ? lastWeekAttempts.reduce((sum, attempt) => sum + (attempt.totalScore || 0), 0) / lastWeekAttempts.length
      : 0
  }
  
  return json({
    userStats,
    recentAttempts,
    recentVocabulary,
    activePlans,
    recommendedPassages,
    weeklyStats,
    isLoggedIn: true
  })
}

export default function IeltsStats() {
  const { 
    userStats, 
    recentAttempts, 
    recentVocabulary,
    activePlans,
    recommendedPassages,
    weeklyStats, 
    isLoggedIn 
  } = useLoaderData<typeof loader>()
  
  // 如果用户未登录，显示登录提示
  if (!isLoggedIn) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold mb-6">学习统计</h1>
        <div className="bg-blue-50 p-6 rounded-lg shadow-md text-center">
          <p className="text-lg mb-4">登录后可以查看你的学习统计数据</p>
          <a 
            href="/login?redirectTo=/ielts/stats" 
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90 inline-block"
          >
            登录账户
          </a>
        </div>
        
        {/* 展示一些通用的IELTS阅读相关信息 */}
        <section className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">关于IELTS阅读</h2>
          <p className="text-gray-700 mb-4">
            雅思阅读部分测试你的英语阅读理解能力，包括理解主要观点、细节、态度和推断意义的能力。
          </p>
          <p className="text-gray-700 mb-4">
            通过我们的训练系统，你可以：
          </p>
          <ul className="list-disc ml-6 text-gray-700">
            <li>练习各种类型的雅思阅读题目</li>
            <li>跟踪你的学习进度和成绩</li>
            <li>建立个人词汇库</li>
            <li>创建个性化学习计划</li>
          </ul>
          <div className="mt-6">
            <a 
              href="/ielts/passages" 
              className="text-primary hover:underline"
            >
              浏览文章库 →
            </a>
          </div>
        </section>
      </div>
    )
  }
  
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold mb-6">学习统计</h1>
      
      {/* 主要统计数据 */}
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">总体学习数据</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <p className="text-gray-600">总阅读时间</p>
            <p className="text-2xl font-bold">{userStats.readingTimeTotal} 分钟</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <p className="text-gray-600">完成文章</p>
            <p className="text-2xl font-bold">{userStats.passagesCompleted}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <p className="text-gray-600">测试完成</p>
            <p className="text-2xl font-bold">{userStats.testsCompleted}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <p className="text-gray-600">学习词汇</p>
            <p className="text-2xl font-bold">{userStats.vocabLearned}</p>
          </div>
        </div>
      </section>
      
      {/* 本周统计 */}
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">本周学习概况</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border p-4 rounded-lg">
            <p className="text-gray-600 mb-1">练习次数</p>
            <p className="text-2xl font-bold">{weeklyStats.attemptsCount}</p>
          </div>
          <div className="border p-4 rounded-lg">
            <p className="text-gray-600 mb-1">阅读时间</p>
            <p className="text-2xl font-bold">{Math.round(weeklyStats.readingTime)} 分钟</p>
          </div>
          <div className="border p-4 rounded-lg">
            <p className="text-gray-600 mb-1">平均分数</p>
            <p className="text-2xl font-bold">{Math.round(weeklyStats.averageScore)}%</p>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="font-medium mb-2">快速操作</h3>
          <div className="flex flex-wrap gap-3">
            <a 
              href="/ielts/passages" 
              className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-opacity-90"
            >
              浏览文章
            </a>
            <a 
              href="/ielts/vocabulary" 
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-opacity-90"
            >
              词汇管理
            </a>
            <a 
              href="/ielts/plan" 
              className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-opacity-90"
            >
              学习计划
            </a>
          </div>
        </div>
      </section>
      
      {/* 最近活动 */}
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">最近学习活动</h2>
        {recentAttempts.length > 0 ? (
          <div className="space-y-4">
            {recentAttempts.map(attempt => (
              <div key={attempt.id} className="border-b pb-3 last:border-b-0 flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{attempt.passage.title}</h3>
                  <p className="text-sm text-gray-600">
                    {attempt.completedAt 
                      ? `完成于 ${new Date(attempt.completedAt).toLocaleString()}`
                      : `开始于 ${new Date(attempt.startedAt).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex items-center">
                  {attempt.completedAt ? (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      已完成 {attempt.totalScore ? `(${attempt.totalScore}分)` : ''}
                    </span>
                  ) : (
                    <a 
                      href={`/ielts/passages/${attempt.passageId}/${attempt.isTest ? 'test' : 'practice'}`}
                      className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600"
                    >
                      继续
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">还没有学习记录，开始你的第一篇阅读吧！</p>
        )}
        
        {recentAttempts.length > 0 && (
          <div className="mt-4 text-right">
            <a href="/ielts/passages" className="text-primary hover:underline">查看全部活动 →</a>
          </div>
        )}
      </section>
      
      {/* 最近添加的生词 */}
      {recentVocabulary && recentVocabulary.length > 0 && (
        <section className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">最近添加的生词</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentVocabulary.map(vocab => (
              <div key={vocab.id} className="border p-3 rounded-lg">
                <div className="flex justify-between">
                  <h3 className="font-medium">{vocab.word}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${vocab.mastered ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {vocab.mastered ? '已掌握' : '学习中'}
                  </span>
                </div>
                {vocab.translation && <p className="text-sm text-gray-600">{vocab.translation}</p>}
                {vocab.context && <p className="text-xs text-gray-500 mt-1 italic">"{vocab.context}"</p>}
              </div>
            ))}
          </div>
          <div className="mt-4 text-right">
            <a href="/ielts/vocabulary" className="text-primary hover:underline">管理词汇 →</a>
          </div>
        </section>
      )}
      
      {/* 进行中的学习计划 */}
      {activePlans && activePlans.length > 0 && (
        <section className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">进行中的学习计划</h2>
          <div className="space-y-6">
            {activePlans.map(plan => (
              <div key={plan.id} className="border p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">目标分数: {plan.targetScore}</h3>
                  <span className="text-sm text-gray-600">
                    {plan.targetDate 
                      ? `截止日期: ${new Date(plan.targetDate).toLocaleDateString()}`
                      : '无截止日期'}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">每周目标: {plan.weeklyGoal} 小时</p>
                
                {plan.tasks && plan.tasks.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium mb-2">待完成任务:</p>
                    <ul className="text-sm space-y-2">
                      {plan.tasks.map(task => (
                        <li key={task.id} className="flex justify-between">
                          <span>{task.description}</span>
                          {task.dueDate && (
                            <span className="text-gray-500">
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">没有待完成的任务</p>
                )}
                
                <div className="mt-3 text-right">
                  <a href="/ielts/plan" className="text-primary text-sm hover:underline">查看详情</a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      
      {/* 推荐阅读 */}
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">推荐阅读</h2>
        {recommendedPassages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedPassages.map(passage => (
              <div key={passage.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-medium mb-2">{passage.title}</h3>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-600">难度: {passage.difficulty}</span>
                  <span className="text-gray-600">{passage.wordCount} 词</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">{passage.topic}</span>
                  <a 
                    href={`/ielts/passages/${passage.id}`}
                    className="text-blue-500 hover:underline"
                  >
                    查看详情
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500 mb-4">暂无推荐文章</p>
            <a href="/ielts/passages" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
              浏览所有文章
            </a>
          </div>
        )}
      </section>
    </div>
  )
} 