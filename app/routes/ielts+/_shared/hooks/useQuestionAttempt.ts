import { useState, useRef, useCallback } from 'react'
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
  // 初始化状态
  const initialAnswers: Record<string, string> = {}
  attempt.responses.forEach(response => {
    initialAnswers[response.questionId] = response.userAnswer
  })

  const [state, setState] = useState<QuestionAttemptState>({
    currentQuestionIdx: 0,
    answers: initialAnswers,
    timeSpent: 0,
    isSubmitted: false,
    results: null,
    showExplanation: false,
    responseStatus: null
  })
  
  const submit = useSubmit()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const questionStartTimeRef = useRef<Date>(new Date())
  
  // 启动计时器
  const startTimer = useCallback(() => {
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          timeSpent: prev.timeSpent + 1
        }))
      }, 1000)
    }
  }, [])
  
  // 停止计时器
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])
  
  // 处理答案变更
  const handleAnswerChange = useCallback((questionId: string, value: string) => {
    // 确保计时器在第一次回答时启动
    startTimer()
    
    setState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: value
      }
    }))
    
    // 计算此问题的耗时
    const now = new Date()
    const timeTaken = Math.floor((now.getTime() - questionStartTimeRef.current.getTime()) / 1000)
    
    // 自动保存
    const formData = new FormData()
    formData.append('intent', 'saveResponse')
    formData.append('attemptId', attempt.id)
    formData.append('questionId', questionId)
    formData.append('answer', value)
    formData.append('timeTaken', timeTaken.toString())
    
    submit(formData, { method: 'post' })
    
    // 更新问题开始时间
    questionStartTimeRef.current = now
  }, [attempt.id, submit, startTimer])
  
  // 导航到下一题
  const goToNextQuestion = useCallback(() => {
    if (state.currentQuestionIdx < questions.length - 1) {
      questionStartTimeRef.current = new Date()
      setState(prev => ({
        ...prev,
        currentQuestionIdx: prev.currentQuestionIdx + 1,
        showExplanation: false,
        responseStatus: null
      }))
    }
  }, [state.currentQuestionIdx, questions.length])
  
  // 导航到上一题
  const goToPreviousQuestion = useCallback(() => {
    if (state.currentQuestionIdx > 0) {
      questionStartTimeRef.current = new Date()
      setState(prev => ({
        ...prev,
        currentQuestionIdx: prev.currentQuestionIdx - 1,
        showExplanation: false,
        responseStatus: null
      }))
    }
  }, [state.currentQuestionIdx])
  
  // 导航到特定题目
  const goToQuestion = useCallback((idx: number) => {
    if (idx >= 0 && idx < questions.length) {
      questionStartTimeRef.current = new Date()
      setState(prev => ({
        ...prev,
        currentQuestionIdx: idx,
        showExplanation: false,
        responseStatus: null
      }))
    }
  }, [questions.length])
  
  // 提交尝试
  const handleSubmit = useCallback(() => {
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
    
    stopTimer()
    
    const formData = new FormData()
    formData.append('intent', 'completeAttempt')
    formData.append('attemptId', attempt.id)
    formData.append('timeSpent', state.timeSpent.toString())
    
    submit(formData, { method: 'post' })
  }, [attempt.id, questions, state.answers, state.timeSpent, submit, stopTimer])
  
  // 切换解释显示 - 只在非测试模式下可用
  const toggleExplanation = useCallback(() => {
    if (!isTestMode) {
      setState(prev => ({
        ...prev,
        showExplanation: !prev.showExplanation
      }))
    }
  }, [isTestMode])
  
  // 设置答题结果
  const setResults = useCallback((results: {
    score: number
    correctCount: number
    totalQuestions: number
  }) => {
    setState(prev => ({
      ...prev,
      results
    }))
    
    stopTimer()
    
    if (onComplete) {
      onComplete(results)
    }
  }, [onComplete, stopTimer])
  
  // 设置回答状态 - 在测试模式下不显示正确/错误
  const setResponseStatus = useCallback((status: {
    questionId: string
    isCorrect: boolean
  } | null) => {
    if (!isTestMode) {
      setState(prev => ({
        ...prev,
        responseStatus: status
      }))
    }
  }, [isTestMode])
  
  const currentQuestion = questions[state.currentQuestionIdx]
  
  return {
    currentQuestion,
    currentQuestionIdx: state.currentQuestionIdx,
    answers: state.answers,
    timeSpent: state.timeSpent,
    formattedTime: formatTime(state.timeSpent),
    isSubmitted: state.isSubmitted,
    results: state.results,
    showExplanation: !isTestMode && state.showExplanation,
    responseStatus: !isTestMode ? state.responseStatus : null,
    handleAnswerChange,
    goToNextQuestion,
    goToPreviousQuestion,
    goToQuestion,
    handleSubmit,
    toggleExplanation,
    setResults,
    setResponseStatus,
    startTimer,
    stopTimer
  }
} 