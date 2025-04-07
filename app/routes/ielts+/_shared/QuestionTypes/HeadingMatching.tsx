import { IeltsQuestion, parseOptions } from '../types'

interface HeadingMatchingProps {
  question: IeltsQuestion
  selectedAnswer: string
  onChange: (questionId: string, value: string) => void
  disabled?: boolean
}

export function HeadingMatching({ 
  question, 
  selectedAnswer, 
  onChange, 
  disabled = false 
}: HeadingMatchingProps) {
  const options = parseOptions(question.options)
  
  return (
    <div>
      <p className="font-medium mb-4">{question.questionText}</p>
      <div className="mt-2">
        <select
          value={selectedAnswer || ''}
          onChange={(e) => onChange(question.id, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={disabled}
        >
          <option value="">选择标题...</option>
          {options.map((option, idx) => (
            <option key={idx} value={String.fromCharCode(65 + idx)}>
              {String.fromCharCode(65 + idx)}. {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
} 