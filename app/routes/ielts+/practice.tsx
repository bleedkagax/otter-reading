import { useState, useRef, useEffect } from 'react'
import { prisma } from '#app/utils/db.server'
import { PassageReader } from '#app/components/ielts/PassageReader'

// 简单定义MetaFunction类型
interface MetaFunction {
  (): { title: string }[];
}

export const meta: MetaFunction = () => [{ title: '雅思阅读练习' }]

// 创建一个示例阅读文章的数据
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

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 倒计时
  useEffect(() => {
    if (timeRemaining > 0 && !isSubmitted) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && !isSubmitted) {
      handleSubmit();
    }
  }, [timeRemaining, isSubmitted]);

  // 处理答案变化
  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // 切换书签状态
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

  // 处理提交
  const handleSubmit = () => {
    if (isSubmitted) return;

    // 计算结果
    let correctCount = 0;
    const feedback: Record<string, { isCorrect: boolean; correctAnswer: string }> = {};

    examplePassage.questions.forEach(question => {
      const userAnswer = (answers[question.id] || '').trim().toLowerCase();
      const correctAnswer = question.answer.toLowerCase();
      const isCorrect = userAnswer === correctAnswer;
      
      if (isCorrect) correctCount++;
      
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

  // 处理文本选择
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      setHighlightedText(selection.toString());
      
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setHighlightPosition({
        x: rect.left + window.scrollX + rect.width / 2,
        y: rect.bottom + window.scrollY
      });
      
      setShowHighlightTooltip(true);
    } else {
      setShowHighlightTooltip(false);
    }
  };

  // 查找高亮文本的单词
  const lookupWord = () => {
    if (highlightedText.trim()) {
      window.open(`https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(highlightedText.trim())}`, '_blank');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">雅思阅读练习</h1>
          <p className="text-gray-600">通过真实题目提升你的阅读能力</p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center">
          <div className={`mr-4 font-medium ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-700'}`}>
            剩余时间: {formatTime(timeRemaining)}
          </div>
          
          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
            >
              提交答案
            </button>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              重新开始
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* 文章阅读区 */}
        <div className="lg:w-1/2 bg-white rounded-lg shadow-md p-6" onMouseUp={handleTextSelection}>
          <h2 className="text-xl font-bold mb-4">{examplePassage.title}</h2>
          <div className="prose max-w-none">
            {examplePassage.content.split('\n\n').map((paragraph, index) => (
              <p key={index} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>
          
          {/* 高亮工具提示 */}
          {showHighlightTooltip && (
            <div 
              className="absolute bg-white shadow-lg rounded-lg p-2 z-10 flex"
              style={{
                top: `${highlightPosition.y}px`,
                left: `${highlightPosition.x}px`,
                transform: 'translateX(-50%)'
              }}
            >
              <button 
                onClick={lookupWord}
                className="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded"
              >
                查词典
              </button>
              <button 
                onClick={() => setShowHighlightTooltip(false)}
                className="text-sm ml-2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* 答题区 */}
        <div className="lg:w-1/2 bg-white rounded-lg shadow-md p-6">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="font-medium">填空题</h3>
            <div className="text-sm text-gray-500">
              完成 {Object.keys(answers).length}/{examplePassage.questions.length}
            </div>
          </div>
          
          {results && (
            <div className="mb-6 bg-gray-50 rounded-lg p-4">
              <div className="mb-2 flex justify-between">
                <span className="font-medium">得分:</span>
                <span className={`font-bold ${results.score >= 70 ? 'text-green-600' : results.score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {results.score}%
                </span>
              </div>
              <div className="mb-2 flex justify-between">
                <span>正确答案:</span>
                <span>{results.correctAnswers}/{results.totalQuestions}</span>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {results.score >= 70 ? '优秀！继续保持！' : 
                 results.score >= 40 ? '继续努力，你可以做得更好！' : 
                 '不要气馁，多加练习！'}
              </div>
            </div>
          )}
          
          <div className="space-y-6">
            {examplePassage.questions.map((question, index) => (
              <div 
                key={question.id} 
                className={`p-4 border rounded-lg ${
                  isSubmitted 
                    ? results?.feedback[question.id]?.isCorrect 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-red-300 bg-red-50'
                    : 'border-gray-200 hover:border-blue-300'
                } ${bookmarkedQuestions.has(question.id) ? 'ring-2 ring-yellow-300' : ''}`}
              >
                <div className="flex justify-between mb-2">
                  <span className="font-medium">问题 {question.questionNumber}</span>
                  <button 
                    onClick={() => toggleBookmark(question.id)}
                    className={`text-sm ${bookmarkedQuestions.has(question.id) ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600'}`}
                    title={bookmarkedQuestions.has(question.id) ? "移除书签" : "添加书签"}
                  >
                    {bookmarkedQuestions.has(question.id) ? '★' : '☆'}
                  </button>
                </div>
                
                <p className="text-gray-700 mb-2">{question.text}</p>
                <p className="text-gray-600 text-sm italic mb-3">{question.context}</p>
                
                <div className="flex">
                  <input
                    type="text"
                    ref={el => inputRefs.current[question.id] = el}
                    value={answers[question.id] || ''}
                    onChange={e => handleAnswerChange(question.id, e.target.value)}
                    disabled={isSubmitted}
                    placeholder="输入答案..."
                    className={`px-3 py-2 border rounded-md w-full focus:outline-none focus:ring-2 ${
                      isSubmitted 
                        ? results?.feedback[question.id]?.isCorrect 
                          ? 'border-green-300 focus:ring-green-200' 
                          : 'border-red-300 focus:ring-red-200'
                        : 'border-gray-300 focus:ring-blue-300'
                    }`}
                  />
                </div>
                
                {isSubmitted && (
                  <div className="mt-2">
                    {results?.feedback[question.id]?.isCorrect ? (
                      <p className="text-green-600 text-sm">✓ 正确</p>
                    ) : (
                      <div>
                        <p className="text-red-600 text-sm">✗ 错误</p>
                        <p className="text-gray-600 text-sm mt-1">
                          正确答案: <span className="font-medium">{results?.feedback[question.id]?.correctAnswer}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-8 border-t pt-6">
            <button
              onClick={handleSubmit}
              disabled={isSubmitted}
              className={`w-full py-3 rounded-md text-white font-medium ${
                isSubmitted 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-primary hover:bg-primary-dark'
              }`}
            >
              {isSubmitted ? '已提交' : '提交答案'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 