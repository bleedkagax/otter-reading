import { useEffect, useCallback } from 'react'
import { useActionData, useBeforeUnload } from 'react-router'
import { IeltsPassage, IeltsAttempt } from './types'
import { QuestionRenderer } from './QuestionRenderer'
import { QuestionNavigator } from './QuestionNavigator'
import { ResultsDisplay } from './ResultsDisplay'
import { useQuestionAttempt } from './hooks/useQuestionAttempt'
import { PassageReader } from '#app/components/ielts/PassageReader'

interface QuestionPageProps {
  passage: IeltsPassage
  attempt: IeltsAttempt
  mode: 'practice' | 'test'
  pageTitle: string
  actionData: any
  showFeedback?: boolean
  testInfo?: React.ReactNode
}

export function QuestionPage({
  passage,
  attempt,
  mode,
  pageTitle,
  actionData,
  showFeedback = true,
  testInfo
}: QuestionPageProps) {
  const {
    currentQuestion,
    currentQuestionIdx,
    answers,
    formattedTime,
    timeSpent,
    isSubmitted,
    results,
    showExplanation,
    responseStatus,
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
  } = useQuestionAttempt({
    attempt,
    questions: passage.questions,
    isTestMode: mode === 'test'
  })
  
  // 处理action数据更新
  useEffect(() => {
    if (actionData) {
      if ('isCorrect' in actionData && showFeedback) {
        setResponseStatus({
          questionId: currentQuestion.id,
          isCorrect: actionData.isCorrect
        })
      }
      
      if (isSubmitted && 'score' in actionData) {
        setResults({
          score: actionData.score,
          correctCount: actionData.correctCount,
          totalQuestions: actionData.totalQuestions
        })
      }
    }
  }, [actionData, currentQuestion?.id, isSubmitted, setResponseStatus, setResults, showFeedback])
  
  // 添加页面离开提示
  useBeforeUnload(
    useCallback(
      (event) => {
        if (!isSubmitted && Object.keys(answers).length > 0) {
          event.preventDefault()
          return '您还有未保存的答案，确定要离开吗？'
        }
      },
      [isSubmitted, answers]
    )
  )
  
  // 如果已提交并有结果，显示结果页面
  if (isSubmitted && results) {
    return (
      <ResultsDisplay
        score={results.score}
        correctCount={results.correctCount}
        totalQuestions={results.totalQuestions}
        timeSpent={timeSpent}
        passage={passage}
        questions={passage.questions}
        answers={answers}
        attempt={attempt}
        mode={mode}
      />
    )
  }
  
  const answeredCount = Object.keys(answers).length
  const totalQuestions = passage.questions.length
  const progressPercentage = Math.round((answeredCount / totalQuestions) * 100)
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">{passage.title}</h1>
          <p className="text-gray-600">{pageTitle}</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center gap-4">
          <div className="text-sm text-gray-600">
            进度: {answeredCount}/{totalQuestions} ({progressPercentage}%)
          </div>
          <div className="font-medium text-gray-700">
            用时: {formattedTime}
          </div>
          <button
            onClick={handleSubmit}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
          >
            {mode === 'practice' ? '提交答案' : '提交测试'}
          </button>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 文章阅读区 */}
        <div className="lg:w-1/2 bg-white rounded-lg shadow-md p-6">
          <div className="mb-4">
            <div className="flex items-center text-sm text-gray-500">
              <span className="mr-3">{passage.wordCount} 词</span>
              <span className="mr-3">难度: {passage.difficulty}</span>
              {passage.topic && <span>主题: {passage.topic}</span>}
            </div>
          </div>
          
          <div className="prose max-w-none">
            <PassageReader content={passage.content} />
          </div>
        </div>
        
        {/* 答题区 */}
        <div className="lg:w-1/2 bg-white rounded-lg shadow-md p-6">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="font-medium">问题 {currentQuestionIdx + 1} / {passage.questions.length}</h3>
            <div className="text-sm text-gray-500">
              已回答: {answeredCount} / {passage.questions.length}
            </div>
          </div>
          
          {/* 问题卡片 */}
          <div className="mb-6 p-4 border rounded-lg">
            {passage.questions.length > 0 ? (
              <QuestionRenderer
                question={currentQuestion}
                selectedAnswer={answers[currentQuestion.id] || ''}
                onChange={handleAnswerChange}
                disabled={isSubmitted}
              />
            ) : (
              <p className="text-gray-500">没有问题</p>
            )}
            
            {responseStatus && responseStatus.questionId === currentQuestion.id && (
              <div className={`mt-4 p-3 rounded ${
                responseStatus.isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {responseStatus.isCorrect ? '✓ 正确' : '✗ 错误'}
              </div>
            )}
            
            {/* 解释区域 */}
            {showExplanation && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-medium mb-2">答案解释:</h4>
                <p>{currentQuestion.explanation}</p>
              </div>
            )}
          </div>
          
          {/* 导航按钮 */}
          <div className="flex justify-between">
            <button
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIdx === 0}
              className={`px-3 py-1.5 rounded transition-colors ${
                currentQuestionIdx === 0 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              上一题
            </button>
            
            <div>
              {mode === 'practice' && (
                <button
                  onClick={toggleExplanation}
                  className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded mr-2 transition-colors"
                >
                  {showExplanation ? '隐藏解释' : '显示解释'}
                </button>
              )}
              
              <button
                onClick={handleSubmit}
                className="px-3 py-1.5 text-primary hover:bg-primary-50 rounded transition-colors"
              >
                {mode === 'practice' ? '完成练习' : '完成测试'}
              </button>
            </div>
            
            <button
              onClick={goToNextQuestion}
              disabled={currentQuestionIdx === passage.questions.length - 1}
              className={`px-3 py-1.5 rounded transition-colors ${
                currentQuestionIdx === passage.questions.length - 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              下一题
            </button>
          </div>
          
          {/* 问题导航 */}
          <QuestionNavigator
            questions={passage.questions}
            currentIndex={currentQuestionIdx}
            answers={answers}
            onNavigate={goToQuestion}
          />
          
          {/* 测试说明 - 仅在测试模式下显示 */}
          {mode === 'test' && testInfo}
        </div>
      </div>
    </div>
  )
} 