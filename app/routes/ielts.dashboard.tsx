import { json, type LoaderFunctionArgs } from '#app/utils/router-helpers'
import { useLoaderData } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'

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
    include: { passage: true },
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
  
  return json({
    userStats,
    recentAttempts,
    recommendedPassages,
  })
}

export default function IeltsDashboard() {
  const { userStats, recentAttempts, recommendedPassages } = useLoaderData<typeof loader>()
  
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold mb-6">雅思阅读学习中心</h1>
      
      {/* 用户统计 */}
      <section className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">我的学习统计</h2>
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
      </section>
      
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
      
      {/* 开始按钮 */}
      <section className="text-center py-6">
        <a 
          href="/ielts/passages" 
          className="bg-primary text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-opacity-90 inline-block"
        >
          浏览所有阅读文章
        </a>
      </section>
    </div>
  )
} 