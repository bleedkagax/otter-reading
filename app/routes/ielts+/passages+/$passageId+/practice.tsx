import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '#app/utils/router-helpers'
import { useActionData, useLoaderData } from 'react-router'
import { getUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { ReadingPracticeView } from '#app/components/ielts/ReadingPracticeView'

interface HighlightedSection {
  start: number
  end: number
  color: string
  text: string
  paragraphIndex: number
  textOffset: number
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await getUserId(request)
  if (!userId) {
    return redirect('/login?redirectTo=/ielts/passages')
  }
  
  const passageId = params.passageId
  if (!passageId) {
    return redirect('/ielts/passages')
  }
  
  // 查找文章
  const passage = await prisma.ieltsPassage.findUnique({
    where: { id: passageId },
    include: {
      questions: {
        orderBy: { orderIndex: 'asc' }
      }
    }
  })
  
  if (!passage) {
    return redirect('/ielts/passages')
  }
  
  // 查找用户之前的测试结果
  const previousAttempts = await prisma.ieltsAttempt.findMany({
    where: {
      userId,
      passageId,
      completedAt: { not: null },
    },
    orderBy: {
      completedAt: 'desc'
    },
    take: 4 // 只取最近的4次结果
  })
  
  // 查找用户对本文章的标记
  const userVocabulary = await prisma.ieltsUserVocabulary.findMany({
    where: {
      userId,
      passageId
    }
  })
  
  // 将用户词汇转换为高亮
  const highlights = userVocabulary.map(vocab => {
    // 尝试从note字段解析位置信息
    let paragraphIndex: number | undefined = undefined;
    let textOffset: number | undefined = undefined;
    
    if (vocab.note) {
      try {
        const positionData = JSON.parse(vocab.note);
        if (positionData && typeof positionData === 'object') {
          paragraphIndex = positionData.paragraphIndex;
          textOffset = positionData.textOffset;
        }
      } catch (e) {
        console.error('Error parsing position data:', e);
      }
    }
    
    return {
      start: 0,
      end: 0,
      color: vocab.mastered ? '#A5D6A780' : '#FFEB3B80', // 已掌握的词用绿色，未掌握的词用黄色
      text: vocab.word,
      paragraphIndex: paragraphIndex || 0,
      textOffset: textOffset || 0
    };
  })
  
  // 创建测试结果数据
  const testResults = previousAttempts.map(attempt => {
    return {
      id: attempt.id,
      score: attempt.totalScore || 0,
      parts: [{
        id: 'part-1',
        name: 'Part1',
        questions: [],
        score: attempt.responses?.filter(r => r.isCorrect).length || 0,
        totalQuestions: passage.questions.length
      }]
    }
  })
  
  // 转换问题为组件所需格式
  const parts = [{
    id: 'part-1',
    name: 'Part1',
    questions: passage.questions.map(q => {
      // 解析选项JSON（如果存在）
      let options: string[] = []
      if (q.type.includes('multiple-choice') && q.options) {
        try {
          options = JSON.parse(q.options)
        } catch (e) {
          console.error('Error parsing question options:', e)
        }
      }
      
      // 映射问题类型
      let questionType = 'fillblank'
      if (q.type.includes('multiple-choice')) {
        questionType = 'multichoice'
      } else if (q.type.includes('true-false')) {
        questionType = 'truefalse'
      } else if (q.type.includes('matching')) {
        questionType = 'matching'
      }
      
      return {
        id: q.orderIndex,
        text: q.questionText,
        type: questionType,
        options: options,
        answer: q.correctAnswer
      }
    })
  }]
  
  return json({
    passage,
    parts,
    testResults,
    highlights
  })
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await getUserId(request)
  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const passageId = params.passageId
  if (!passageId) {
    return json({ error: 'No passage ID provided' }, { status: 400 })
  }
  
  const formData = await request.formData()
  const intent = formData.get('intent') as string
  
  // 处理添加高亮/生词
  if (intent === 'add_highlight') {
    const text = formData.get('text') as string
    const color = formData.get('color') as string
    const context = formData.get('context') as string | null
    
    // 获取位置信息
    const paragraphIndex = parseInt(formData.get('paragraphIndex') as string) || 0
    const textOffset = parseInt(formData.get('textOffset') as string) || 0
    
    if (!text) {
      return json({ error: 'No text provided' }, { status: 400 })
    }
    
    try {
      // 将位置信息存储在note字段中
      const positionData = JSON.stringify({
        paragraphIndex,
        textOffset
      })
      
      // 保存到用户词汇表
      await prisma.ieltsUserVocabulary.create({
        data: {
          userId,
          passageId,
          word: text,
          context: context || undefined,
          note: positionData,  // 保存位置信息
          mastered: color.includes('green'), // 绿色表示已掌握
          createdAt: new Date()
        }
      })
      
      return json({ 
        success: true, 
        message: `Added "${text}" to vocabulary at paragraph ${paragraphIndex}, offset ${textOffset}` 
      })
    } catch (error) {
      console.error('Error saving highlighted word:', error)
      return json({ error: 'Failed to save highlight' }, { status: 500 })
    }
  }
  
  // 处理提交答案
  if (intent === 'submit_answers') {
    const answers = JSON.parse(formData.get('answers') as string)
    
    // 查找文章和问题
    const passage = await prisma.ieltsPassage.findUnique({
      where: { id: passageId },
      include: {
        questions: true
      }
    })
    
    if (!passage) {
      return json({ error: 'Passage not found' }, { status: 404 })
    }
    
    // 创建新的尝试记录
    const attempt = await prisma.ieltsAttempt.create({
      data: {
        userId,
        passageId,
        startedAt: new Date(),
        completedAt: new Date(),
        isTest: false
      }
    })
    
    // 计算分数
    let correctCount = 0
    const questionResponses = []
    
    // 处理每个答案
    for (const questionIdx in answers) {
      const userAnswer = answers[questionIdx]
      const question = passage.questions.find(q => q.orderIndex === parseInt(questionIdx))
      
      if (question) {
        const isCorrect = question.correctAnswer.toLowerCase() === userAnswer.toLowerCase()
        if (isCorrect) correctCount++
        
        // 创建答案记录
        questionResponses.push({
          attemptId: attempt.id,
          questionId: question.id,
          userAnswer,
          isCorrect
        })
      }
    }
    
    // 批量创建答案记录
    await prisma.ieltsResponse.createMany({
      data: questionResponses
    })
    
    // 更新尝试记录的总分
    const totalScore = Math.round((correctCount / passage.questions.length) * 100)
    await prisma.ieltsAttempt.update({
      where: { id: attempt.id },
      data: {
        totalScore,
        maxScore: passage.questions.length
      }
    })
    
    return json({
      success: true,
      score: totalScore,
      correctCount,
      totalQuestions: passage.questions.length
    })
  }
  
  return json({ error: 'Invalid intent' }, { status: 400 })
}

export default function PassagePracticePage() {
  const { passage, parts, testResults, highlights } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  
  const handleSubmitAnswers = async (answers: Record<number, string>) => {
    // 提交表单
    const form = new FormData()
    form.append('intent', 'submit_answers')
    form.append('answers', JSON.stringify(answers))
    
    // 使用fetch API提交
    await fetch(`/ielts/passages/${passage.id}/practice`, {
      method: 'POST',
      body: form
    })
    
    // 重新加载页面以展示结果
    window.location.href = `/ielts/passages/${passage.id}/practice`
  }
  
  const handleHighlight = async (highlight: HighlightedSection) => {
    // 查找段落上下文，获取包含该文本的完整句子
    let context = ''
    const allText = passage.content
    const paragraphs = allText.split(/\n+/).filter(Boolean)
    
    // 检查段落索引是否有效
    if (highlight.paragraphIndex >= 0 && highlight.paragraphIndex < paragraphs.length) {
      const paragraph = paragraphs[highlight.paragraphIndex]
      
      // 从段落中提取上下文
      const textBefore = paragraph.substring(0, highlight.textOffset).split(/[.!?]\s+/).pop() || ''
      const textAfter = paragraph.substring(highlight.textOffset + highlight.text.length).split(/[.!?]\s+/)[0] || ''
      
      context = (textBefore + highlight.text + textAfter).trim()
    }
    
    // 创建表单数据
    const form = new FormData()
    form.append('intent', 'add_highlight')
    form.append('text', highlight.text)
    form.append('color', highlight.color)
    form.append('paragraphIndex', highlight.paragraphIndex.toString())
    form.append('textOffset', highlight.textOffset.toString())
    if (context) form.append('context', context)
    
    // 提交高亮信息
    await fetch(`/ielts/passages/${passage.id}/practice`, {
      method: 'POST',
      body: form
    })
  }
  
  const handleWordSelect = (word: string) => {
    console.log('Selected word:', word)
    // 可以在这里添加额外的处理逻辑
  }
  
  return (
    <ReadingPracticeView
      title={passage.title}
      content={passage.content}
      parts={parts}
      timeLimit={20}
      wordCount={passage.wordCount}
      difficulty={passage.difficulty}
      topic={passage.topic}
      testResults={testResults}
      highlights={highlights}
      onSubmit={handleSubmitAnswers}
      onHighlight={handleHighlight}
      onWordSelect={handleWordSelect}
    />
  )
} 