import { Passage } from './PassageCard.types'

// 问题相关类型定义
export interface IeltsQuestion {
  id: string
  passageId: string
  type: string
  questionText: string
  options: string | null
  correctAnswer: string
  explanation: string
  points: number
  orderIndex: number
  createdAt: Date
  updatedAt: Date
}

// 扩展基本的Passage类型，添加questions属性
export interface IeltsPassage extends Passage {
  updatedAt: Date
  questions: IeltsQuestion[]
}

// 回答相关的类型定义
export interface IeltsResponse {
  id: string
  attemptId: string
  questionId: string
  userAnswer: string
  isCorrect: boolean
  timeTaken: number | null
  createdAt: Date
}

// 尝试相关的类型定义
export interface IeltsAttempt {
  id: string
  userId: string
  passageId: string
  isTest: boolean
  startedAt: Date
  completedAt: Date | null
  totalScore: number | null
  maxScore: number | null
  timeSpent: number | null
  responses: IeltsResponse[]
  passage?: {
    questions: IeltsQuestion[]
  }
}

// 高亮区域类型
export interface HighlightedSection {
  start: number
  end: number
  color: string
}

// 词汇类型
export interface IeltsVocabulary {
  id: string
  userId: string
  passageId: string
  word: string
  context: string
  status?: string // 兼容旧版本
  mastered: boolean
  note: string
  createdAt: Date
  updatedAt: Date
  lastReviewed?: Date | null
  reviewCount?: number
}

// 常用工具函数

// 匹配选择题选项字母
export function getOptionLetter(index: number): string {
  return String.fromCharCode(65 + index) // A, B, C, D...
}

// 解析选择题选项
export function parseOptions(optionsString: string | null): string[] {
  if (!optionsString) return []
  try {
    return JSON.parse(optionsString)
  } catch (e) {
    console.error('Error parsing options:', e)
    return []
  }
}

// 格式化时间
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 路径工具
export const IELTS_ROUTES = {
  dashboard: '/ielts/dashboard',
  passages: '/ielts/passages',
  vocabulary: '/ielts/vocabulary',
  stats: '/ielts/stats',
  practice: '/ielts/practice',
  import: '/ielts/import',
  passageRead: (passageId: string) => `/ielts/passages/${passageId}/read`,
  passagePractice: (passageId: string) => `/ielts/passages/${passageId}/practice`,
  passageTest: (passageId: string) => `/ielts/passages/${passageId}/test`,
}