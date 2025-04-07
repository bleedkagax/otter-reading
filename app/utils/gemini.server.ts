// 导入必要的依赖
import { GoogleGenerativeAI } from '@google/generative-ai'

// 定义问题类型
interface IeltsQuestion {
  type: string
  questionText: string
  options: string | null
  correctAnswer: string
  explanation: string
}

// 定义处理后的内容结构
interface ProcessedContent {
  content: string
  questions: IeltsQuestion[]
}

/**
 * 使用Google Gemini API处理PDF内容
 * 提取并格式化文本内容，生成IELTS类型的问题
 */
export async function processPdfWithGemini(
  pdfContent: string,
  title: string,
  difficulty: string,
  topic: string
): Promise<ProcessedContent> {
  // 检查环境变量
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    throw new Error('环境变量中未设置Gemini API密钥')
  }

  try {
    // 初始化Gemini客户端
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    // 准备提示词
    const prompt = `
      我需要你帮我将以下内容处理成IELTS阅读理解测试，标题是: "${title}"，
      难度级别: "${difficulty}"，主题是: "${topic}"。
      
      请执行以下操作:
      1. 清理文本，删除任何不必要的页码、页眉页脚等
      2. 格式化文本为易于阅读的段落
      3. 基于文本内容生成5个IELTS风格的问题，包括:
         - 1-2个多选题
         - 1-2个判断题(True/False/Not Given)
         - 1-2个填空题
      4. 每个问题提供详细解释和正确答案
      
      以JSON格式输出，包含两个主要部分:
      {
        "content": "格式化后的文章内容",
        "questions": [
          {
            "type": "multiple_choice 或 true_false_ng 或 fill_blank",
            "questionText": "问题文本",
            "options": "用|分隔的选项（仅多选题需要）",
            "correctAnswer": "正确答案",
            "explanation": "答案解释"
          },
          // 更多问题...
        ]
      }
      
      这是要处理的PDF内容:
      ${pdfContent.slice(0, 10000)} // 限制内容长度避免超出token限制
    `

    // 调用API处理内容
    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    // 处理响应
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('无法从响应中提取JSON')
      }
      
      const parsedData = JSON.parse(jsonMatch[0]) as unknown
      
      // 验证返回的数据格式
      if (
        typeof parsedData === 'object' && 
        parsedData !== null && 
        'content' in parsedData && 
        typeof (parsedData as any).content === 'string' &&
        'questions' in parsedData && 
        Array.isArray((parsedData as any).questions)
      ) {
        return parsedData as ProcessedContent
      } else {
        throw new Error('返回的数据格式无效')
      }
    } catch (err) {
      console.error('解析Gemini响应时出错:', err)
      
      // 返回一个基本的处理内容
      return {
        content: pdfContent.slice(0, 5000), // 截取部分内容
        questions: [
          {
            type: 'multiple_choice',
            questionText: '无法生成问题，请手动添加问题。',
            options: 'A|B|C|D',
            correctAnswer: 'A',
            explanation: '请提供正确解释。'
          }
        ]
      }
    }
  } catch (error) {
    console.error('调用Gemini API时出错:', error)
    throw new Error('处理PDF内容时出错')
  }
} 