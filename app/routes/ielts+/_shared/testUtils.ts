import { IeltsPassage, IeltsQuestion, IeltsAttempt, IeltsResponse } from './types'

/**
 * 创建测试用例数据
 */

// 生成模拟文章数据
export function createMockPassage(
  override: Partial<IeltsPassage> = {}
): IeltsPassage {
  return {
    id: 'test-passage-id',
    title: '测试文章标题',
    content: '这是一篇测试文章的内容。用于测试阅读理解功能。',
    difficulty: 'medium',
    topic: '测试',
    wordCount: 100,
    source: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    questions: [],
    ...override
  }
}

// 生成模拟问题数据
export function createMockQuestion(
  override: Partial<IeltsQuestion> = {}
): IeltsQuestion {
  return {
    id: `question-${Math.random().toString(36).substring(2, 9)}`,
    passageId: 'test-passage-id',
    type: 'multiple-choice',
    questionText: '这是一个测试问题？',
    options: JSON.stringify(['选项A', '选项B', '选项C', '选项D']),
    correctAnswer: 'A',
    explanation: '这是答案解释',
    points: 1,
    orderIndex: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...override
  }
}

// 生成模拟回答数据
export function createMockResponse(
  questionId: string,
  override: Partial<IeltsResponse> = {}
): IeltsResponse {
  return {
    id: `response-${Math.random().toString(36).substring(2, 9)}`,
    attemptId: 'test-attempt-id',
    questionId,
    userAnswer: 'A',
    isCorrect: true,
    timeTaken: 10,
    createdAt: new Date(),
    ...override
  }
}

// 生成模拟尝试数据
export function createMockAttempt(
  override: Partial<IeltsAttempt> = {}
): IeltsAttempt {
  return {
    id: 'test-attempt-id',
    userId: 'test-user-id',
    passageId: 'test-passage-id',
    isTest: false,
    startedAt: new Date(),
    completedAt: null,
    totalScore: null,
    maxScore: null,
    timeSpent: null,
    responses: [],
    ...override
  }
}

// 生成包含多个问题的测试文章
export function createTestPassageWithQuestions(
  questionCount: number = 5,
  passageOverride: Partial<IeltsPassage> = {}
): IeltsPassage {
  const questions: IeltsQuestion[] = []
  
  for (let i = 0; i < questionCount; i++) {
    questions.push(createMockQuestion({
      id: `q-${i + 1}`,
      orderIndex: i,
      questionText: `测试问题 ${i + 1}？`
    }))
  }
  
  return createMockPassage({
    questions,
    ...passageOverride
  })
}

// 生成包含回答的测试尝试
export function createTestAttemptWithResponses(
  questions: IeltsQuestion[],
  attemptOverride: Partial<IeltsAttempt> = {}
): IeltsAttempt {
  const responses: IeltsResponse[] = []
  
  questions.forEach((question, idx) => {
    const isCorrect = idx % 2 === 0 // 一半正确一半错误
    responses.push(createMockResponse(question.id, {
      isCorrect,
      userAnswer: isCorrect ? question.correctAnswer : 'X'
    }))
  })
  
  return createMockAttempt({
    responses,
    ...attemptOverride
  })
} 