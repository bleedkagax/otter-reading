import { IeltsQuestion } from './types'
import { 
  MultipleChoice, 
  FillInBlank, 
  TrueFalseNG, 
  HeadingMatching 
} from './QuestionTypes'

interface QuestionRendererProps {
  question: IeltsQuestion
  selectedAnswer: string
  onChange: (questionId: string, value: string) => void
  disabled?: boolean
}

export function QuestionRenderer({ 
  question, 
  selectedAnswer, 
  onChange, 
  disabled = false 
}: QuestionRendererProps) {
  switch (question.type) {
    case 'multiple-choice':
      return (
        <MultipleChoice 
          question={question} 
          selectedAnswer={selectedAnswer} 
          onChange={onChange} 
          disabled={disabled} 
        />
      )
    case 'fill-in-blank':
      return (
        <FillInBlank 
          question={question} 
          selectedAnswer={selectedAnswer} 
          onChange={onChange} 
          disabled={disabled} 
        />
      )
    case 'true-false-ng':
      return (
        <TrueFalseNG 
          question={question} 
          selectedAnswer={selectedAnswer} 
          onChange={onChange} 
          disabled={disabled} 
        />
      )
    case 'heading-matching':
      return (
        <HeadingMatching 
          question={question} 
          selectedAnswer={selectedAnswer} 
          onChange={onChange} 
          disabled={disabled} 
        />
      )
    default:
      return <p>不支持的题目类型: {question.type}</p>
  }
} 