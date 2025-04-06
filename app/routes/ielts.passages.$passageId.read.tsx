import { useState } from 'react'
import { useLoaderData } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { PassageReader } from '#app/components/ielts/PassageReader'
import { json, type LoaderFunctionArgs } from '#app/utils/router-helpers'

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireUserId(request)
  
  const passageId = params.passageId
  if (!passageId) throw new Response('需要指定文章ID', { status: 400 })
  
  const passage = await prisma.ieltsPassage.findUnique({
    where: { id: passageId },
  })
  
  if (!passage) throw new Response('文章不存在', { status: 404 })
  
  return json({ passage })
}

export default function ReadPassage() {
  const { passage } = useLoaderData<typeof loader>()
  const [selectedWord, setSelectedWord] = useState('')
  const [wordContext, setWordContext] = useState('')
  
  const handleWordSelect = (word: string, context: string) => {
    setSelectedWord(word)
    setWordContext(context)
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 阅读指导 */}
        <div className="bg-gray-100 border border-gray-200 p-4 mb-6 rounded-md">
          <h2 className="font-bold text-lg">雅思阅读</h2>
          <p className="text-gray-700">仔细阅读文章，你可以通过选择单词添加到生词本或做笔记。</p>
        </div>

        {/* 主内容区 - 左右两栏布局 */}
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
          {/* 左侧阅读文章 */}
          <div className="lg:w-1/2 h-full overflow-hidden flex flex-col bg-white rounded-lg shadow-md">
            <div className="p-6 border-b">
              <h1 className="text-2xl font-bold text-gray-800">{passage.title}</h1>
              <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
                <span>难度: {passage.difficulty}</span>
                <span>单词: {passage.wordCount}</span>
              </div>
            </div>
            
            <div className="overflow-y-auto p-6 flex-grow">
              <PassageReader 
                content={passage.content} 
                showParagraphNumbers={true}
                onWordSelect={handleWordSelect}
              />
            </div>
          </div>

          {/* 右侧笔记和生词区域 */}
          <div className="lg:w-1/2 bg-white rounded-lg shadow-md h-full flex flex-col overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="font-bold text-lg">文章信息</h2>
            </div>
            
            <div className="overflow-y-auto p-6 flex-grow">
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-2">文章概览</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><span className="font-medium">标题:</span> {passage.title}</p>
                  <p><span className="font-medium">主题:</span> {passage.topic}</p>
                  <p><span className="font-medium">难度:</span> {passage.difficulty}</p>
                  <p><span className="font-medium">字数:</span> {passage.wordCount}</p>
                  {passage.source && <p><span className="font-medium">来源:</span> {passage.source}</p>}
                </div>
              </div>
              
              {selectedWord && (
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-2">选中的单词</h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="font-bold text-xl mb-2">{selectedWord}</p>
                    <p className="text-sm text-gray-600">{wordContext}</p>
                    <div className="mt-3 flex gap-2">
                      <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                        添加到生词本
                      </button>
                      <button className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">
                        查看例句
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="font-semibold text-lg mb-2">练习</h3>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p>完成阅读后，你可以尝试相关的练习题来测试理解力。</p>
                  <div className="mt-3">
                    <a 
                      href={`/ielts/passages/${passage.id}/practice`}
                      className="block w-full bg-green-500 text-white text-center px-4 py-2 rounded hover:bg-green-600"
                    >
                      开始练习
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 