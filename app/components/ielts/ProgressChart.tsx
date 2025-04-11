import { useState, useEffect } from 'react'

interface ProgressChartProps {
  data: {
    label: string
    value: number
    total: number
    color: string
  }[]
  title?: string
  showLegend?: boolean
  height?: number
  animate?: boolean
}

export function ProgressChart({
  data,
  title,
  showLegend = true,
  height = 200,
  animate = true
}: ProgressChartProps) {
  const [animated, setAnimated] = useState(false)
  
  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => {
        setAnimated(true)
      }, 100)
      
      return () => clearTimeout(timer)
    } else {
      setAnimated(true)
    }
  }, [animate])
  
  // 计算总宽度
  const totalWidth = data.reduce((sum, item) => sum + item.total, 0)
  
  return (
    <div>
      {title && <h3 className="text-lg font-medium mb-3">{title}</h3>}
      
      <div className="relative" style={{ height: `${height}px` }}>
        {data.map((item, index) => {
          const percentage = item.total > 0 ? (item.value / item.total) * 100 : 0
          const width = totalWidth > 0 ? (item.total / totalWidth) * 100 : 0
          
          return (
            <div 
              key={index}
              className="absolute bottom-0 rounded-t-lg overflow-hidden flex flex-col justify-end"
              style={{ 
                left: `${data.slice(0, index).reduce((sum, d) => sum + (d.total / totalWidth) * 100, 0)}%`,
                width: `${width}%`,
                height: '100%',
                backgroundColor: '#f3f4f6'
              }}
            >
              <div 
                className="w-full transition-all duration-1000 ease-out flex items-end justify-center"
                style={{ 
                  height: animated ? `${percentage}%` : '0%',
                  backgroundColor: item.color,
                  minHeight: '10px'
                }}
              >
                {percentage >= 15 && (
                  <span className="text-white text-xs font-bold mb-1">
                    {Math.round(percentage)}%
                  </span>
                )}
              </div>
              
              {showLegend && (
                <div className="text-center mt-2 text-xs text-gray-600 truncate px-1">
                  {item.label}
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {showLegend && (
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {data.map((item, index) => (
            <div key={index} className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-1"
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-xs text-gray-600">{item.label}: {item.value}/{item.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
