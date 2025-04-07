export interface Passage {
  id: string
  title: string
  content: string
  difficulty: string
  topic: string
  wordCount: number
  source: string | null
  createdAt?: Date
}

export interface DifficultyDetails {
  color: string
  label: string
  gradient: string
  hoverGradient: string
}

export function getDifficultyDetails(difficulty: string): DifficultyDetails {
  switch(difficulty) {
    case 'easy':
      return { 
        color: 'bg-green-100 text-green-800',
        label: '简单',
        gradient: 'from-green-400 to-green-500',
        hoverGradient: 'from-green-500 to-green-600'
      };
    case 'medium':
      return { 
        color: 'bg-yellow-100 text-yellow-800',
        label: '中等',
        gradient: 'from-yellow-400 to-yellow-500',
        hoverGradient: 'from-yellow-500 to-yellow-600'
      };
    case 'hard':
      return { 
        color: 'bg-red-100 text-red-800',
        label: '困难',
        gradient: 'from-red-400 to-red-500',
        hoverGradient: 'from-red-500 to-red-600'
      };
    default:
      return { 
        color: 'bg-gray-100 text-gray-800',
        label: difficulty,
        gradient: 'from-gray-400 to-gray-500',
        hoverGradient: 'from-gray-500 to-gray-600'
      };
  }
} 