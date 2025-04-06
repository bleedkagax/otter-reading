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
              难度级别 <span className="text-red-500">*</span>
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
        
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/ielts/passages')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !file}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              (isSubmitting || !file) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                处理中...
              </span>
            ) : '上传并处理'}
          </button>
        </div>
      </Form>
      
      {isSubmitting && (
        <div className="mt-8 p-4 border border-blue-200 bg-blue-50 rounded-md">
          <h3 className="font-medium text-blue-800 mb-2">处理中，请耐心等待...</h3>
          <p className="text-sm text-blue-600 mb-2">PDF文档正在处理中，这可能需要一分钟左右的时间。</p>
          <div className="w-full bg-blue-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full animate-pulse" style={{width: '100%'}}></div>
          </div>
        </div>
      )}
    </div>
  )
} 