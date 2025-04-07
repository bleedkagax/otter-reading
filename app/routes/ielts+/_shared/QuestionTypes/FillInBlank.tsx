import { IeltsQuestion } from '../types'

interface FillInBlankProps {
  question: IeltsQuestion
  selectedAnswer: string
  onChange: (questionId: string, value: string) => void
  disabled?: boolean
}

export function FillInBlank({ 
  question, 
  selectedAnswer, 
  onChange, 
  disabled = false 
}: FillInBlankProps) {
  return (
    <div>
      <p className="font-medium mb-4">{question.questionText}</p>
      <div className="mt-2">
        <input
          type="text"
          value={selectedAnswer || ''}
          onChange={(e) => onChange(question.id, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="输入答案..."
          disabled={disabled}
        />
      </div>
    </div>
  )
} 