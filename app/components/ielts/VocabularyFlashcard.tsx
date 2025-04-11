import { useState, useEffect } from 'react'

interface VocabularyFlashcardProps {
  word: string
  context?: string
  definition?: string
  note?: string
  status?: 'active' | 'mastered' | 'difficult'
  mastered?: boolean
  onStatusChange?: (status: 'active' | 'mastered' | 'difficult') => void
  onNext?: () => void
}

export function VocabularyFlashcard({
  word,
  context,
  definition,
  note,
  status = 'active',
  mastered = false,
  onStatusChange,
  onNext
}: VocabularyFlashcardProps) {
  // 如果提供了mastered属性，使用它来确定状态
  const effectiveStatus = mastered ? 'mastered' : status
  const [flipped, setFlipped] = useState(false)
  const [animation, setAnimation] = useState<'in' | 'out' | null>(null)

  // 翻转卡片
  const flipCard = () => {
    setFlipped(!flipped)
  }

  // 处理状态变更
  const handleStatusChange = (newStatus: 'active' | 'mastered' | 'difficult') => {
    if (onStatusChange) {
      onStatusChange(newStatus)
    }
  }

  // 处理下一张卡片
  const handleNext = () => {
    setAnimation('out')

    setTimeout(() => {
      if (onNext) {
        onNext()
      }
      setFlipped(false)
      setAnimation('in')
    }, 300)
  }

  // 初始化动画
  useEffect(() => {
    setAnimation('in')
  }, [word])

  return (
    <div className={`max-w-md mx-auto ${animation === 'in' ? 'animate-slideIn' : animation === 'out' ? 'animate-slideOut' : ''}`}>
      <div
        className={`relative w-full h-64 cursor-pointer perspective-1000 ${flipped ? 'flipped' : ''}`}
        onClick={flipCard}
      >
        {/* 卡片正面 */}
        <div className={`absolute w-full h-full backface-hidden transition-transform duration-500 ease-in-out rounded-xl shadow-lg bg-white p-6 flex flex-col justify-center items-center ${flipped ? 'rotate-y-180' : ''}`}>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">{word}</h3>
          {context && (
            <p className="text-sm text-gray-600 text-center italic">
              "...{context}..."
            </p>
          )}
          <div className="absolute bottom-3 right-3">
            <span className="text-xs text-gray-400">点击查看释义</span>
          </div>
        </div>

        {/* 卡片背面 */}
        <div className={`absolute w-full h-full backface-hidden transition-transform duration-500 ease-in-out rounded-xl shadow-lg bg-white p-6 ${flipped ? '' : 'rotate-y-180'}`}>
          <h3 className="text-xl font-bold text-gray-800 mb-3">{word}</h3>

          <div className="overflow-y-auto max-h-32 mb-4">
            {definition ? (
              <p className="text-gray-700">{definition}</p>
            ) : (
              <p className="text-gray-500 italic">无定义</p>
            )}

            {note && (
              <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                <p className="text-gray-700">{note}</p>
              </div>
            )}
          </div>

          <div className="absolute bottom-3 left-3">
            <span className="text-xs text-gray-400">点击返回</span>
          </div>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="flex justify-between mt-4">
        <div className="flex space-x-2">
          <button
            onClick={() => handleStatusChange('difficult')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              effectiveStatus === 'difficult'
                ? 'bg-red-600 text-white'
                : 'bg-red-100 text-red-600 hover:bg-red-200'
            }`}
          >
            困难
          </button>
          <button
            onClick={() => handleStatusChange('active')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              effectiveStatus === 'active'
                ? 'bg-yellow-500 text-white'
                : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
            }`}
          >
            复习
          </button>
          <button
            onClick={() => handleStatusChange('mastered')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              effectiveStatus === 'mastered'
                ? 'bg-green-600 text-white'
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
          >
            掌握
          </button>
        </div>

        <button
          onClick={handleNext}
          className="px-3 py-1 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          下一个
        </button>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }

        .backface-hidden {
          backface-visibility: hidden;
        }

        .rotate-y-180 {
          transform: rotateY(180deg);
        }

        @keyframes slideIn {
          from {
            transform: translateX(100px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(-100px);
            opacity: 0;
          }
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }

        .animate-slideOut {
          animation: slideOut 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
