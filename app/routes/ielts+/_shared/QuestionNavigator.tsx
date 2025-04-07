import { IeltsQuestion } from './types'

interface QuestionNavigatorProps {
  questions: IeltsQuestion[]
  currentIndex: number
  answers: Record<string, string>
  onNavigate: (index: number) => void
}

export function QuestionNavigator({
  questions,
  currentIndex,
  answers,
  onNavigate
}: QuestionNavigatorProps) {
  return (
    <div className="mt-8 pt-4 border-t">
      <h4 className="font-medium mb-3">问题导航:</h4>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, idx) => (
          <button
            key={question.id}
            onClick={() => onNavigate(idx)}
            className={`w-8 h-8 flex items-center justify-center rounded-full ${
              currentIndex === idx
                ? 'bg-primary text-white' 
                : answers[question.id]
                  ? 'bg-gray-200 text-gray-700' 
                  : 'bg-gray-100 text-gray-500'
            }`}
            aria-label={`跳转到问题 ${idx + 1}`}
          >
            {idx + 1}
          </button>
        ))}
      </div>
    </div>
  )
} 