// 导入必要的依赖
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';

// 定义问题类型
interface IeltsQuestion {
  type: string;
  questionText: string;
  options: string | null;
  correctAnswer: string;
  explanation: string;
}

// 定义处理后的内容结构
interface ProcessedContent {
  content: string;
  questions: IeltsQuestion[];
  title?: string;
  summary?: string;
  difficulty?: string;
  wordCount?: number;
  vocabulary?: string[];
}

// 定义生成选项
interface GenerateOptions {
  topic: string;
  difficulty: string;
  wordCount: number;
  questionTypes?: string[];
}

// 使用 Zod 定义输出解析器的模式
const ieltsContentSchema = z.object({
  title: z.string().describe("文章标题"),
  content: z.string().describe("完整的文章内容"),
  summary: z.string().describe("文章的简短摘要，100-150字"),
  difficulty: z.string().describe("难度评估（easy, medium, hard）"),
  wordCount: z.number().describe("文章的词数"),
  vocabulary: z.array(z.string()).describe("重要词汇列表"),
  questions: z.array(z.object({
    type: z.string().describe("问题类型：multiple_choice, true_false_ng, 或 fill_blank"),
    questionText: z.string().describe("问题文本"),
    options: z.string().nullable().describe("用|分隔的选项（仅多选题需要）"),
    correctAnswer: z.string().describe("正确答案"),
    explanation: z.string().describe("答案解释")
  })).describe("问题列表")
});

/**
 * 使用 Gemini 生成 IELTS 阅读内容
 */
export async function generateIeltsContent(options: GenerateOptions): Promise<ProcessedContent> {
  console.log('开始生成 IELTS 内容...');

  // 检查环境变量
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('检查 Gemini API 密钥:', apiKey ? '密钥存在' : '密钥不存在');

  if (apiKey) {
    console.log('GEMINI_API_KEY 前缀:', apiKey.substring(0, 5) + '...');
    console.log('GEMINI_API_KEY 长度:', apiKey.length);
  }

  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    throw new Error('环境变量中未设置有效的 Gemini API 密钥，请在系统环境变量或 .env 文件中设置 GEMINI_API_KEY');
  }

  try {
    console.log('初始化 LangChain Gemini 模型...');

    // 创建 LangChain Gemini 模型
    const model = new ChatGoogleGenerativeAI({
      apiKey: apiKey,
      modelName: 'gemini-pro',
      maxOutputTokens: 4096,
      temperature: 0.7,
      apiVersion: 'v1', // 使用最新的 v1 API 版本
    });

    console.log('LangChain Gemini 模型初始化成功');

    // 创建输出解析器
    const outputParser = StructuredOutputParser.fromZodSchema(ieltsContentSchema);
    const formatInstructions = outputParser.getFormatInstructions();

    // 创建提示词模板
    const promptTemplate = PromptTemplate.fromTemplate(`
      请你作为一个专业的IELTS阅读测试出题专家，生成一篇真实的IELTS阅读文章和配套的问题。

      主题: {topic}
      难度: {difficulty}
      词数: 大约 {wordCount} 词

      请生成一篇原创的、符合IELTS考试风格的阅读文章，内容要真实、有深度、有教育意义。
      文章应该包含事实、数据、观点等，语言要正式、学术化，符合IELTS考试的标准。

      请为文章创建10个IELTS风格的问题，包括：
      - 多项选择题（multiple_choice）
      - 判断题（true_false_ng）
      - 填空题（fill_blank）

      请提取文章中的15-20个重要词汇，这些词汇应该是IELTS考试中常见的高级词汇。

      {format_instructions}
    `);

    // 准备提示词
    const prompt = await promptTemplate.format({
      topic: options.topic,
      difficulty: options.difficulty,
      wordCount: options.wordCount,
      format_instructions: formatInstructions,
    });

    console.log('开始调用 Gemini API 生成内容...');

    // 调用 API 生成内容
    const response = await model.invoke(prompt);
    console.log('Gemini API 调用成功');

    // 解析响应
    console.log('开始解析响应...');
    try {
      // 将响应内容转换为字符串
      const responseText = response.content.toString();
      console.log('响应文本前100个字符:', responseText.substring(0, 100));

      // 使用输出解析器解析响应
      const parsedOutput = await outputParser.parse(responseText);
      console.log('响应解析成功');

      return parsedOutput as ProcessedContent;
    } catch (parseError) {
      console.error('解析响应失败:', parseError);

      // 尝试从响应中提取 JSON
      const responseText = response.content.toString();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        console.log('找到 JSON 字符串，尝试手动解析');
        try {
          const manualParsedData = JSON.parse(jsonMatch[0]);
          console.log('手动 JSON 解析成功');

          // 验证数据结构
          if (
            typeof manualParsedData === 'object' &&
            manualParsedData !== null &&
            'content' in manualParsedData &&
            'questions' in manualParsedData &&
            Array.isArray(manualParsedData.questions)
          ) {
            return manualParsedData as ProcessedContent;
          } else {
            throw new Error('返回的数据格式无效');
          }
        } catch (jsonError) {
          console.error('手动 JSON 解析失败:', jsonError);
          throw new Error(`解析 Gemini 响应失败: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
        }
      } else {
        throw new Error('无法从响应中提取 JSON');
      }
    }
  } catch (error) {
    console.error('调用 Gemini API 时出错:', error);

    // 提供更详细的错误信息
    if (error instanceof Error) {
      throw new Error(`生成 IELTS 内容时出错: ${error.message}`);
    } else {
      throw new Error(`生成 IELTS 内容时出错: ${String(error)}`);
    }
  }
}
