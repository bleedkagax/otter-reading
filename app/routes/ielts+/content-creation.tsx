import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '#app/utils/router-helpers'
import { Form, useActionData, useLoaderData, useNavigate, useNavigation } from 'react-router'
import { useState, useRef, useEffect } from 'react'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { extractTextFromPdf } from '#app/utils/pdf-parser.server'
import { processPdfWithGemini } from '#app/utils/gemini.server'
import { generateIeltsContent } from '#app/utils/gemini-fetch.server'

interface ActionData {
  success?: boolean;
  error?: string;
  passageId?: string;
  processingStatus?: 'idle' | 'processing' | 'success' | 'error';
  progressMessage?: string;
  method?: 'import' | 'generate';
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
  const method = formData.get('method') as 'import' | 'generate'
  
  if (method === 'import') {
    // 处理PDF导入
    const pdfFile = formData.get('pdfFile') as File
    const title = formData.get('title') as string
    const difficulty = formData.get('difficulty') as string
    const topic = formData.get('topic') as string
    
    // 验证表单数据
    if (!pdfFile || !title || !difficulty || !topic) {
      return json<ActionData>({ 
        success: false, 
        error: '请提供所有必填字段（PDF文件、标题、难度和主题）',
        method: 'import'
      }, { status: 400 })
    }
    
    if (!pdfFile.name.toLowerCase().endsWith('.pdf')) {
      return json<ActionData>({ 
        success: false, 
        error: '请上传PDF格式的文件',
        method: 'import'
      }, { status: 400 })
    }
    
    try {
      // 读取PDF文件内容
      const fileBuffer = await pdfFile.arrayBuffer()
      
      // 从PDF提取文本
      const pdfContent = await extractTextFromPdf(fileBuffer)
      
      // 使用Gemini处理内容
      const processedContent = await processPdfWithGemini(pdfContent, title, difficulty, topic)
      
      // 创建新的文章记录
      const newPassage = await prisma.ieltsPassage.create({
        data: {
          title,
          content: processedContent.content,
          difficulty,
          topic,
          wordCount: processedContent.content.split(/\\s+/).length,
          source: `Imported PDF: ${pdfFile.name}`,
          questions: {
            create: processedContent.questions.map((q, index) => ({
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
      
      // 重定向到新创建的文章页面
      return redirect(`/ielts/passages/${newPassage.id}`)
    } catch (error) {
      console.error('处理PDF时出错:', error)
      return json<ActionData>({ 
        success: false, 
        error: error instanceof Error ? error.message : '处理PDF时出错',
        method: 'import'
      }, { status: 500 })
    }
  } else if (method === 'generate') {
    // 处理AI生成
    const title = formData.get('title') as string
    const difficulty = formData.get('difficulty') as string
    const topic = formData.get('topic') as string
    const wordCount = parseInt(formData.get('wordCount') as string || '800')

    // 验证表单数据
    if (!topic || !difficulty) {
      return json<ActionData>({
        success: false,
        error: '请提供所有必填字段（主题和难度）',
        method: 'generate'
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
        }
        throw error
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

      // 重定向到新创建的文章页面
      return redirect(`/ielts/passages/${newPassage.id}`)
    } catch (error) {
      console.error('AI生成内容时出错:', error)
      return json<ActionData>({
        success: false,
        error: error instanceof Error ? error.message : 'AI生成内容时出错',
        method: 'generate'
      }, { status: 500 })
    }
  }
  
  return json<ActionData>({ 
    success: false, 
    error: '无效的请求方法'
  }, { status: 400 })
}

export default function ContentCreation() {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState<'import' | 'generate'>(
    actionData?.method || 'generate'
  )
  
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfPreview, setPdfPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const isSubmitting = navigation.state === 'submitting'
  
  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPdfFile(file)
      
      // 创建文件预览URL
      const fileUrl = URL.createObjectURL(file)
      setPdfPreview(fileUrl)
    }
  }
  
  // 清除文件选择
  const clearFileSelection = () => {
    setPdfFile(null)
    setPdfPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  // 清理预览URL
  useEffect(() => {
    return () => {
      if (pdfPreview) {
        URL.revokeObjectURL(pdfPreview)
      }
    }
  }, [pdfPreview])
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">创建内容</h1>
      
      {/* 选项卡导航 */}
      <div className="flex border-b border-gray-200 mb-8">
        <button
          className={`py-3 px-6 font-medium text-lg ${
            activeTab === 'generate'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('generate')}
        >
          AI生成文章
        </button>
        <button
          className={`py-3 px-6 font-medium text-lg ${
            activeTab === 'import'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('import')}
        >
          导入PDF文章
        </button>
      </div>
      
      {/* 错误消息 */}
      {actionData?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {actionData.error}
        </div>
      )}
      
      {/* AI生成表单 */}
      {activeTab === 'generate' && (
        <div className="bg-white p-8 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-6">使用AI生成雅思阅读文章</h2>
          
          <Form method="post" className="space-y-6">
            <input type="hidden" name="method" value="generate" />
            
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
                主题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="topic"
                name="topic"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="例如：环境保护、科技发展、教育改革等"
              />
            </div>
            
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                标题（可选）
              </label>
              <input
                type="text"
                id="title"
                name="title"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="留空将自动生成标题"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                  难度 <span className="text-red-500">*</span>
                </label>
                <select
                  id="difficulty"
                  name="difficulty"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">选择难度</option>
                  <option value="easy">简单 (Band 5-6)</option>
                  <option value="medium">中等 (Band 6-7)</option>
                  <option value="hard">困难 (Band 7-9)</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="wordCount" className="block text-sm font-medium text-gray-700 mb-1">
                  字数
                </label>
                <select
                  id="wordCount"
                  name="wordCount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="600">约600字（短）</option>
                  <option value="800" selected>约800字（中）</option>
                  <option value="1000">约1000字（长）</option>
                </select>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="font-medium text-blue-800 mb-2">AI生成说明</h3>
              <p className="text-sm text-blue-700">
                系统将根据您提供的主题和难度，使用AI自动生成一篇雅思阅读文章及相关练习题。
                生成过程可能需要10-30秒，请耐心等待。
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-3 bg-blue-600 text-white rounded-md font-medium ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? '生成中...' : '开始生成'}
              </button>
            </div>
          </Form>
        </div>
      )}
      
      {/* PDF导入表单 */}
      {activeTab === 'import' && (
        <div className="bg-white p-8 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-6">导入PDF文章</h2>
          
          <Form method="post" encType="multipart/form-data" className="space-y-6">
            <input type="hidden" name="method" value="import" />
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {!pdfFile ? (
                <>
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <div className="mt-4 flex text-sm text-gray-600 justify-center">
                    <label
                      htmlFor="pdfFile"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                    >
                      <span>上传PDF文件</span>
                      <input
                        id="pdfFile"
                        name="pdfFile"
                        type="file"
                        accept=".pdf"
                        className="sr-only"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        required
                      />
                    </label>
                    <p className="pl-1">或拖放到此处</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">仅支持PDF格式</p>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <svg
                    className="h-10 w-10 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="mt-2 text-sm font-medium">{pdfFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={clearFileSelection}
                    className="mt-3 text-sm text-red-600 hover:text-red-800"
                  >
                    移除文件
                  </button>
                </div>
              )}
            </div>
            
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                文章标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                  难度 <span className="text-red-500">*</span>
                </label>
                <select
                  id="difficulty"
                  name="difficulty"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">选择难度</option>
                  <option value="easy">简单 (Band 5-6)</option>
                  <option value="medium">中等 (Band 6-7)</option>
                  <option value="hard">困难 (Band 7-9)</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
                  主题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="topic"
                  name="topic"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：环境、科技、教育等"
                />
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-md">
              <h3 className="font-medium text-yellow-800 mb-2">PDF处理说明</h3>
              <p className="text-sm text-yellow-700">
                系统将从PDF中提取文本，并使用AI自动生成相关的雅思阅读练习题。
                处理过程可能需要10-30秒，请耐心等待。
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !pdfFile}
                className={`px-6 py-3 bg-blue-600 text-white rounded-md font-medium ${
                  isSubmitting || !pdfFile ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? '处理中...' : '上传并处理'}
              </button>
            </div>
          </Form>
        </div>
      )}
    </div>
  )
}
