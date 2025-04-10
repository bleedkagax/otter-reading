import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '#app/utils/router-helpers'
import { useActionData, useLoaderData } from 'react-router'
import { getUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { IeltsPassage, IeltsAttempt, IELTS_ROUTES } from '../../_shared/types'
import { QuestionPage } from '../../_shared/QuestionPage'

// 测试模式说明组件
function TestInfo() {
  return (
    <div className="mt-8 pt-4 border-t">
      <h4 className="font-medium mb-2">测试说明:</h4>
      <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
        <li>这是测试模式，在提交前您将不会知道答案是否正确</li>
        <li>完成所有问题后点击"提交测试"查看结果</li>
        <li>测试期间请勿离开页面，否则可能会丢失进度</li>
        <li>通过评估结果可以帮助您了解自己的真实水平</li>
      </ul>
    </div>
  )
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await getUserId(request)
  if (!userId) {
    return redirect('/login?redirectTo=/ielts/passages')
  }
  
  const passageId = params.passageId
  if (!passageId) {
    return redirect(IELTS_ROUTES.passages)
  }
  
  // 查找文章
  const passage = await prisma.ieltsPassage.findUnique({
    where: { id: passageId },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' }
      }
    }
  })
  
  if (!passage) {
    return redirect(IELTS_ROUTES.passages)
  }
  
  // 查找进行中的尝试
  const activeAttempt = await prisma.ieltsAttempt.findFirst({
    where: {
      userId,
      passageId,
      completedAt: null,
      isTest: true
    },
    include: {
      responses: true
    }
  })
  
  // 如果没有进行中的尝试，创建一个
  let attempt = activeAttempt
  if (!attempt) {
    attempt = await prisma.ieltsAttempt.create({
      data: {
        userId,
        passageId,
        isTest: true,
        startedAt: new Date()
      },
      include: {
        responses: true
      }
    })
  }
  
  return json({
    passage,
    attempt
  })
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await getUserId(request)
  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const passageId = params.passageId
  if (!passageId) {
    return json({ error: 'No passage ID provided' }, { status: 400 })
  }
  
  const formData = await request.formData()
  const attemptId = formData.get('attemptId') as string
  const intent = formData.get('intent') as string
  
  if (!attemptId) {
    return json({ error: 'No attempt ID provided' }, { status: 400 })
  }
  
  if (intent === 'saveResponse') {
    const questionId = formData.get('questionId') as string
    const answer = formData.get('answer') as string
    const timeTaken = parseInt(formData.get('timeTaken') as string) || null
    
    if (!questionId) {
      return json({ error: 'No question ID provided' }, { status: 400 })
    }
    
    // 获取问题
    const question = await prisma.ieltsQuestion.findUnique({
      where: { id: questionId }
    })
    
    if (!question) {
      return json({ error: 'Question not found' }, { status: 404 })
    }
    
    // 检查答案是否正确
    const isCorrect = question.correctAnswer.toLowerCase() === answer.toLowerCase()
    
    // 查找是否已有回答
    const existingResponse = await prisma.ieltsResponse.findFirst({
      where: {
        attemptId,
        questionId
      }
    })
    
    try {
      if (existingResponse) {
        // 更新现有回答
        await prisma.ieltsResponse.update({
          where: { id: existingResponse.id },
          data: {
            userAnswer: answer,
            isCorrect,
            timeTaken
          }
        })
      } else {
        // 创建新回答
        await prisma.ieltsResponse.create({
          data: {
            attemptId,
            questionId,
            userAnswer: answer,
            isCorrect,
            timeTaken
          }
        })
      }
      
      // 在测试模式下不返回是否正确的信息，仅确认保存
      return json({ success: true })
    } catch (error) {
      console.error('Error saving response:', error)
      return json({ error: 'Failed to save response' }, { status: 500 })
    }
  }
  
  if (intent === 'completeAttempt') {
    // 获取尝试
    const attempt = await prisma.ieltsAttempt.findUnique({
      where: { id: attemptId },
      include: {
        responses: true,
        passage: {
          include: {
            questions: true
          }
        }
      }
    })
    
    if (!attempt) {
      return json({ error: 'Attempt not found' }, { status: 404 })
    }
    
    try {
      // 计算分数
      let correctCount = 0
      attempt.responses.forEach(response => {
        if (response.isCorrect) correctCount++
      })
      
      const totalQuestions = attempt.passage?.questions.length || 0
      const totalScore = totalQuestions > 0 
        ? Math.round((correctCount / totalQuestions) * 100) 
        : 0
      
      // 更新尝试
      await prisma.ieltsAttempt.update({
        where: { id: attemptId },
        data: {
          completedAt: new Date(),
          totalScore,
          maxScore: totalQuestions * 1, // 假设每题1分
          timeSpent: parseInt(formData.get('timeSpent') as string) || null
        }
      })
      
      return json({ 
        success: true, 
        score: totalScore,
        correctCount,
        totalQuestions
      })
    } catch (error) {
      console.error('Error completing attempt:', error)
      return json({ error: 'Failed to complete attempt' }, { status: 500 })
    }
  }
  
  return json({ error: 'Invalid intent' }, { status: 400 })
}

export default function TestPage() {
  const { passage, attempt } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  
  return (
    <QuestionPage
      passage={passage as IeltsPassage}
      attempt={attempt as IeltsAttempt}
      mode="test"
      pageTitle="测试模式"
      actionData={actionData}
      showFeedback={false}
      testInfo={<TestInfo />}
    />
  )
} 