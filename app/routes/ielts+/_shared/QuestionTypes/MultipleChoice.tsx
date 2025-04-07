import { IeltsQuestion, getOptionLetter, parseOptions } from '../types'

interface MultipleChoiceProps {
  question: IeltsQuestion
  selectedAnswer: string
  onChange: (questionId: string, value: string) => void
  disabled?: boolean
}

export function MultipleChoice({ 
  question, 
  selectedAnswer, 
  onChange, 
  disabled = false 
}: MultipleChoiceProps) {
  const options = parseOptions(question.options)
  
  return (
    <div>
      <p className="font-medium mb-4">{question.questionText}</p>
      <div className="space-y-3">
        {options.map((option, idx) => (
          <label key={idx} className="flex items-start space-x-2 cursor-pointer">
            <input
              type="radio"
              name={`question-${question.id}`}
              value={getOptionLetter(idx)}
              checked={selectedAnswer === getOptionLetter(idx)}
              onChange={() => onChange(question.id, getOptionLetter(idx))}
              className="mt-1"
              disabled={disabled}
            />
            <span>
              <span className="font-medium">{getOptionLetter(idx)}.</span> {option}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
} 