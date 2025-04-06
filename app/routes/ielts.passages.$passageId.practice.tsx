import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '#app/utils/router-helpers'
import { Form, useActionData, useLoaderData, useNavigate, useParams, useSubmit } from 'react-router'
import { useState, useEffect, useRef } from 'react'
import { getUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { PassageReader } from '#app/components/ielts/PassageReader'

// Define interfaces for the expected data structures
interface IeltsQuestion {
  id: string;
  passageId: string;
  type: string;
  questionText: string;
  options: string | null;
  correctAnswer: string;
  explanation: string;
  points: number;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

interface IeltsPassage {
  id: string;
  title: string;
  content: string;
  difficulty: string;
  topic: string;
  wordCount: number;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
  questions: IeltsQuestion[];
}

interface IeltsResponse {
  id: string;
  attemptId: string;
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  timeTaken: number | null;
  createdAt: Date;
}

interface IeltsAttempt {
  id: string;
  userId: string;
  passageId: string;
  isTest: boolean;
  startedAt: Date;
  completedAt: Date | null;
  totalScore: number | null;
  maxScore: number | null;
  timeSpent: number | null;
  responses: IeltsResponse[];
  passage?: {
    questions: IeltsQuestion[];
  };
}

interface LoaderData {
  passage: IeltsPassage;
  existingAttempt: IeltsAttempt | null;
  isLoggedIn: boolean;
}

interface ActionData {
  success?: boolean;
  error?: string;
  score?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  attempt?: IeltsAttempt;
  response?: IeltsResponse;
  correctAnswer?: string;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await getUserId(request)
  const { passageId } = params
  
  console.log("Debug - requested passageId:", passageId);
  
  if (!passageId) {
    return redirect('/ielts/passages')
  }
  
  // 处理可能的ID映射问题
  let queryId = passageId;
  // 检查是否是特殊格式ID（例如article1, article2等）
  if(passageId.startsWith('article')) {
    const articleNumber = passageId.replace('article', '');
    // 这里应该添加具体的ID映射逻辑，或者查询数据库获取正确的ID
    console.log("Special ID format detected:", passageId);
    
    // 临时解决方案：尝试通过标题查找文章
    try {
      const possiblePassage = await prisma.ieltsPassage.findFirst({
        where: {
          OR: [
            // 尝试通过标题中包含数字来匹配
            { title: { contains: `${articleNumber}` } },
            // 如果上面不行，也可以尝试通过其他字段匹配
            { id: passageId } // 如果ID恰好匹配
          ]
        }
      });
      
      if(possiblePassage) {
        console.log("Found passage by alternative query:", possiblePassage.id);
        queryId = possiblePassage.id;
      }
    } catch(error) {
      console.error("Error finding passage by alternative query:", error);
    }
  }
  
  // 获取文章及问题
  let passage = await prisma.ieltsPassage.findUnique({
    where: { id: queryId },
    include: {
      questions: true,
    },
  })
  
  // 如果找不到，尝试获取所有文章作为备用方案
  if (!passage) {
    console.log("Passage not found with ID:", queryId);
    
    // 尝试列出所有文章，以便调试
    const allPassages = await prisma.ieltsPassage.findMany({
      take: 5, // 限制只返回5条记录，避免数据过多
      select: { id: true, title: true }
    });
    
    console.log("Available passages:", allPassages);
    
    throw new Response(`文章不存在 (ID: ${passageId})`, { status: 404 })
  }
  
  // 查找是否有进行中的练习(仅对已登录用户)
  let existingAttempt = null
  if (userId) {
    existingAttempt = await prisma.ieltsAttempt.findFirst({
      where: {
        userId,
        passageId: passage.id,
        completedAt: null,
      },
      include: {
        responses: true,
      },
    })
  }
  
  return json<LoaderData>({
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
  
  // 尝试获取正确的passage
  let passage = null;
  try {
    passage = await prisma.ieltsPassage.findUnique({
      where: { id: passageId },
    });
    
    // 如果未找到，尝试特殊ID查询
    if (!passage && passageId.startsWith('article')) {
      const articleNumber = passageId.replace('article', '');
      const possiblePassage = await prisma.ieltsPassage.findFirst({
        where: {
          OR: [
            { title: { contains: `${articleNumber}` } },
            { id: passageId }
          ]
        }
      });
      
      if (possiblePassage) {
        passage = possiblePassage;
      }
    }
  } catch (error) {
    console.error("查找文章时出错:", error);
  }
  
  // 如果仍未找到文章，返回错误
  if (!passage) {
    return json({ error: '找不到对应的文章' }, { status: 404 });
  }
  
  // 使用找到的passage.id代替URL中的passageId
  const actualPassageId = passage.id;
  
  // 处理不同的操作
  switch (intent) {
    case 'start-attempt': {
      // 创建新的练习尝试
      const attempt = await prisma.ieltsAttempt.create({
        data: {
          userId,
          passageId: actualPassageId,
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
      
      const isCorrect = question.correctAnswer === answer
      
      // 保存或更新答案
      const savedResponse = await prisma.ieltsResponse.upsert({
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
        response: savedResponse,
        correctAnswer: question.correctAnswer,
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
          responses: true,
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
      const correctAnswers = attempt.responses.filter(a => a.isCorrect).length
      const score = Math.round((correctAnswers / totalQuestions) * 100)
      
      // 完成练习
      const completedAttempt = await prisma.ieltsAttempt.update({
        where: { id: attemptId },
        data: {
          completedAt: new Date(),
          totalScore: score,
        },
      })
      
      // 更新用户统计数据
      await prisma.ieltsUserStats.upsert({
        where: { userId },
        update: {
          testsCompleted: { increment: 1 },
        },
        create: {
          userId,
          testsCompleted: 1,
          readingTimeTotal: 0,
          passagesCompleted: 0,
          vocabLearned: 0,
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
  const data = useLoaderData<typeof loader>() as LoaderData;
  const { passage, existingAttempt, isLoggedIn } = data;
  const actionData = useActionData<typeof action>() as ActionData | undefined;
  const params = useParams()
  const navigate = useNavigate()
  const submit = useSubmit()
  
  // 使用已有尝试或从action获取的尝试
  const [attempt, setAttempt] = useState<IeltsAttempt | null>(
    existingAttempt || (actionData?.attempt as IeltsAttempt) || null
  )
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>(
    existingAttempt?.responses.reduce((acc: Record<string, string>, response: IeltsResponse) => {
      acc[response.questionId] = response.userAnswer
      return acc
    }, {}) || {}
  )
  const [showResults, setShowResults] = useState(false)
  const [timer, setTimer] = useState({ minutes: 0, seconds: 0 })
  const [startTime] = useState(new Date())
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<string>>(new Set())
  const [highlightedText, setHighlightedText] = useState('')
  const [showHighlightTooltip, setShowHighlightTooltip] = useState(false)
  const [highlightPosition, setHighlightPosition] = useState({ x: 0, y: 0 })
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  
  // 如果没有找到文章，显示错误信息和返回链接
  if (!passage) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-red-600">找不到文章</h1>
        <p className="mb-4">无法找到ID为 "{params.passageId}" 的文章。可能是文章已被删除或ID不正确。</p>
        
        <div className="flex space-x-4 mt-6">
          <button
            onClick={() => navigate('/ielts/passages')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            返回文章列表
          </button>
        </div>
      </div>
    );
  }
  
  // 获取当前问题
  const currentQuestion = passage.questions[currentQuestionIndex] || passage.questions[0]
  
  // 如果用户已登录但没有尝试记录，创建一个新的尝试
  const createAttempt = () => {
    if (isLoggedIn && !attempt && passage) {
      console.log('手动创建练习尝试...');
      const form = new FormData();
      form.append('intent', 'start-attempt');
      
      submit(form, {
        method: 'post',
        action: `/ielts/passages/${params.passageId}/practice`,
      });
    }
  }
  
  // 监听action数据更新
  useEffect(() => {
    if (actionData?.success && actionData.attempt && !attempt) {
      console.log('设置新创建的尝试:', actionData.attempt);
      setAttempt(actionData.attempt);
    }
  }, [actionData, attempt]);
  
  // 页面加载后，如果没有尝试记录，自动创建一个
  useEffect(() => {
    if (isLoggedIn && !attempt && passage) {
      createAttempt();
    }
  }, []);
  
  // 计时器
  useEffect(() => {
    const startTime = new Date().getTime()
    
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const diffMs = now - startTime
      const diffSec = Math.floor(diffMs / 1000)
      const minutes = Math.floor(diffSec / 60)
      const seconds = diffSec % 60
      
      setTimer({ minutes, seconds })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])
  
  // 监听文本选择事件
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        setShowHighlightTooltip(false)
        return
      }

      const selectedText = selection.toString().trim()
      if (selectedText.length > 0) {
        setHighlightedText(selectedText)
        
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        
        setHighlightPosition({
          x: rect.left + rect.width / 2,
          y: rect.bottom + 10
        })
        
        setShowHighlightTooltip(true)
      }
    }

    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [])
  
  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  
  // 处理回答问题
  const handleAnswer = (answer: string) => {
    if (!attempt || !currentQuestion) return;
    
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
  
  const toggleBookmark = (questionId: string) => {
    setBookmarkedQuestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
      } else {
        newSet.add(questionId)
      }
      return newSet
    })
  }
  
  // 完成测试
  const handleComplete = () => {
    if (!attempt) return;
    
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
  
  const handleHighlight = () => {
    console.log('高亮:', highlightedText)
    setShowHighlightTooltip(false)
  }

  const handleAddToVocabulary = () => {
    console.log('添加到生词本:', highlightedText)
    setShowHighlightTooltip(false)
    alert(`已将 "${highlightedText}" 添加到生词本`)
  }
  
  // 修复ref回调函数
  const setInputRef = (id: string, el: HTMLInputElement | null) => {
    inputRefs.current[id] = el
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
      {/* 如果未登录或没有尝试记录，显示创建尝试按钮 */}
      {isLoggedIn && !attempt ? (
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold mb-4">准备好开始练习了吗？</h2>
          <p className="mb-6 text-gray-600">点击下方按钮开始"{passage.title}"的练习</p>
          <button
            onClick={createAttempt}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            开始练习
          </button>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          {/* 时间提示 */}
          <div className="fixed top-4 right-4 bg-white shadow-md rounded-lg px-4 py-2 z-50">
            <span className="font-medium">用时: </span>
            <span className="text-gray-800 font-mono">
              {formatTime(timer.minutes, timer.seconds)}
            </span>
          </div>

          {/* 阅读考试指导 */}
          <div className="bg-gray-100 border border-gray-200 p-4 mb-6 rounded-md">
            <h2 className="font-bold text-lg">Part 1</h2>
            <p className="text-gray-700">You should spend about 20 minutes on Questions 1-{passage.questions.length}, which are based on Reading Passage 1.</p>
          </div>

          {/* 主内容区 - 左右两栏布局 */}
          <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
            {/* 左侧阅读文章 - 添加固定高度和滚动 */}
            <div className="lg:w-1/2 h-full overflow-hidden flex flex-col">
              <h1 className="text-2xl font-bold text-gray-800 mb-4">{passage.title}</h1>
              <div className="overflow-y-auto pr-4 flex-grow">
                <PassageReader 
                  content={passage.content} 
                  showParagraphNumbers={true}
                />
              </div>
              
              {/* 文本高亮工具提示 */}
              {showHighlightTooltip && (
                <div 
                  className="fixed bg-white shadow-lg rounded-lg p-2 z-50 flex gap-2"
                  style={{
                    left: `${highlightPosition.x}px`,
                    top: `${highlightPosition.y}px`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  <button 
                    className="text-xs bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded"
                    onClick={handleHighlight}
                  >
                    高亮标记
                  </button>
                  <button 
                    className="text-xs bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded"
                    onClick={handleAddToVocabulary}
                  >
                    添加到生词本
                  </button>
                </div>
              )}
            </div>

            {/* 右侧问题区域 */}
            <div className="lg:w-1/2 bg-white p-6 rounded-lg shadow-md h-full flex flex-col overflow-hidden">
              {/* 问题导航 */}
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">问题 {currentQuestionIndex + 1}/{passage.questions.length}</h2>
                
                <div className="flex gap-1">
                  {passage.questions.map((q, index) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`size-8 rounded-full flex items-center justify-center ${
                        currentQuestionIndex === index 
                          ? 'bg-blue-600 text-white'
                          : userAnswers[q.id]
                          ? 'bg-green-100 text-green-800 border border-green-500'
                          : 'bg-gray-100'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <p className="mb-2">完成下面的笔记。</p>
                <p className="mb-4 font-bold">
                  从文章中选择 <span className="underline">每空一个单词</span> 填入。
                </p>
              </div>

              <div className="overflow-y-auto pr-4 flex-grow">
                <div className="mb-8">
                  <h3 className="text-lg font-bold mb-4">{passage.title}</h3>
                  
                  {/* 调试信息 */}
                  <div className="mb-4 p-2 bg-gray-100 rounded">
                    <p className="text-xs">调试信息: 当前问题索引: {currentQuestionIndex}</p>
                    <p className="text-xs">问题总数: {passage.questions.length}</p>
                    <p className="text-xs">当前问题ID: {currentQuestion?.id || '无'}</p>
                  </div>
                  
                  <h4 className="font-bold mb-2">填空题</h4>
                  <ul className="space-y-4">
                    {/* 仅显示当前问题 */}
                    {currentQuestion && (
                      <li key={currentQuestion.id} className="flex items-start gap-2">
                        <span className="text-gray-500">•</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{currentQuestion.questionText}</span>
                            <button 
                              className={`ml-2 ${bookmarkedQuestions.has(currentQuestion.id) ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500`}
                              onClick={() => toggleBookmark(currentQuestion.id)}
                              title={bookmarkedQuestions.has(currentQuestion.id) ? "移除书签" : "添加书签"}
                            >
                              ★
                            </button>
                          </div>
                          
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <input
                              ref={el => setInputRef(currentQuestion.id, el)}
                              type="text"
                              className="border border-gray-300 rounded-md px-2 py-1 w-32 text-center"
                              value={userAnswers[currentQuestion.id] || ''}
                              onChange={(e) => handleAnswer(e.target.value)}
                              maxLength={15}
                            />
                          </div>
                          
                          {/* 显示正确答案的反馈 */}
                          {actionData?.correctAnswer && userAnswers[currentQuestion.id] && (
                            <div className="mt-2 text-sm text-red-600">
                              正确答案: {actionData.correctAnswer}
                            </div>
                          )}
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* 底部导航按钮 - 固定在底部 */}
              <div className="mt-4 pt-4 border-t flex justify-between">
                <div>
                  <button 
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 mr-2"
                    disabled={currentQuestionIndex === 0}
                    onClick={goToPrevQuestion}
                  >
                    上一题
                  </button>
                  
                  {currentQuestionIndex < passage.questions.length - 1 ? (
                    <button 
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                      onClick={goToNextQuestion}
                    >
                      下一题
                    </button>
                  ) : (
                    <button 
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                      onClick={handleComplete}
                    >
                      提交答案
                    </button>
                  )}
                </div>
                
                {/* 导航指示器 */}
                <div className="flex justify-end gap-1">
                  {passage.questions.map((question, index) => (
                    <button
                      key={question.id}
                      className={`size-6 rounded-full flex items-center justify-center border ${
                        currentQuestionIndex === index ? 'bg-blue-600 text-white' : 
                        bookmarkedQuestions.has(question.id) ? 'bg-yellow-100 border-yellow-500' :
                        userAnswers[question.id] ? 'bg-gray-200' : 'bg-white'
                      }`}
                      onClick={() => setCurrentQuestionIndex(index)}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 