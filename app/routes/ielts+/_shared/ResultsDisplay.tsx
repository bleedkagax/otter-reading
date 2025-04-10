import { useNavigate } from 'react-router'
import { IeltsQuestion, IeltsAttempt, formatTime, IELTS_ROUTES } from './types'

interface ResultsDisplayProps {
  score: number
  correctCount: number
  totalQuestions: number
  timeSpent: number
  passage: {
    id: string
    title: string
  }
  questions: IeltsQuestion[]
  answers: Record<string, string>
  attempt: IeltsAttempt
  mode: 'practice' | 'test'
}

export function ResultsDisplay({
  score,
  correctCount,
  totalQuestions,
  timeSpent,
  passage,
  questions,
  answers,
  attempt,
  mode
}: ResultsDisplayProps) {
  const navigate = useNavigate()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-card text-card-foreground rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-8 text-center">
          {mode === 'practice' ? '练习完成' : '测试完成'}
        </h1>

        <div className="bg-muted rounded-lg p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-gray-500 mb-1">得分</p>
              <p className={`text-4xl font-bold ${
                score >= 70 ? 'text-green-600' :
                score >= 40 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {score}%
              </p>
            </div>

            <div>
              <p className="text-gray-500 mb-1">正确答案</p>
              <p className="text-4xl font-bold text-gray-800">
                {correctCount}/{totalQuestions}
              </p>
            </div>

            <div>
              <p className="text-gray-500 mb-1">用时</p>
              <p className="text-4xl font-bold text-gray-800">{formatTime(timeSpent)}</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              {score >= 70 ? '优秀！你的阅读理解能力很强！' :
               score >= 40 ? '不错的尝试！继续练习，你会做得更好！' :
               '继续努力！通过更多练习，你的阅读理解能力会提高！'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">问题回顾</h2>

          {questions.map((question, idx) => (
            <div key={question.id} className={`p-4 rounded-lg border ${
              attempt.responses.find(r => r.questionId === question.id)?.isCorrect
                ? 'border-green-300 bg-green-50'
                : 'border-red-300 bg-red-50'
            }`}>
              <div className="flex justify-between mb-2">
                <span className="font-medium">问题 {idx + 1}</span>
                <span className={
                  attempt.responses.find(r => r.questionId === question.id)?.isCorrect
                    ? 'text-green-600'
                    : 'text-red-600'
                }>
                  {attempt.responses.find(r => r.questionId === question.id)?.isCorrect ? '✓ 正确' : '✗ 错误'}
                </span>
              </div>

              <p className="mb-2">{question.questionText}</p>

              <div className="flex justify-between text-sm mb-2">
                <span>你的答案: <strong>{answers[question.id] || '(未回答)'}</strong></span>
                <span>正确答案: <strong>{question.correctAnswer}</strong></span>
              </div>

              {question.explanation && (
                <div className="mt-2 text-sm bg-card p-3 rounded border border-border">
                  <p className="font-medium mb-1">解释:</p>
                  <p>{question.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => navigate(IELTS_ROUTES.passageRead(passage.id))}
            className="px-4 py-2 border border-border rounded-md hover:bg-muted"
          >
            返回阅读
          </button>

          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            {mode === 'practice' ? '再次练习' : '再次测试'}
          </button>

          <button
            onClick={() => navigate(IELTS_ROUTES.passages)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            更多文章
          </button>
        </div>
      </div>
    </div>
  )
}