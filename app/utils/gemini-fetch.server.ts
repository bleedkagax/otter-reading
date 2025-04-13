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
    console.log('准备调用 Gemini API...');

    // 准备提示词
    const prompt = `
      请你作为一个专业的IELTS阅读测试出题专家，生成一篇真实的IELTS阅读文章和配套的问题。

      主题: ${options.topic}
      难度: ${options.difficulty}
      词数: 大约 ${options.wordCount} 词

      请生成一篇原创的、符合IELTS考试风格的阅读文章，内容要真实、有深度、有教育意义。
      文章应该包含事实、数据、观点等，语言要正式、学术化，符合IELTS考试的标准。

      请为文章创建10个IELTS风格的问题，包括：
      - 多项选择题（multiple_choice）
      - 判断题（true_false_ng）
      - 填空题（fill_blank）

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
    `;

    // 准备请求体
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      }
    };

    console.log('开始调用 Gemini API...');

    // 使用 fetch API 直接调用 Gemini API
    console.log('请求 URL:', `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent`);
    console.log('请求体:', JSON.stringify(requestBody, null, 2));

    // 添加调试信息
    console.log('当前环境变量:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('MOCKS:', process.env.MOCKS);

    // 尝试使用不同的 API 端点
    // 使用 gemini-2.0-flash-live-001 模型，这是一个更新的模型
    // 注意：这个模型支持 bidiGenerateContent 方法，而不是 generateContent 方法
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-live-001:bidiGenerateContent?key=${apiKey}`;

    const response = await fetch(
      apiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log('响应状态:', response.status, response.statusText);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API 调用失败:', response.status, response.statusText, errorText);
      throw new Error(`Gemini API 调用失败: ${response.status} ${response.statusText}`);
    }

    console.log('Gemini API 调用成功');

    const responseData = await response.json();
    console.log('获取到响应数据');

    if (!responseData.candidates || responseData.candidates.length === 0) {
      throw new Error('Gemini API 返回的响应中没有候选项');
    }

    const responseText = responseData.candidates[0].content.parts[0].text;
    console.log('获取到响应文本，长度:', responseText.length);
    console.log('响应文本前100个字符:', responseText.substring(0, 100));

    // 处理响应
    console.log('开始解析响应...');
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('无法从响应中提取 JSON，原始响应:', responseText);
        throw new Error('无法从响应中提取 JSON');
      }

      console.log('找到 JSON 字符串，长度:', jsonMatch[0].length);
      console.log('JSON 字符串前100个字符:', jsonMatch[0].substring(0, 100));

      const parsedData = JSON.parse(jsonMatch[0]);
      console.log('JSON 解析成功');

      // 验证返回的数据格式
      if (
        typeof parsedData === 'object' &&
        parsedData !== null &&
        'content' in parsedData &&
        'questions' in parsedData &&
        Array.isArray(parsedData.questions)
      ) {
        return parsedData as ProcessedContent;
      } else {
        throw new Error('返回的数据格式无效');
      }
    } catch (err) {
      console.error('解析 Gemini 响应时出错:', err);

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
            explanation: '无法生成解释，请重试。'
          }
        ]
      };
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
