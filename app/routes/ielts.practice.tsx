import { useState, useRef, useEffect } from 'react'
import { prisma } from '#app/utils/db.server'
import { PassageReader } from '#app/components/ielts/PassageReader'

// 简单定义MetaFunction类型
interface MetaFunction {
  (): { title: string }[];
}

export const meta: MetaFunction = () => [{ title: '雅思阅读练习' }]

// 创建一个伯兹艾示例阅读文章的数据
const examplePassage = {
  id: 'example-frozen-food',
  title: 'Clarence Birdseye and the Development of Frozen Food',
  content: `A

Born in 1886 in New York, the American naturalist Clarence Birdseye had an instinctive curiosity, a love of food,and a strong entrepreneurial streak. At the age of ten, he was hunting, selling live animals and teaching himself taxidermy, the art of preserving and mounting the skins of animals. He studied science in college, but had to drop out because tuition was too expensive. Forced to support himself, he moved west, where he worked in Montana as an assistant naturalist,capturing small mammals to study the parasites that they often carried in their fur.Eventually, partly as a result of this research, the source of a prevalent disease was isolated.

B

Within a few years, Birdseye moved to the arctic tundra of Labrador, in what is now northern Canada, where he worked for several years as a fur trader. He spent much of his time among the local trappers who worked year-round in the icy wilderness,and he rode long journeys with a nine-dog sled to purchase goods that were exported to a company in New York. It appeared that Birdseye had found his professional calling. He planned to be a fur trader for years to come,especially after marrying an American woman who moved to Labrador in 1912 to teach there.

C

During his years in Labrador, Birdseye made several observations that would change his life—and the future of food. He noticed that fish that died in the Arctic winter froze solid almost immediately and that when these fish later thawed and were eaten, their taste was indistinguishable from fresh-caught fish. In contrast, fish that froze slowly in slightly warmer temperatures and then thawed tasted terrible. Birdseye also observed that the indigenous peoples of the region preferred to cook and eat frozen meat rather than fresh meat because the taste was superior.

D

Birdseye was a keen observer, but that skill was not unusual for a naturalist. What set him apart was his ability to recognize the implications of his observations. He knew that the temperature was -40° Celsius on days when the frozen fish tasted like fresh-caught fish, and that this flash-freezing—rather than slow freezing—was surely what made the difference.

E

When Birdseye continued his research after returning to the United States, he realized that quick freezing created tiny ice crystals that caused minimal damage to the cellular structure of foods. In contrast, slow freezing formed larger ice crystals with sharp edges, which could pierce and damage cell membranes. Consequently, when the larger crystals melted, the molecular contents of the cells leaked out, resulting in deterioration of taste and texture.

F

By 1922, Birdseye was ready to develop products and techniques based on his insight. He organized a company called Birdseye Seafoods, Inc. His patent for a machine that pressed double belts against refrigerated metal plates to flash freeze fish was granted in 1924. In spite of the fact that Birdseye's product offered superior preservation of food, the idea was slow to catch on in part because a totally new infrastructure would be required to deliver frozen food to customers. It needed more than shops could affordably provide—something new called 'freezer cabinets'—along with refrigerated warehouses, and refrigerated grocery delivery trucks. Equally important, it needed customers who were willing to invest in a home freezer.

G

Further decreasing his new products' chance of success was the fact that the company had to deal with customer doubts. Frozen foods available prior to Birdseye's invention were generally of poor quality, so people associated 'frozen' with 'poor quality.' Overcoming these disadvantages meant investing a great deal more money than Birdseye's company had. However, in 1926 a $20 million deal was offered for the patents and the company.

H

In 1930, the company that purchased Birdseye's patents began selling 26 products, including frozen peas, spinach, cherries, and fish fillets. The technological infrastructure soon caught up with the idea, and by 1940, Birdseye Model Home Food Freezers were being advertised for home use. Refrigerators with freezers began appearing in American homes in the 1940s, but use was limited until the 1950's when the larger freezer section at the top of home refrigerators became standard.

I

In the 1950s, another type of frozen meal appeared: the complete 'TV dinner.' The company that pioneered this product sold it in an aluminum tray designed to resemble those used on airlines. The frozen TV dinner proved so popular that grocery supply could not keep up with consumer demand. The aluminum trays introduced with TV dinners continued in use almost without change for decades, until the mid-1980s, when the microwave oven began to replace the conventional oven in reheating frozen meals. By 1985, US spending on frozen food had reached $30 billion annually.

J

Curiously, flash-freezing—the technology that gave birth to the frozen food industry—has not yet been embraced by all frozen food manufacturers. Some companies selling cheaper frozen foods still opt for the cheaper slow-freeze method. Thus, the flash-frozen technology that changed the way food is preserved may still have room to grow.`,
  questions: [
    {
      id: 'q1',
      questionNumber: 1,
      type: 'fill-in-blank',
      text: 'Birdseye grew up hunting and selling animals',
      answer: 'college',
      context: 'he left ___ for financial reasons'
    },
    {
      id: 'q2',
      questionNumber: 2,
      type: 'fill-in-blank',
      text: 'his work in Montana was a factor in finding the cause of a widespread',
      answer: 'disease',
      context: 'the source of a prevalent ___ was isolated'
    },
    {
      id: 'q3',
      questionNumber: 3,
      type: 'fill-in-blank',
      text: 'he moved to Labrador, where he bought furs for a New York company',
      answer: 'journey', // 这是一个示例答案，实际上可能不是正确的
      context: 'he rode long ___ with a nine-dog sled'
    }
  ]
};

export default function IeltsReadingPractice() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [timeRemaining, setTimeRemaining] = useState(20 * 60); // 20分钟
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<{
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    feedback: Record<string, {
      isCorrect: boolean;
      correctAnswer: string;
    }>;
  } | null>(null);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<string>>(new Set());
  const [highlightedText, setHighlightedText] = useState('');
  const [showHighlightTooltip, setShowHighlightTooltip] = useState(false);
  const [highlightPosition, setHighlightPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // 监听文本选择事件
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setShowHighlightTooltip(false);
        return;
      }

      const selectedText = selection.toString().trim();
      if (selectedText.length > 0) {
        setHighlightedText(selectedText);
        
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setHighlightPosition({
          x: rect.left + rect.width / 2,
          y: rect.bottom + 10
        });
        
        setShowHighlightTooltip(true);
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const toggleBookmark = (questionId: string) => {
    setBookmarkedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleSubmit = () => {
    // 计算得分
    let correctCount = 0;
    const feedback: Record<string, { isCorrect: boolean; correctAnswer: string }> = {};
    
    examplePassage.questions.forEach(question => {
      const userAnswer = answers[question.id] || '';
      const isCorrect = userAnswer.toLowerCase() === question.answer.toLowerCase();
      
      if (isCorrect) {
        correctCount++;
      }
      
      feedback[question.id] = {
        isCorrect,
        correctAnswer: question.answer
      };
    });
    
    const score = Math.round((correctCount / examplePassage.questions.length) * 100);
    
    setResults({
      score,
      totalQuestions: examplePassage.questions.length,
      correctAnswers: correctCount,
      feedback
    });
    
    setIsSubmitted(true);
  };

  const handleHighlight = () => {
    // 实现文本高亮功能
    // 这里可以保存高亮文本和相关信息
    console.log('高亮:', highlightedText);
    setShowHighlightTooltip(false);
  };

  const handleAddToVocabulary = () => {
    // 实现添加生词功能
    console.log('添加到生词本:', highlightedText);
    setShowHighlightTooltip(false);
    
    // 这里可以显示一个消息提示
    alert(`已将 "${highlightedText}" 添加到生词本`);
  };

  // 修复ref回调函数
  const setInputRef = (id: string, el: HTMLInputElement | null) => {
    inputRefs.current[id] = el;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 时间提示 */}
        <div className="fixed top-4 right-4 bg-white shadow-md rounded-lg px-4 py-2 z-50">
          <span className="font-medium">剩余时间: </span>
          <span className={`${timeRemaining < 300 ? 'text-red-600' : 'text-gray-800'} font-mono`}>
            {formatTime(timeRemaining)}
          </span>
        </div>

        {/* 阅读考试指导 */}
        <div className="bg-gray-100 border border-gray-200 p-4 mb-6 rounded-md">
          <h2 className="font-bold text-lg">Part 1</h2>
          <p className="text-gray-700">You should spend about 20 minutes on Questions 1-13, which are based on Reading Passage 1.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
          {/* 左侧阅读文章 - 添加固定高度和滚动 */}
          <div className="lg:w-1/2 h-full overflow-hidden flex flex-col">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">{examplePassage.title}</h1>
            <div className="overflow-y-auto pr-4 flex-grow">
              <PassageReader 
                content={examplePassage.content} 
                showParagraphNumbers={true}
              />
            </div>
            
            {/* 文本高亮工具提示 */}
            {showHighlightTooltip && (
              <div 
                className="fixed bg-white shadow-lg rounded-lg p-2 z-50 flex gap-2"
                style={{
                  left: `${highlightPosition.x}px`,
                  top: `${highlightPosition.y}px`,
                  transform: 'translateX(-50%)'
                }}
              >
                <button 
                  className="text-xs bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded"
                  onClick={handleHighlight}
                >
                  高亮标记
                </button>
                <button 
                  className="text-xs bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded"
                  onClick={handleAddToVocabulary}
                >
                  添加到生词本
                </button>
              </div>
            )}
          </div>

          {/* 右侧问题区域 - 添加固定高度和滚动 */}
          <div className="lg:w-1/2 bg-white p-6 rounded-lg shadow-md h-full flex flex-col overflow-hidden">
            <div className="mb-4">
              <h2 className="text-xl font-bold mb-2">Questions 1 - 7</h2>
              <p className="mb-2">Complete the notes below.</p>
              <p className="mb-4 font-bold">
                Choose <span className="underline">ONE WORD ONLY</span> from the passage in each gap.
              </p>
            </div>

            <div className="overflow-y-auto pr-4 flex-grow">
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-4">Clarence Birdseye and the Frozen Food Industry</h3>
                
                <h4 className="font-bold mb-2">Early adventures</h4>
                <ul className="space-y-4">
                  {examplePassage.questions.map((question, index) => (
                    <li key={question.id} className="flex items-start gap-2">
                      <span className="text-gray-500">•</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{question.text}</span>
                          {index === 0 && (
                            <>
                              <span>for financial reasons</span>
                            </>
                          )}
                          {index === 1 && (
                            <input
                              ref={el => setInputRef(question.id, el)}
                              type="text"
                              className={`border ${isSubmitted && results ? (results.feedback[question.id]?.isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') : 'border-gray-300'} rounded-md px-2 py-1 w-32 text-center`}
                              value={answers[question.id] || ''}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              maxLength={15}
                              disabled={isSubmitted}
                            />
                          )}
                          
                          <button 
                            className={`ml-2 ${bookmarkedQuestions.has(question.id) ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500`}
                            onClick={() => toggleBookmark(question.id)}
                            title={bookmarkedQuestions.has(question.id) ? "移除书签" : "添加书签"}
                          >
                            ★
                          </button>
                        </div>
                        {index === 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <span>he left</span>
                            <input
                              ref={el => setInputRef(question.id, el)}
                              type="text"
                              className={`border ${isSubmitted && results ? (results.feedback[question.id]?.isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') : 'border-gray-300'} rounded-md px-2 py-1 w-32 text-center`}
                              value={answers[question.id] || ''}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              maxLength={15}
                              disabled={isSubmitted}
                            />
                            <span>for financial reasons</span>
                          </div>
                        )}
                        {index === 2 && (
                          <div className="mt-2 flex items-center gap-2">
                            <span>he enjoyed the</span>
                            <input
                              ref={el => setInputRef(question.id, el)}
                              type="text"
                              className={`border ${isSubmitted && results ? (results.feedback[question.id]?.isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') : 'border-gray-300'} rounded-md px-2 py-1 w-32 text-center`}
                              value={answers[question.id] || ''}
                              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                              maxLength={15}
                              disabled={isSubmitted}
                            />
                            <span>of living in such a tough environment</span>
                          </div>
                        )}
                        
                        {/* 显示正确答案的反馈 */}
                        {isSubmitted && results && !results.feedback[question.id]?.isCorrect && (
                          <div className="mt-2 text-sm text-red-600">
                            正确答案: {results.feedback[question.id]?.correctAnswer}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 结果反馈 */}
              {isSubmitted && results && (
                <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-lg mb-2">测试结果</h3>
                  <p className="mb-2">得分: <span className="font-bold">{results.score}%</span></p>
                  <p>正确: {results.correctAnswers}/{results.totalQuestions}</p>
                </div>
              )}
            </div>

            {/* 底部导航按钮 - 固定在底部 */}
            <div className="mt-4 pt-4 border-t flex justify-between">
              <div>
                <button 
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 mr-2"
                  disabled={currentQuestion === 0}
                  onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                >
                  上一题
                </button>
                <button 
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                  onClick={() => setCurrentQuestion(prev => Math.min(examplePassage.questions.length - 1, prev + 1))}
                >
                  下一题
                </button>
              </div>
              
              {!isSubmitted ? (
                <button 
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  onClick={handleSubmit}
                >
                  提交答案
                </button>
              ) : (
                <button 
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  onClick={() => window.location.href = '/ielts/passages'}
                >
                  返回列表
                </button>
              )}
            </div>
            
            {/* 导航指示器 */}
            <div className="mt-4 flex justify-center gap-1">
              {examplePassage.questions.map((question, index) => (
                <button
                  key={question.id}
                  className={`size-8 rounded-full flex items-center justify-center border ${
                    currentQuestion === index ? 'bg-blue-600 text-white' : 
                    bookmarkedQuestions.has(question.id) ? 'bg-yellow-100 border-yellow-500' :
                    answers[question.id] ? 'bg-gray-200' : 'bg-white'
                  }`}
                  onClick={() => setCurrentQuestion(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 