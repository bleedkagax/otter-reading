import { PassageReader } from './PassageReader'
import { useState } from 'react'

interface Question {
  id: number
  text: string
  type: 'truefalse' | 'multichoice' | 'fillblank' | 'matching'
  options?: string[]
  answer?: string
}

interface Part {
  id: string
  name: string
  questions: Question[]
  score?: number
  totalQuestions?: number
}

interface ReadingTestResult {
  id: string
  score: number
  parts: Part[]
}

interface HighlightedSection {
  start: number
  end: number
  color: string
  text: string
  paragraphIndex: number
  textOffset: number
}

interface ReadingPracticeViewProps {
  title: string
  content: string
  parts?: Part[]
  timeLimit?: number
  wordCount?: number
  difficulty?: string
  topic?: string
  testResults?: ReadingTestResult[]
  highlights?: HighlightedSection[]
  onSubmit?: (answers: Record<number, string>) => void
  onHighlight?: (highlight: HighlightedSection) => void
  onWordSelect?: (word: string, context?: string) => void
}

export function ReadingPracticeView({
  title,
  content,
  parts = [],
  timeLimit = 60,
  wordCount = 0,
  difficulty = '',
  topic = '',
  testResults = [],
  highlights = [],
  onSubmit,
  onHighlight,
  onWordSelect
}: ReadingPracticeViewProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // Handle submit from the PassageReader
  const handleSubmit = (submittedAnswers: Record<number, string>) => {
    setAnswers(submittedAnswers);
    onSubmit?.(submittedAnswers);
  };

  return (
    <PassageReader
      title={title}
      content={content}
      parts={parts}
      timeLimit={timeLimit}
      wordCount={wordCount}
      difficulty={difficulty}
      topic={topic}
      testResults={testResults}
      highlights={highlights}
      onSubmit={handleSubmit}
      onHighlight={onHighlight}
      onWordSelect={onWordSelect}
    />
  );
}