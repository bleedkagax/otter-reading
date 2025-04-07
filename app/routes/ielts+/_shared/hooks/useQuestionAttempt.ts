import { useState, useEffect, useRef } from 'react'
import { useSubmit } from 'react-router'
import { formatTime, IeltsQuestion, IeltsAttempt } from '../types'

interface QuestionAttemptState {
  currentQuestionIdx: number
  answers: Record<string, string>
  timeSpent: number
  isSubmitted: boolean
  results: {
    score: number
    correctCount: number
    totalQuestions: number
  } | null
  showExplanation: boolean
  responseStatus: {
    questionId: string
    isCorrect: boolean
  } | null
}

interface QuestionAttemptOptions {
  attempt: IeltsAttempt
  questions: IeltsQuestion[]
  isTestMode?: boolean
  onComplete?: (results: {
    score: number
    correctCount: number
    totalQuestions: number
  }) => void
}

export function useQuestionAttempt({
  attempt,
  questions,
  isTestMode = false,
  onComplete
}: QuestionAttemptOptions) {
  const [state, setState] = useState<QuestionAttemptState>({
    currentQuestionIdx: 0,
    answers: {},
    timeSpent: 0,
    isSubmitted: false,
    results: null,
    showExplanation: false,
    responseStatus: null
  })
  
  const submit = useSubmit()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const timerStartedRef = useRef<Date>(new Date())
  
  const currentQuestion = questions[state.currentQuestionIdx]
  
  // 初始化已有的回答
  useEffect(() => {
    const savedAnswers: Record<string, string> = {}
    attempt.responses.forEach(response => {
      savedAnswers[response.questionId] = response.userAnswer
    })
    
    setState(prev => ({
      ...prev,
      answers: savedAnswers
    }))
    
    // 启动计时器
    timerRef.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        timeSpent: prev.timeSpent + 1
      }))
    }, 1000)
    
    // 记录开始时间
    timerStartedRef.current = new Date()
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [attempt.responses])
  
  // 处理答案变更
  const handleAnswerChange = (questionId: string, value: string) => {
    setState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: value
      }
    }))
    
    // 计算此问题的耗时
    const now = new Date()
    const timeTaken = Math.floor((now.getTime() - timerStartedRef.current.getTime()) / 1000)
    
    // 自动保存
    const formData = new FormData()
    formData.append('intent', 'saveResponse')
    formData.append('attemptId', attempt.id)
    formData.append('questionId', questionId)
    formData.append('answer', value)
    formData.append('timeTaken', timeTaken.toString())
    
    submit(formData, { method: 'post' })
    
    // 更新计时开始时间
    timerStartedRef.current = now
  }
  
  // 导航到下一题
  const goToNextQuestion = () => {
    if (state.currentQuestionIdx < questions.length - 1) {
      setState(prev => ({
        ...prev,
        currentQuestionIdx: prev.currentQuestionIdx + 1,
        showExplanation: false,
        responseStatus: null
      }))
    }
  }
  
  // 导航到上一题
  const goToPreviousQuestion = () => {
    if (state.currentQuestionIdx > 0) {
      setState(prev => ({
        ...prev,
        currentQuestionIdx: prev.currentQuestionIdx - 1,
        showExplanation: false,
        responseStatus: null
      }))
    }
  }
  
  // 导航到特定题目
  const goToQuestion = (idx: number) => {
    if (idx >= 0 && idx < questions.length) {
      setState(prev => ({
        ...prev,
        currentQuestionIdx: idx,
        showExplanation: false,
        responseStatus: null
      }))
    }
  }
  
  // 提交尝试
  const handleSubmit = () => {
    // 检查是否已回答所有问题
    const unansweredQuestions = questions.filter(q => !state.answers[q.id])
    
    if (unansweredQuestions.length > 0) {
      if (!window.confirm(`您还有 ${unansweredQuestions.length} 道题未回答，确定要提交吗？`)) {
        return
      }
    }
    
    setState(prev => ({
      ...prev,
      isSubmitted: true
    }))
    
    const formData = new FormData()
    formData.append('intent', 'completeAttempt')
    formData.append('attemptId', attempt.id)
    formData.append('timeSpent', state.timeSpent.toString())
    
    submit(formData, { method: 'post' })
  }
  
  // 切换解释显示
  const toggleExplanation = () => {
    setState(prev => ({
      ...prev,
      showExplanation: !prev.showExplanation
    }))
  }
  
  // 设置答题结果
  const setResults = (results: {
    score: number
    correctCount: number
    totalQuestions: number
  }) => {
    setState(prev => ({
      ...prev,
      results
    }))
    
    // 停止计时
    if (timerRef.current) clearInterval(timerRef.current)
    
    // 调用完成回调
    if (onComplete) {
      onComplete(results)
    }
  }
  
  // 设置回答状态
  const setResponseStatus = (status: {
    questionId: string
    isCorrect: boolean
  } | null) => {
    setState(prev => ({
      ...prev,
      responseStatus: status
    }))
  }
  
  return {
    currentQuestion,
    currentQuestionIdx: state.currentQuestionIdx,
    answers: state.answers,
    timeSpent: state.timeSpent,
    formattedTime: formatTime(state.timeSpent),
    isSubmitted: state.isSubmitted,
    results: state.results,
    showExplanation: state.showExplanation,
    responseStatus: state.responseStatus,
    handleAnswerChange,
    goToNextQuestion,
    goToPreviousQuestion,
    goToQuestion,
    handleSubmit,
    toggleExplanation,
    setResults,
    setResponseStatus
  }
} 