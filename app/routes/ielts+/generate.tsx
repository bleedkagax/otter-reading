import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '#app/utils/router-helpers'
import { Form, useActionData, useNavigation } from 'react-router'
import { useState, useEffect } from 'react'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
// 使用 fetch API 直接调用 Gemini API
import { generateIeltsContent } from '#app/utils/gemini-fetch.server'

interface ActionData {
  success?: boolean;
  error?: string;
  passageId?: string;
  processingStatus?: 'idle' | 'processing' | 'success' | 'error';
  progressMessage?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  // 确保用户已登录
  await requireUserId(request)
  return json({})
}

export async function action({ request }: ActionFunctionArgs) {
  // 确保用户已登录
  const userId = await requireUserId(request)

  const formData = await request.formData()
  const title = formData.get('title') as string
  const difficulty = formData.get('difficulty') as string
  const topic = formData.get('topic') as string
  const wordCount = parseInt(formData.get('wordCount') as string || '800')

  // 验证表单数据
  if (!topic || !difficulty) {
    return json<ActionData>({
      success: false,
      error: '请提供所有必填字段（主题和难度）'
    }, { status: 400 })
  }

  try {
    // 使用Gemini生成内容
    const generatedContent = await generateIeltsContent({
      topic,
      difficulty,
      wordCount
    }).catch(error => {
      console.error('Gemini API错误:', error)
      if (error instanceof Error) {
        throw new Error(`生成内容失败: ${error.message}`)
      } else {
        throw new Error(`生成内容失败: ${String(error)}`)
      }
    })

    // 创建新的文章记录
    const newPassage = await prisma.ieltsPassage.create({
      data: {
        title: generatedContent.title || title || `关于${topic}的文章`,
        content: generatedContent.content,
        difficulty: generatedContent.difficulty || difficulty,
        topic,
        wordCount: generatedContent.wordCount || wordCount,
        source: `AI Generated: ${new Date().toISOString()}`,
        questions: {
          create: generatedContent.questions.map((q, index) => ({
            type: q.type,
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            points: 1,
            orderIndex: index,
          }))
        }
      }
    })

    // 如果有词汇表，为用户添加这些词汇
    if (generatedContent.vocabulary && generatedContent.vocabulary.length > 0) {
      await Promise.all(
        generatedContent.vocabulary.map(word =>
          prisma.ieltsUserVocabulary.create({
            data: {
              userId,
              passageId: newPassage.id,
              word,
              context: `From AI generated passage: ${generatedContent.title || title}`,
              mastered: false,
              note: '',
              createdAt: new Date()
            }
          })
        )
      )
    }

    // 成功后重定向到新创建的文章页面
    return redirect(`/ielts/passages/${newPassage.id}/read`)

  } catch (error) {
    console.error('AI内容生成错误:', error)
    return json<ActionData>({
      success: false,
      error: '生成内容时出错: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 })
  }
}

export default function GenerateContentPage() {
  const actionData = useActionData<ActionData>()
  const navigation = useNavigation()
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([])
  const isSubmitting = navigation.state === 'submitting'

  // 预设的主题建议
  const suggestedTopics = [
    "环境保护", "科技创新", "文化多样性", "城市化", "全球化",
    "教育改革", "健康与医疗", "气候变化", "社会心理学", "可持续发展",
    "人工智能", "生物多样性", "太空探索", "历史遗产", "经济发展"
  ]

  // 随机选择5个主题作为建议
  const getRandomTopics = () => {
    const shuffled = [...suggestedTopics].sort(() => 0.5 - Math.random())
    setTopicSuggestions(shuffled.slice(0, 5))
  }

  // 页面加载时生成随机主题建议
  useEffect(() => {
    getRandomTopics()
  }, [])

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">AI生成IELTS阅读内容</h1>

      {actionData?.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <p>{actionData.error}</p>
        </div>
      )}

      <Form method="post" className="space-y-6">
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">AI生成说明</h2>
          <p className="text-gray-700 mb-4">
            本功能使用人工智能技术自动生成IELTS风格的阅读文章和配套问题。您只需提供主题和难度级别，系统将为您创建完整的阅读练习。
          </p>
          <p className="text-gray-700">
            生成的内容包括：原创文章、多种题型的问题（多选、判断、填空等）、详细解析和重要词汇。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
              主题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="topic"
              name="topic"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如：环境保护、科技创新、文化多样性等"
            />
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">主题建议：</p>
              <div className="flex flex-wrap gap-1">
                {topicSuggestions.map((topic, index) => (
                  <button
                    key={index}
                    type="button"
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                    onClick={() => {
                      const topicInput = document.getElementById('topic') as HTMLInputElement
                      if (topicInput) topicInput.value = topic
                    }}
                  >
                    {topic}
                  </button>
                ))}
                <button
                  type="button"
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-500"
                  onClick={getRandomTopics}
                >
                  换一批
                </button>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
              难度级别 <span className="text-red-500">*</span>
            </label>
            <select
              id="difficulty"
              name="difficulty"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">选择难度...</option>
              <option value="easy">简单 (Band 4-5)</option>
              <option value="medium">中等 (Band 6-7)</option>
              <option value="hard">困难 (Band 8-9)</option>
            </select>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              标题 (可选)
            </label>
            <input
              type="text"
              id="title"
              name="title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="留空将由AI自动生成"
            />
            <p className="text-xs text-gray-500 mt-1">如果不填写，系统将自动生成合适的标题</p>
          </div>

          <div>
            <label htmlFor="wordCount" className="block text-sm font-medium text-gray-700 mb-1">
              文章长度 (词数)
            </label>
            <input
              type="number"
              id="wordCount"
              name="wordCount"
              defaultValue="800"
              min="500"
              max="1200"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">建议范围：500-1200词（真实IELTS阅读文章通常为700-900词）</p>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-medium text-gray-900 mb-1">生成须知</h3>
              <p className="text-sm text-gray-600">AI将根据您的要求生成原创内容，这可能需要一些时间</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-3 rounded-md text-white font-medium ${
                isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-opacity-90'
              }`}
            >
              {isSubmitting ? '生成中...' : '生成IELTS阅读内容'}
            </button>
          </div>

          {isSubmitting && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full animate-pulse w-full"></div>
              </div>
              <p className="text-sm text-center text-gray-500 mt-2">
                正在生成内容，这可能需要30-60秒...
              </p>
            </div>
          )}
        </div>
      </Form>

      {/* 帮助信息 */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">AI生成内容提示</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>选择明确的主题可以获得更高质量的内容</li>
          <li>生成的内容是原创的，但可能需要您进行一些微调</li>
          <li>系统会自动提取文章中的重要词汇，并添加到您的词汇库中</li>
          <li>生成的问题将测试不同的阅读技能，包括主旨理解、细节定位和推断能力</li>
          <li>生成过程可能需要30-60秒，请耐心等待</li>
        </ul>
      </div>
    </div>
  )
}
