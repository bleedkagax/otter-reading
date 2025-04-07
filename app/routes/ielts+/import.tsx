import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '#app/utils/router-helpers'
import { Form, useActionData, useLoaderData, useNavigate, useNavigation } from 'react-router'
import { useState, useRef } from 'react'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { extractTextFromPdf } from '#app/utils/pdf-parser.server'
import { processPdfWithGemini } from '#app/utils/gemini.server'

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
  const pdfFile = formData.get('pdfFile') as File
  const title = formData.get('title') as string
  const difficulty = formData.get('difficulty') as string
  const topic = formData.get('topic') as string
  
  // 验证表单数据
  if (!pdfFile || !title || !difficulty || !topic) {
    return json<ActionData>({ 
      success: false, 
      error: '请提供所有必填字段（PDF文件、标题、难度和主题）' 
    }, { status: 400 })
  }
  
  if (!pdfFile.name.toLowerCase().endsWith('.pdf')) {
    return json<ActionData>({ 
      success: false, 
      error: '请上传PDF格式的文件' 
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
        wordCount: processedContent.content.split(/\s+/).length,
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
    
    // 成功后重定向到新创建的文章页面
    return redirect(`/ielts/passages/${newPassage.id}/read`)
    
  } catch (error) {
    console.error('PDF处理错误:', error)
    return json<ActionData>({ 
      success: false, 
      error: '处理PDF时出错: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 })
  }
}

export default function ImportPDFPage() {
  const actionData = useActionData<ActionData>()
  const navigate = useNavigate()
  const navigation = useNavigation()
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isSubmitting = navigation.state === 'submitting'
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files.length) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile)
      } else {
        alert('请上传PDF格式的文件')
      }
    }
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFile(e.target.files[0])
    }
  }
  
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">导入PDF并创建IELTS练习</h1>
      
      {actionData?.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <p>{actionData.error}</p>
        </div>
      )}
      
      <Form method="post" encType="multipart/form-data" className="space-y-6">
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors ${
            file ? 'border-green-500 bg-green-50' : 'border-gray-300'
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            name="pdfFile" 
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
            required
          />
          
          {file ? (
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB · 点击更换文件
              </p>
            </div>
          ) : (
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-medium">拖放PDF文件到此处，或点击上传</p>
              <p className="text-sm text-gray-500">
                支持单个PDF文件，最大50MB
              </p>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入文章标题"
            />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="如：环境、教育、科技等"
            />
          </div>
          
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
              难度 <span className="text-red-500">*</span>
            </label>
            <select
              id="difficulty"
              name="difficulty"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">选择难度级别</option>
              <option value="easy">简单 (Band 4-5)</option>
              <option value="medium">中等 (Band 6-7)</option>
              <option value="hard">困难 (Band 8-9)</option>
            </select>
          </div>
        </div>
        
        <div className="border-t pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-medium text-gray-900 mb-1">上传须知</h3>
              <p className="text-sm text-gray-600">系统将自动处理PDF内容，提取文本并生成练习题</p>
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-3 rounded-md text-white font-medium ${
                isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-opacity-90'
              }`}
            >
              {isSubmitting ? '处理中...' : '上传并创建练习'}
            </button>
          </div>
          
          {isSubmitting && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full animate-pulse w-full"></div>
              </div>
              <p className="text-sm text-center text-gray-500 mt-2">
                正在处理PDF文件，这可能需要一些时间...
              </p>
            </div>
          )}
        </div>
      </Form>
      
      {/* 帮助信息 */}
      <div className="mt-12 bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">PDF导入提示</h2>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          <li>上传的PDF应包含完整的雅思阅读文章内容</li>
          <li>为获得最佳结果，请确保PDF格式规范，文本可选择</li>
          <li>系统将自动分析内容，但可能需要手动校对</li>
          <li>生成的题目将基于文章内容，您可以在创建后进行编辑</li>
          <li>处理大型PDF可能需要更长时间，请耐心等待</li>
        </ul>
      </div>
    </div>
  )
} 