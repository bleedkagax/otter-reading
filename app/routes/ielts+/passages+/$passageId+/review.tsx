import { json, redirect, type LoaderFunctionArgs } from '#app/utils/router-helpers'
import { useLoaderData } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { ResultsDisplay } from '../../_shared/ResultsDisplay'
import { IELTS_ROUTES } from '../../_shared/types'

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request)
  if (!userId) {
    return redirect('/login?redirectTo=/ielts/passages')
  }
  
  const passageId = params.passageId
  if (!passageId) {
    return redirect(IELTS_ROUTES.passages)
  }
  
  // Get URL parameters
  const url = new URL(request.url)
  const attemptId = url.searchParams.get('attemptId')
  
  if (!attemptId) {
    // If no attempt ID is provided, redirect to the passage page
    return redirect(IELTS_ROUTES.passageDetail(passageId))
  }
  
  // Find the attempt with responses
  const attempt = await prisma.ieltsAttempt.findUnique({
    where: {
      id: attemptId,
      userId, // Ensure the attempt belongs to the current user
    },
    include: {
      passage: {
        include: {
          questions: true
        }
      },
      responses: true
    }
  })
  
  if (!attempt || !attempt.completedAt) {
    // If attempt doesn't exist or is not completed, redirect to the passage page
    return redirect(IELTS_ROUTES.passageDetail(passageId))
  }
  
  // Prepare answers object
  const answers: Record<string, string> = {}
  attempt.responses.forEach(response => {
    answers[response.questionId] = response.userAnswer
  })
  
  return json({
    attempt,
    answers,
    score: attempt.totalScore || 0,
    correctCount: attempt.responses.filter(r => r.isCorrect).length,
    totalQuestions: attempt.passage.questions.length,
    timeSpent: attempt.timeSpent || 0
  })
}

export default function ReviewPage() {
  const { 
    attempt, 
    answers, 
    score, 
    correctCount, 
    totalQuestions, 
    timeSpent 
  } = useLoaderData<typeof loader>()
  
  return (
    <ResultsDisplay
      score={score}
      correctCount={correctCount}
      totalQuestions={totalQuestions}
      timeSpent={timeSpent}
      passage={{
        id: attempt.passageId,
        title: attempt.passage.title
      }}
      questions={attempt.passage.questions}
      answers={answers}
      attempt={attempt}
      mode={attempt.isTest ? 'test' : 'practice'}
    />
  )
}
