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
  title?: string
  summary?: string
  difficulty?: string
  wordCount?: number
  vocabulary?: string[]
}

// 定义生成内容的选项
interface GenerateContentOptions {
  difficulty: string
  topic: string
  questionTypes?: string[]
  wordCount?: number
  includeVocabulary?: boolean
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
      3. 基于文本内容生成5-8个IELTS风格的问题，包括:
         - 2-3个多选题
         - 2-3个判断题(True/False/Not Given)
         - 1-2个填空题
      4. 每个问题提供详细解释和正确答案
      5. 提取文章中的重要词汇（10-15个），这些词汇应该是IELTS考试中常见的高级词汇

      以JSON格式输出，包含以下部分:
      {
        "title": "文章标题",
        "content": "格式化后的文章内容",
        "summary": "文章的简短摘要，100-150字",
        "difficulty": "难度评估（easy, medium, hard）",
        "wordCount": 文章的词数,
        "vocabulary": ["重要词汇1", "重要词汇2", ...],
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

/**
 * 使用Google Gemini API生成全新的IELTS阅读文章和问题
 * 基于给定的主题和难度生成真实的IELTS阅读测试内容
 */
export async function generateIeltsContent(
  options: GenerateContentOptions
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

    // 准备问题类型
    const questionTypes = options.questionTypes || [
      'multiple_choice',
      'true_false_ng',
      'fill_blank'
    ]

    // 准备提示词
    const prompt = `
      请你作为一个专业的IELTS阅读测试出题专家，生成一篇真实的IELTS阅读文章和配套的问题。

      要求如下：
      1. 主题：${options.topic}
      2. 难度级别：${options.difficulty}
      3. 词数：${options.wordCount || '700-900'}左右
      4. 文章风格：学术性，与真实IELTS阅读文章一致
      5. 生成的文章应该是原创的，不要直接复制现有文章
      6. 文章应包含各种高级词汇和语法结构，符合IELTS考试标准

      生成8-10个阅读理解问题，包括：
      - 3-4个多选题（每题提供4个选项）
      - 3-4个判断题（True/False/Not Given）
      - 2个填空题（每题填写一个词或短语）

      每个问题都应该有正确答案和详细解释。问题应该测试不同的阅读技能，如理解主旨、定位细节、推断含义等。

      请提取文章中的15-20个重要词汇，这些词汇应该是IELTS考试中常见的高级词汇。

      请以JSON格式输出，包含以下字段：
      {
        "title": "文章标题",
        "content": "完整的文章内容",
        "summary": "文章的简短摘要，100-150字",
        "difficulty": "难度评估（easy, medium, hard）",
        "wordCount": 文章的词数,
        "vocabulary": ["重要词汇1", "重要词汇2", ...],
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
    `

    // 调用API生成内容
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
        title: `关于${options.topic}的文章`,
        content: '生成内容失败，请重试。',
        summary: '生成内容失败，请重试。',
        difficulty: options.difficulty,
        wordCount: 0,
        vocabulary: [],
        questions: [
          {
            type: 'multiple_choice',
            questionText: '无法生成问题，请重试。',
            options: 'A|B|C|D',
            correctAnswer: 'A',
            explanation: '请提供正确解释。'
          }
        ]
      }
    }
  } catch (error) {
    console.error('调用Gemini API时出错:', error)
    throw new Error('生成IELTS内容时出错')
  }
}