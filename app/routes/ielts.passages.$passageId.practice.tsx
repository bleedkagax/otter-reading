import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '#app/utils/router-helpers'
import { Form, useActionData, useLoaderData, useNavigate, useParams, useSubmit } from 'react-router'
import { useState, useEffect } from 'react'
import { getUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { PassageReader } from '#app/components/ielts/PassageReader'

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await getUserId(request)
  const { passageId } = params
  
  if (!passageId) {
    return redirect('/ielts/passages')
  }
  
  // 获取文章及问题
  const passage = await prisma.ieltsPassage.findUnique({
    where: { id: passageId },
    include: {
      questions: true,
    },
  })
  
  if (!passage) {
    throw new Response('文章不存在', { status: 404 })
  }
  
  // 查找是否有进行中的练习(仅对已登录用户)
  let existingAttempt = null
  if (userId) {
    existingAttempt = await prisma.ieltsAttempt.findFirst({
      where: {
        userId,
        passageId,
        completedAt: null,
      },
      include: {
        answers: true,
      },
    })
  }
  
  return json({
    passage,
    existingAttempt,
    isLoggedIn: !!userId
  })
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await getUserId(request)
  const { passageId } = params
  
  if (!passageId) {
    return json({ error: '文章ID不存在' }, { status: 400 })
  }
  
  // 如果用户未登录，只允许查看功能，不允许保存进度
  if (!userId) {
    return json({ 
      error: '需要登录才能保存答案和进度',
      requireLogin: true 
    }, { status: 401 })
  }
  
  const formData = await request.formData()
  const intent = formData.get('intent')
  
  // 处理不同的操作
  switch (intent) {
    case 'start-attempt': {
      // 创建新的练习尝试
      const attempt = await prisma.ieltsAttempt.create({
        data: {
          userId,
          passageId,
          startedAt: new Date(),
        },
      })
      
      return json({ success: true, attempt })
    }
    
    case 'submit-answer': {
      const attemptId = formData.get('attemptId') as string
      const questionId = formData.get('questionId') as string
      const answer = formData.get('answer') as string
      
      if (!attemptId || !questionId || !answer) {
        return json({ error: '缺少必要的参数' }, { status: 400 })
      }
      
      // 获取问题的正确答案
      const question = await prisma.ieltsQuestion.findUnique({
        where: { id: questionId },
      })
      
      if (!question) {
        return json({ error: '问题不存在' }, { status: 400 })
      }
      
      const isCorrect = question.answer === answer
      
      // 保存或更新答案
      const savedAnswer = await prisma.ieltsAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId,
          },
        },
        update: {
          userAnswer: answer,
          isCorrect,
        },
        create: {
          attemptId,
          questionId,
          userAnswer: answer,
          isCorrect,
        },
      })
      
      return json({
        success: true,
        answer: savedAnswer,
        correctAnswer: question.answer,
      })
    }
    
    case 'complete-attempt': {
      const attemptId = formData.get('attemptId') as string
      
      if (!attemptId) {
        return json({ error: '缺少必要的参数' }, { status: 400 })
      }
      
      // 获取当前尝试和所有已回答的问题
      const attempt = await prisma.ieltsAttempt.findUnique({
        where: { id: attemptId },
        include: {
          answers: true,
          passage: {
            include: {
              questions: true,
            },
          },
        },
      })
      
      if (!attempt) {
        return json({ error: '练习尝试不存在' }, { status: 400 })
      }
      
      // 计算分数
      const totalQuestions = attempt.passage.questions.length
      const correctAnswers = attempt.answers.filter(a => a.isCorrect).length
      const score = Math.round((correctAnswers / totalQuestions) * 100)
      
      // 完成练习
      const completedAttempt = await prisma.ieltsAttempt.update({
        where: { id: attemptId },
        data: {
          completedAt: new Date(),
          score,
        },
      })
      
      // 更新用户统计数据
      await prisma.ieltsUserStats.upsert({
        where: { userId },
        update: {
          attemptsCompleted: { increment: 1 },
          totalScore: { increment: score },
        },
        create: {
          userId,
          attemptsCompleted: 1,
          readingTimeTotal: 0,
          passagesCompleted: 0,
          totalScore: score,
        },
      })
      
      return json({
        success: true,
        attempt: completedAttempt,
        score,
        totalQuestions,
        correctAnswers,
      })
    }
    
    default:
      return json({ error: '未知操作' }, { status: 400 })
  }
}

export default function PracticePage() {
  const { passage, existingAttempt, isLoggedIn } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const params = useParams()
  const navigate = useNavigate()
  const submit = useSubmit()
  
  const [attempt, setAttempt] = useState(existingAttempt)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>(
    existingAttempt?.answers.reduce((acc, answer) => {
      acc[answer.questionId] = answer.userAnswer
      return acc
    }, {} as Record<string, string>) || {}
  )
  
  const [showResults, setShowResults] = useState(false)
  const [timer, setTimer] = useState({ minutes: 0, seconds: 0 })
  const [startTime] = useState(new Date())
  
  // 获取当前问题
  const currentQuestion = passage.questions[currentQuestionIndex] || passage.questions[0]
  
  // 计时器
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const diffMs = now.getTime() - startTime.getTime()
      const diffSec = Math.floor(diffMs / 1000)
      const minutes = Math.floor(diffSec / 60)
      const seconds = diffSec % 60
      
      setTimer({ minutes, seconds })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [startTime])
  
  // 处理回答问题
  const handleAnswer = (answer: string) => {
    // 保存到本地状态
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer,
    }))
    
    // 提交到服务器
    const form = new FormData()
    form.append('intent', 'submit-answer')
    form.append('attemptId', attempt.id)
    form.append('questionId', currentQuestion.id)
    form.append('answer', answer)
    
    submit(form, {
      method: 'post',
      action: `/ielts/passages/${params.passageId}/practice`,
    })
  }
  
  // 完成测试
  const handleComplete = () => {
    const form = new FormData()
    form.append('intent', 'complete-attempt')
    form.append('attemptId', attempt.id)
    
    submit(form, {
      method: 'post',
      action: `/ielts/passages/${params.passageId}/practice`,
    })
    
    setShowResults(true)
  }
  
  // 导航到下一题或上一题
  const goToNextQuestion = () => {
    if (currentQuestionIndex < passage.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }
  
  const goToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }
  
  // 渲染问题
  const renderQuestion = () => {
    const question = passage.questions[currentQuestionIndex]
    
    switch (question.type) {
      case 'multiple_choice':
        return (
          <div>
            <p className="mb-4">{question.text}</p>
            <div className="space-y-2">
              {question.options?.split('|').map((option, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="radio"
                    id={`option-${index}`}
                    name={`question-${question.id}`}
                    value={option}
                    checked={userAnswers[question.id] === option}
                    onChange={() => handleAnswer(option)}
                    className="mr-2"
                  />
                  <label htmlFor={`option-${index}`}>{option}</label>
                </div>
              ))}
            </div>
          </div>
        )
      
      case 'true_false':
        return (
          <div>
            <p className="mb-4">{question.text}</p>
            <div className="space-y-2">
              {['TRUE', 'FALSE', 'NOT GIVEN'].map((option, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="radio"
                    id={`option-${index}`}
                    name={`question-${question.id}`}
                    value={option}
                    checked={userAnswers[question.id] === option}
                    onChange={() => handleAnswer(option)}
                    className="mr-2"
                  />
                  <label htmlFor={`option-${index}`}>{option}</label>
                </div>
              ))}
            </div>
          </div>
        )
      
      case 'fill_blank':
        return (
          <div>
            <p className="mb-4">{question.text}</p>
            <input
              type="text"
              value={userAnswers[question.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
              placeholder="输入答案..."
            />
          </div>
        )
      
      case 'matching':
        return (
          <div>
            <p className="mb-4">{question.text}</p>
            <select
              value={userAnswers[question.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            >
              <option value="">-- 选择匹配项 --</option>
              {question.options?.split('|').map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )
      
      default:
        return <p>不支持的问题类型</p>
    }
  }
  
  // 显示结果页面
  if (showResults && actionData?.score !== undefined) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">练习结果</h1>
        
        <div className="text-center mb-8">
          <div className="text-5xl font-bold text-blue-600 mb-2">
            {actionData.score}%
          </div>
          <p className="text-gray-600">
            共 {actionData.totalQuestions} 题，正确 {actionData.correctAnswers} 题
          </p>
          <p className="text-gray-600">
            用时: {timer.minutes} 分 {timer.seconds} 秒
          </p>
        </div>
        
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => navigate(`/ielts/passages/${params.passageId}/read`)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            查看文章
          </button>
          <button
            onClick={() => navigate('/ielts/dashboard')}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            返回仪表盘
          </button>
        </div>
      </div>
    )
  }
  
  // 主界面
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 时间提示 */}
        <div className="fixed top-4 right-4 bg-white shadow-md rounded-lg px-4 py-2 z-50">
          <span className="font-medium">用时: </span>
          <span className="text-gray-800 font-mono">
            {timer.minutes} 分 {timer.seconds} 秒
          </span>
        </div>

        {/* 阅读考试指导 */}
        <div className="bg-gray-100 border border-gray-200 p-4 mb-6 rounded-md">
          <h2 className="font-bold text-lg">雅思阅读练习</h2>
          <p className="text-gray-700">完成所有问题以测试您的阅读理解能力。</p>
        </div>

        {/* 主内容区 - 左右两栏布局 */}
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
          {/* 左侧阅读文章 - 添加固定高度和滚动 */}
          <div className="lg:w-1/2 h-full overflow-hidden flex flex-col bg-white rounded-lg shadow-md">
            <div className="p-6 border-b">
              <h1 className="text-2xl font-bold text-gray-800">{passage.title}</h1>
              <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
                <span>
                  用时: {timer.minutes} 分 {timer.seconds} 秒
                </span>
                <span>
                  单词: {passage.wordCount}
                </span>
              </div>
            </div>
            
            <div className="overflow-y-auto p-6 flex-grow">
              <PassageReader 
                content={passage.content} 
                showParagraphNumbers={true}
              />
            </div>
          </div>

          {/* 右侧问题区域 - 添加固定高度和滚动 */}
          <div className="lg:w-1/2 bg-white rounded-lg shadow-md h-full flex flex-col overflow-hidden">
            {/* 题目标题区域 - 固定在顶部 */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg">问题 {currentQuestionIndex + 1}/{passage.questions.length}</h2>
                <div className="flex gap-2">
                  {passage.questions.map((q, index) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        currentQuestionIndex === index
                          ? 'bg-blue-500 text-white'
                          : userAnswers[q.id]
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 题目内容区域 - 可滚动 */}
            <div className="overflow-y-auto p-6 flex-grow">
              {renderQuestion()}
            </div>

            {/* 底部导航按钮 - 固定在底部 */}
            <div className="p-6 border-t flex justify-between">
              <div>
                <button
                  onClick={goToPrevQuestion}
                  disabled={currentQuestionIndex === 0}
                  className={`px-4 py-2 rounded ${
                    currentQuestionIndex === 0
                      ? 'bg-gray-200 text-gray-500'
                      : 'bg-gray-500 text-white hover:bg-gray-600'
                  }`}
                >
                  上一题
                </button>
              </div>
              
              {currentQuestionIndex === passage.questions.length - 1 ? (
                <button
                  onClick={handleComplete}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  完成测试
                </button>
              ) : (
                <button
                  onClick={goToNextQuestion}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  下一题
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 