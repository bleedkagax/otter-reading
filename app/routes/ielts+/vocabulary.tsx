import { useState } from 'react'
import { Form, useLoaderData } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '#app/utils/router-helpers'
import { format } from 'date-fns'
import { IeltsVocabulary, IELTS_ROUTES } from './_shared/types'

// 状态类型
const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '学习中' },
  { value: 'mastered', label: '已掌握' },
  { value: 'difficult', label: '困难' }
]

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request)
  
  // 获取URL参数
  const url = new URL(request.url)
  const status = url.searchParams.get('status') || 'all'
  const search = url.searchParams.get('search') || ''
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = 50
  const skip = (page - 1) * limit
  
  // 构建查询条件
  const where = {
    userId,
    ...(status !== 'all' ? { status } : {}),
    ...(search ? { word: { contains: search } } : {})
  }
  
  // 获取词汇列表
  const vocabularies = await prisma.ieltsUserVocabulary.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    skip,
    take: limit,
    include: {
      passage: {
        select: {
          id: true,
          title: true
        }
      }
    }
  })
  
  // 获取总数
  const totalCount = await prisma.ieltsUserVocabulary.count({ where })
  
  // 统计信息
  const stats = await prisma.$transaction([
    prisma.ieltsUserVocabulary.count({ where: { userId, status: 'active' } }),
    prisma.ieltsUserVocabulary.count({ where: { userId, status: 'mastered' } }),
    prisma.ieltsUserVocabulary.count({ where: { userId, status: 'difficult' } }),
    prisma.ieltsUserVocabulary.count({ where: { userId } })
  ])
  
  return json({
    vocabularies,
    totalCount,
    stats: {
      active: stats[0],
      mastered: stats[1],
      difficult: stats[2],
      total: stats[3]
    },
    page,
    status,
    search,
    totalPages: Math.ceil(totalCount / limit)
  })
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const intent = formData.get('intent') as string
  
  if (intent === 'updateStatus') {
    const id = formData.get('id') as string
    const status = formData.get('status') as string
    
    if (!id || !status) {
      return json({ success: false, error: '参数错误' }, { status: 400 })
    }
    
    // 验证是否是用户的单词
    const vocab = await prisma.ieltsUserVocabulary.findFirst({
      where: { id, userId }
    })
    
    if (!vocab) {
      return json({ success: false, error: '单词不存在或无权限' }, { status: 403 })
    }
    
    // 更新状态
    await prisma.ieltsUserVocabulary.update({
      where: { id },
      data: { status }
    })
    
    return json({ success: true })
  }
  
  if (intent === 'delete') {
    const id = formData.get('id') as string
    
    if (!id) {
      return json({ success: false, error: '参数错误' }, { status: 400 })
    }
    
    // 验证是否是用户的单词
    const vocab = await prisma.ieltsUserVocabulary.findFirst({
      where: { id, userId }
    })
    
    if (!vocab) {
      return json({ success: false, error: '单词不存在或无权限' }, { status: 403 })
    }
    
    // 删除单词
    await prisma.ieltsUserVocabulary.delete({
      where: { id }
    })
    
    return json({ success: true })
  }
  
  if (intent === 'updateNote') {
    const id = formData.get('id') as string
    const note = formData.get('note') as string
    
    if (!id) {
      return json({ success: false, error: '参数错误' }, { status: 400 })
    }
    
    // 验证是否是用户的单词
    const vocab = await prisma.ieltsUserVocabulary.findFirst({
      where: { id, userId }
    })
    
    if (!vocab) {
      return json({ success: false, error: '单词不存在或无权限' }, { status: 403 })
    }
    
    // 更新笔记
    await prisma.ieltsUserVocabulary.update({
      where: { id },
      data: { note }
    })
    
    return json({ success: true })
  }
  
  return json({ success: false, error: '未知操作' }, { status: 400 })
}

// 使用共享类型定义
interface VocabularyWithPassage extends IeltsVocabulary {
  passage: {
    id: string;
    title: string | null;
  } | null;
}

export default function VocabularyPage() {
  const { 
    vocabularies, 
    stats,
    totalCount, 
    page, 
    status, 
    search, 
    totalPages 
  } = useLoaderData<typeof loader>()
  
  const [selectedVocab, setSelectedVocab] = useState<string | null>(null)
  const [editNote, setEditNote] = useState<{id: string, note: string} | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortMethod, setSortMethod] = useState<'date' | 'word'>('date')

  // 根据搜索词过滤词汇
  const filteredVocabulary = vocabularies.filter((item: VocabularyWithPassage) => 
    item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.note && item.note.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // 根据排序方法排序词汇
  const sortedVocabulary = [...filteredVocabulary].sort((a: VocabularyWithPassage, b: VocabularyWithPassage) => {
    if (sortMethod === 'date') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    } else {
      return a.word.localeCompare(b.word)
    }
  })
  
  // 生成分页链接
  const getPaginationLink = (p: number) => {
    const searchParams = new URLSearchParams()
    if (status !== 'all') searchParams.set('status', status)
    if (search) searchParams.set('search', search)
    searchParams.set('page', p.toString())
    return `?${searchParams.toString()}`
  }
  
  // 提交笔记更新
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editNote) return
    
    try {
      const formData = new FormData()
      formData.append('intent', 'updateNote')
      formData.append('id', editNote.id)
      formData.append('note', editNote.note)
      
      await fetch('/ielts/vocabulary', {
        method: 'POST',
        body: formData
      })
      
      setEditNote(null)
    } catch (error) {
      console.error('保存笔记出错:', error)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">我的生词本</h1>
            <p className="text-gray-600 mt-1">管理你的IELTS学习词汇</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="即时搜索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <select
              value={sortMethod}
              onChange={(e) => setSortMethod(e.target.value as 'date' | 'word')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="date">按添加日期排序</option>
              <option value="word">按字母排序</option>
            </select>
          </div>
          
          <Form className="mt-4 md:mt-0 flex gap-2">
            <input
              type="text"
              name="search"
              placeholder="搜索单词..."
              defaultValue={search}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <select
              name="status"
              defaultValue={status}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              筛选
            </button>
          </Form>
        </div>
        
        {/* 统计信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-sm text-gray-500">总单词数</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-sm text-gray-500">学习中</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.active}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-sm text-gray-500">已掌握</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.mastered}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-sm text-gray-500">困难单词</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.difficult}</p>
          </div>
        </div>
        
        {/* 单词列表 */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {sortedVocabulary.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-lg font-medium">没有找到单词</p>
                <p className="mt-1">尝试更改搜索条件或添加新单词</p>
                <div className="mt-6">
                  <a
                    href={IELTS_ROUTES.passages}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    浏览文章添加生词
                  </a>
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单词</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">上下文</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">来源</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">笔记</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedVocabulary.map((vocab) => (
                    <tr key={vocab.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{vocab.word}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(vocab.createdAt), 'yyyy-MM-dd')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          ...{vocab.context}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {vocab.passage ? (
                          <a 
                            href={IELTS_ROUTES.passageRead(vocab.passage.id)}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {vocab.passage.title}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-500">未知来源</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Form method="post" className="inline">
                          <input type="hidden" name="intent" value="updateStatus" />
                          <input type="hidden" name="id" value={vocab.id} />
                          <select
                            name="status"
                            defaultValue={vocab.status}
                            onChange={(e) => e.target.form?.submit()}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              vocab.status === 'active' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              vocab.status === 'mastered' ? 'bg-green-100 text-green-800 border border-green-300' :
                              'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            <option value="active">学习中</option>
                            <option value="mastered">已掌握</option>
                            <option value="difficult">困难</option>
                          </select>
                        </Form>
                      </td>
                      <td className="px-6 py-4">
                        {editNote?.id === vocab.id ? (
                          <form onSubmit={handleNoteSubmit} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editNote.note}
                              onChange={(e) => setEditNote({ ...editNote, note: e.target.value })}
                              className="px-2 py-1 text-sm border border-gray-300 rounded w-full"
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                            >
                              保存
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditNote(null)}
                              className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                            >
                              取消
                            </button>
                          </form>
                        ) : (
                          <div 
                            onClick={() => setEditNote({ id: vocab.id, note: vocab.note || '' })}
                            className="text-sm text-gray-600 cursor-pointer hover:text-blue-600"
                            title="点击编辑笔记"
                          >
                            {vocab.note || <span className="text-gray-400 italic">添加笔记...</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <a
                            href={`https://dictionary.cambridge.org/dictionary/english/${vocab.word}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gray-700"
                            title="查看词典"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          <Form method="post" className="inline">
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="id" value={vocab.id} />
                            <button
                              type="submit"
                              className="text-red-500 hover:text-red-700"
                              title="删除"
                              onClick={(e) => {
                                if (!confirm('确定要删除这个单词吗？')) {
                                  e.preventDefault()
                                }
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </Form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {/* 分页 */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                共 {totalCount} 个单词，当前第 {page} 页，共 {totalPages} 页
              </div>
              <div className="flex space-x-1">
                {page > 1 && (
                  <a
                    href={getPaginationLink(page - 1)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    上一页
                  </a>
                )}
                {page < totalPages && (
                  <a
                    href={getPaginationLink(page + 1)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    下一页
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 