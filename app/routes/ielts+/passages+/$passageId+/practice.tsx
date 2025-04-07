import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '#app/utils/router-helpers'
import { useActionData, useLoaderData } from 'react-router'
import { getUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { IeltsPassage, IeltsAttempt, IELTS_ROUTES } from '../../_shared/types'
import { QuestionPage } from '../../_shared/QuestionPage'

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
      isTest: false
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
        isTest: false,
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
    
    return json({ success: true, isCorrect })
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
  }
  
  return json({ error: 'Invalid intent' }, { status: 400 })
}

export default function PracticePage() {
  const { passage, attempt } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  
  return (
    <QuestionPage
      passage={passage as IeltsPassage}
      attempt={attempt as IeltsAttempt}
      mode="practice"
      pageTitle="练习模式"
      actionData={actionData}
      showFeedback={true}
    />
  )
} 