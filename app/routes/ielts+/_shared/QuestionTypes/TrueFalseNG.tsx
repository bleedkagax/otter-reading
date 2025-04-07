import { IeltsQuestion } from '../types'

interface TrueFalseNGProps {
  question: IeltsQuestion
  selectedAnswer: string
  onChange: (questionId: string, value: string) => void
  disabled?: boolean
}

export function TrueFalseNG({ 
  question, 
  selectedAnswer, 
  onChange, 
  disabled = false 
}: TrueFalseNGProps) {
  const options = ['TRUE', 'FALSE', 'NOT GIVEN']
  
  return (
    <div>
      <p className="font-medium mb-4">{question.questionText}</p>
      <div className="space-y-3">
        {options.map((option) => (
          <label key={option} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name={`question-${question.id}`}
              value={option}
              checked={selectedAnswer === option}
              onChange={() => onChange(question.id, option)}
              className="mt-1"
              disabled={disabled}
            />
            <span className="font-medium">{option}</span>
          </label>
        ))}
      </div>
    </div>
  )
} 