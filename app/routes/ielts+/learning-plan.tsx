import { useState } from 'react'
import { json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from '#app/utils/router-helpers'
import { useLoaderData, useActionData, useFetcher } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { format, addDays, parseISO } from 'date-fns'
import { useTheme } from '#app/routes/resources+/theme-switch'

interface LearningPlan {
  id: string
  name: string
  description: string | null
  startDate: Date
  endDate: Date
  goalScore: number
  userId: string
  createdAt: Date
  updatedAt: Date
  tasks: LearningTask[]
}

interface LearningTask {
  id: string
  title: string
  description: string | null
  dueDate: Date
  completed: boolean
  learningPlanId: string
  passageId: string | null
  taskType: string
  createdAt: Date
  updatedAt: Date
  passage?: {
    id: string
    title: string
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request)
  
  // Get user's learning plans
  const learningPlans = await prisma.ieltsLearningPlan.findMany({
    where: { userId },
    include: {
      tasks: {
        include: {
          passage: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: { dueDate: 'asc' }
      }
    },
    orderBy: { startDate: 'desc' }
  })
  
  // Get passages for creating new tasks
  const passages = await prisma.ieltsPassage.findMany({
    select: {
      id: true,
      title: true,
      difficulty: true
    },
    orderBy: { title: 'asc' }
  })
  
  // Get user stats
  const stats = await prisma.$transaction([
    prisma.ieltsAttempt.count({ where: { userId } }),
    prisma.ieltsAttempt.count({ where: { userId, isTest: true } }),
    prisma.ieltsUserVocabulary.count({ where: { userId } }),
    prisma.ieltsLearningTask.count({ where: { learningPlan: { userId } } }),
    prisma.ieltsLearningTask.count({ where: { learningPlan: { userId }, completed: true } })
  ])
  
  return json({
    learningPlans,
    passages,
    stats: {
      totalAttempts: stats[0],
      totalTests: stats[1],
      totalVocabulary: stats[2],
      totalTasks: stats[3],
      completedTasks: stats[4]
    }
  })
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const intent = formData.get('intent') as string
  
  if (intent === 'createPlan') {
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string
    const goalScore = Number(formData.get('goalScore'))
    
    if (!name || !startDate || !endDate || !goalScore) {
      return json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    try {
      const plan = await prisma.ieltsLearningPlan.create({
        data: {
          name,
          description,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          goalScore,
          userId
        }
      })
      
      return json({ success: true, plan })
    } catch (error) {
      console.error('Error creating learning plan:', error)
      return json({ error: 'Failed to create learning plan' }, { status: 500 })
    }
  }
  
  if (intent === 'createTask') {
    const planId = formData.get('planId') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const dueDate = formData.get('dueDate') as string
    const taskType = formData.get('taskType') as string
    const passageId = formData.get('passageId') as string
    
    if (!planId || !title || !dueDate || !taskType) {
      return json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Verify the plan belongs to the user
    const plan = await prisma.ieltsLearningPlan.findUnique({
      where: {
        id: planId,
        userId
      }
    })
    
    if (!plan) {
      return json({ error: 'Learning plan not found' }, { status: 404 })
    }
    
    try {
      const task = await prisma.ieltsLearningTask.create({
        data: {
          title,
          description,
          dueDate: new Date(dueDate),
          taskType,
          passageId: passageId || null,
          learningPlanId: planId,
          completed: false
        }
      })
      
      return json({ success: true, task })
    } catch (error) {
      console.error('Error creating task:', error)
      return json({ error: 'Failed to create task' }, { status: 500 })
    }
  }
  
  if (intent === 'toggleTaskCompletion') {
    const taskId = formData.get('taskId') as string
    const completed = formData.get('completed') === 'true'
    
    if (!taskId) {
      return json({ error: 'Missing task ID' }, { status: 400 })
    }
    
    // Verify the task belongs to the user
    const task = await prisma.ieltsLearningTask.findUnique({
      where: {
        id: taskId
      },
      include: {
        learningPlan: true
      }
    })
    
    if (!task || task.learningPlan.userId !== userId) {
      return json({ error: 'Task not found' }, { status: 404 })
    }
    
    try {
      const updatedTask = await prisma.ieltsLearningTask.update({
        where: { id: taskId },
        data: { completed: !completed }
      })
      
      return json({ success: true, task: updatedTask })
    } catch (error) {
      console.error('Error updating task:', error)
      return json({ error: 'Failed to update task' }, { status: 500 })
    }
  }
  
  if (intent === 'deletePlan') {
    const planId = formData.get('planId') as string
    
    if (!planId) {
      return json({ error: 'Missing plan ID' }, { status: 400 })
    }
    
    // Verify the plan belongs to the user
    const plan = await prisma.ieltsLearningPlan.findUnique({
      where: {
        id: planId,
        userId
      }
    })
    
    if (!plan) {
      return json({ error: 'Learning plan not found' }, { status: 404 })
    }
    
    try {
      // Delete all tasks first
      await prisma.ieltsLearningTask.deleteMany({
        where: { learningPlanId: planId }
      })
      
      // Then delete the plan
      await prisma.ieltsLearningPlan.delete({
        where: { id: planId }
      })
      
      return json({ success: true })
    } catch (error) {
      console.error('Error deleting learning plan:', error)
      return json({ error: 'Failed to delete learning plan' }, { status: 500 })
    }
  }
  
  return json({ error: 'Invalid intent' }, { status: 400 })
}

export default function LearningPlanPage() {
  const { learningPlans, passages, stats } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const theme = useTheme()
  const [showNewPlanForm, setShowNewPlanForm] = useState(false)
  const [showNewTaskForm, setShowNewTaskForm] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const planFetcher = useFetcher()
  const taskFetcher = useFetcher()
  const completionFetcher = useFetcher()
  
  // Format date for input fields
  const formatDateForInput = (date: Date) => {
    return format(new Date(date), 'yyyy-MM-dd')
  }
  
  // Get today's date formatted for input
  const today = formatDateForInput(new Date())
  
  // Get date 30 days from now formatted for input
  const thirtyDaysFromNow = formatDateForInput(addDays(new Date(), 30))
  
  // Handle creating a new plan
  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    
    planFetcher.submit(
      {
        intent: 'createPlan',
        name: form.name.value,
        description: form.description.value,
        startDate: form.startDate.value,
        endDate: form.endDate.value,
        goalScore: form.goalScore.value
      },
      { method: 'post' }
    )
    
    // Reset form and hide it
    form.reset()
    setShowNewPlanForm(false)
  }
  
  // Handle creating a new task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    
    taskFetcher.submit(
      {
        intent: 'createTask',
        planId: selectedPlanId as string,
        title: form.title.value,
        description: form.description.value,
        dueDate: form.dueDate.value,
        taskType: form.taskType.value,
        passageId: form.passageId.value
      },
      { method: 'post' }
    )
    
    // Reset form and hide it
    form.reset()
    setShowNewTaskForm(false)
  }
  
  // Handle toggling task completion
  const handleToggleTaskCompletion = (taskId: string, completed: boolean) => {
    completionFetcher.submit(
      {
        intent: 'toggleTaskCompletion',
        taskId,
        completed: completed.toString()
      },
      { method: 'post' }
    )
  }
  
  // Handle deleting a plan
  const handleDeletePlan = (planId: string) => {
    if (confirm('确定要删除这个学习计划吗？所有相关任务也将被删除。')) {
      planFetcher.submit(
        {
          intent: 'deletePlan',
          planId
        },
        { method: 'post' }
      )
    }
  }
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">学习计划</h1>
          <p className="text-muted-foreground">
            制定和跟踪您的IELTS阅读学习计划
          </p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <button
            onClick={() => setShowNewPlanForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            创建新计划
          </button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card text-card-foreground p-4 rounded-lg shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">总练习次数</p>
          <p className="text-2xl font-bold">{stats.totalAttempts}</p>
        </div>
        <div className="bg-card text-card-foreground p-4 rounded-lg shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">测试次数</p>
          <p className="text-2xl font-bold">{stats.totalTests}</p>
        </div>
        <div className="bg-card text-card-foreground p-4 rounded-lg shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">词汇量</p>
          <p className="text-2xl font-bold">{stats.totalVocabulary}</p>
        </div>
        <div className="bg-card text-card-foreground p-4 rounded-lg shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">任务完成率</p>
          <p className="text-2xl font-bold">
            {stats.totalTasks > 0
              ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
              : 0}%
          </p>
        </div>
      </div>
      
      {/* New Plan Form */}
      {showNewPlanForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">创建新学习计划</h2>
            
            <form onSubmit={handleCreatePlan}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    计划名称 *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="例如：IELTS阅读备考计划"
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">
                    计划描述
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="描述您的学习目标和计划..."
                  ></textarea>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium mb-1">
                      开始日期 *
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      required
                      defaultValue={today}
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium mb-1">
                      结束日期 *
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      required
                      defaultValue={thirtyDaysFromNow}
                      className="w-full px-3 py-2 border border-border rounded-md"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="goalScore" className="block text-sm font-medium mb-1">
                    目标分数 *
                  </label>
                  <select
                    id="goalScore"
                    name="goalScore"
                    required
                    className="w-full px-3 py-2 border border-border rounded-md"
                  >
                    <option value="6">6分</option>
                    <option value="6.5">6.5分</option>
                    <option value="7">7分</option>
                    <option value="7.5">7.5分</option>
                    <option value="8">8分</option>
                    <option value="8.5">8.5分</option>
                    <option value="9">9分</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewPlanForm(false)}
                  className="px-4 py-2 border border-border rounded-md hover:bg-muted"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  创建计划
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* New Task Form */}
      {showNewTaskForm && selectedPlanId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card text-card-foreground rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">添加新任务</h2>
            
            <form onSubmit={handleCreateTask}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium mb-1">
                    任务名称 *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="例如：完成一篇阅读练习"
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">
                    任务描述
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={2}
                    className="w-full px-3 py-2 border border-border rounded-md"
                    placeholder="描述任务详情..."
                  ></textarea>
                </div>
                
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium mb-1">
                    截止日期 *
                  </label>
                  <input
                    type="date"
                    id="dueDate"
                    name="dueDate"
                    required
                    defaultValue={today}
                    className="w-full px-3 py-2 border border-border rounded-md"
                  />
                </div>
                
                <div>
                  <label htmlFor="taskType" className="block text-sm font-medium mb-1">
                    任务类型 *
                  </label>
                  <select
                    id="taskType"
                    name="taskType"
                    required
                    className="w-full px-3 py-2 border border-border rounded-md"
                  >
                    <option value="reading">阅读练习</option>
                    <option value="test">模拟测试</option>
                    <option value="vocabulary">词汇学习</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="passageId" className="block text-sm font-medium mb-1">
                    关联文章（可选）
                  </label>
                  <select
                    id="passageId"
                    name="passageId"
                    className="w-full px-3 py-2 border border-border rounded-md"
                  >
                    <option value="">-- 不关联文章 --</option>
                    {passages.map(passage => (
                      <option key={passage.id} value={passage.id}>
                        {passage.title} ({passage.difficulty})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewTaskForm(false)}
                  className="px-4 py-2 border border-border rounded-md hover:bg-muted"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  添加任务
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Learning Plans */}
      {learningPlans.length === 0 ? (
        <div className="bg-card text-card-foreground rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">还没有学习计划</h2>
          <p className="text-muted-foreground mb-6">
            创建一个学习计划来帮助您组织IELTS阅读备考。
          </p>
          <button
            onClick={() => setShowNewPlanForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            创建新计划
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {learningPlans.map(plan => (
            <div key={plan.id} className="bg-card text-card-foreground rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-border">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(plan.startDate), 'yyyy/MM/dd')} - {format(new Date(plan.endDate), 'yyyy/MM/dd')}
                      {' · '}目标分数: {plan.goalScore}
                    </p>
                  </div>
                  
                  <div className="mt-4 md:mt-0 flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setSelectedPlanId(plan.id)
                        setShowNewTaskForm(true)
                      }}
                      className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                      添加任务
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700"
                    >
                      删除计划
                    </button>
                  </div>
                </div>
                
                {plan.description && (
                  <p className="mt-3 text-sm">{plan.description}</p>
                )}
                
                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>进度</span>
                    <span>
                      {plan.tasks.filter(t => t.completed).length}/{plan.tasks.length} 任务完成
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${plan.tasks.length > 0
                          ? Math.round((plan.tasks.filter(t => t.completed).length / plan.tasks.length) * 100)
                          : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              {/* Tasks */}
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">任务列表</h3>
                
                {plan.tasks.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">还没有任务</p>
                    <button
                      onClick={() => {
                        setSelectedPlanId(plan.id)
                        setShowNewTaskForm(true)
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                      添加第一个任务
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {plan.tasks.map(task => (
                      <div
                        key={task.id}
                        className={`p-4 rounded-lg border ${
                          task.completed
                            ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                            : new Date(task.dueDate) < new Date()
                              ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                              : 'border-border bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0 pt-0.5">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => handleToggleTaskCompletion(task.id, task.completed)}
                              className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </div>
                          
                          <div className="ml-3 flex-1">
                            <div className="flex flex-col sm:flex-row sm:justify-between">
                              <div>
                                <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className={`text-sm mt-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                    {task.description}
                                  </p>
                                )}
                              </div>
                              
                              <div className="mt-2 sm:mt-0 text-sm text-muted-foreground">
                                <span className={`${
                                  new Date(task.dueDate) < new Date() && !task.completed
                                    ? 'text-red-600 dark:text-red-400'
                                    : ''
                                }`}>
                                  截止: {format(new Date(task.dueDate), 'yyyy/MM/dd')}
                                </span>
                                
                                <div className="mt-1 flex items-center">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted">
                                    {task.taskType === 'reading' ? '阅读练习' :
                                     task.taskType === 'test' ? '模拟测试' :
                                     task.taskType === 'vocabulary' ? '词汇学习' : '其他'}
                                  </span>
                                  
                                  {task.passage && (
                                    <a
                                      href={`/ielts/passages/${task.passage.id}/read`}
                                      className="ml-2 text-xs text-primary hover:underline"
                                    >
                                      {task.passage.title}
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
