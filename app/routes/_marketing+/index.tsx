import { type Route } from './+types/index.ts'
import { useState } from 'react'

export const meta: Route.MetaFunction = () => [{ title: '雅思阅读训练' }]

// 精选雅思阅读相关词汇
const ieltVocabulary = [
	"academic", "analysis", "approach", "assessment", "challenge",
	"comprehensive", "context", "critical", "demonstrate", "development",
	"environment", "evaluate", "evidence", "factor", "framework"
]

export default function Index() {
	const [hoveredPracticeButton, setHoveredPracticeButton] = useState(false);
	const [hoveredLibraryButton, setHoveredLibraryButton] = useState(false);
	
	return (
		<main className="min-h-screen bg-[#f5f5f5] font-sans overflow-hidden pt-16 pb-20 px-4">			
			<div className="relative max-w-6xl mx-auto">
				{/* 主标题区域 */}
				<div className="text-center max-w-4xl mx-auto mb-16">
					<h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-900 leading-[1.1] mb-8">
						雅思阅读训练
					</h1>
					
					<p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-12">
						提高阅读速度与理解能力，掌握考试技巧，轻松应对雅思阅读各类题型。
					</p>
					
					{/* 直接进入练习的按钮 */}
					<div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
						<a 
							href="/ielts/practice"
							className={`
								inline-block bg-primary text-white font-bold text-xl px-8 py-4 rounded-md
								transition-all duration-300
								${hoveredPracticeButton ? 'transform -translate-y-1 shadow-xl' : 'shadow-lg'}
							`}
							onMouseEnter={() => setHoveredPracticeButton(true)}
							onMouseLeave={() => setHoveredPracticeButton(false)}
						>
							开始练习
						</a>
						<a 
							href="/ielts/passages"
							className={`
								inline-block bg-white text-gray-800 font-bold text-xl px-8 py-4 rounded-md border border-gray-200
								transition-all duration-300
								${hoveredLibraryButton ? 'transform -translate-y-1 shadow-xl' : 'shadow-lg'}
							`}
							onMouseEnter={() => setHoveredLibraryButton(true)}
							onMouseLeave={() => setHoveredLibraryButton(false)}
						>
							浏览文章库
						</a>
					</div>
				</div>
				
				{/* 功能介绍 */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
					{[
						{ 
							title: '精准训练', 
							desc: '根据个人学习情况，提供针对性的阅读练习',
							emoji: '🎯',
							color: 'bg-blue-50',
							link: '/ielts/dashboard'
						},
						{ 
							title: '专业题库', 
							desc: '覆盖雅思阅读所有题型，高质量模拟真实考试环境',
							emoji: '📚',
							color: 'bg-amber-50',
							link: '/ielts/passages'
						},
						{ 
							title: '智能助读', 
							desc: '高效分析文章结构和关键信息，提升理解速度',
							emoji: '💡',
							color: 'bg-green-50',
							link: '/ielts/practice'
						}
					].map((card, index) => (
						<a 
							key={index}
							href={card.link}
							className={`${card.color} p-8 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-100 flex flex-col items-center text-center`}
						>
							<div className="text-4xl mb-4">{card.emoji}</div>
							<h3 className="text-xl font-bold text-gray-900 mb-3">{card.title}</h3>
							<p className="text-gray-600">{card.desc}</p>
						</a>
					))}
				</div>
				
				{/* 特色功能 */}
				<div className="mt-24 max-w-4xl mx-auto">
					<h2 className="text-3xl font-bold text-center mb-12">特色功能</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="bg-white p-6 rounded-lg shadow border border-gray-100">
							<div className="text-2xl font-bold mb-3 flex items-center">
								<span className="text-primary mr-2">📝</span> 模拟真题练习
							</div>
							<p className="text-gray-600">
								提供近年雅思真题阅读材料，让你在实战中掌握解题技巧。
							</p>
						</div>
						
						<div className="bg-white p-6 rounded-lg shadow border border-gray-100">
							<div className="text-2xl font-bold mb-3 flex items-center">
								<span className="text-primary mr-2">⏱️</span> 计时功能
							</div>
							<p className="text-gray-600">
								模拟考试时间限制，训练你在规定时间内高效完成阅读题目。
							</p>
						</div>
						
						<div className="bg-white p-6 rounded-lg shadow border border-gray-100">
							<div className="text-2xl font-bold mb-3 flex items-center">
								<span className="text-primary mr-2">📊</span> 学习进度追踪
							</div>
							<p className="text-gray-600">
								记录学习数据，分析答题情况，找出需要提升的地方。
							</p>
						</div>
						
						<div className="bg-white p-6 rounded-lg shadow border border-gray-100">
							<div className="text-2xl font-bold mb-3 flex items-center">
								<span className="text-primary mr-2">🔍</span> 生词收集
							</div>
							<p className="text-gray-600">
								阅读过程中标记生词，自动添加到个人词汇本，方便复习。
							</p>
						</div>
					</div>
				</div>
				
				{/* 底部行动按钮 */}
				<div className="text-center mt-20">
					<a 
						href="/ielts/practice"
						className="inline-block bg-primary text-white font-bold text-xl px-10 py-5 rounded-md shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
					>
						立即开始练习
					</a>
					<p className="mt-4 text-gray-500">无需登录，即可体验雅思阅读练习</p>
				</div>
			</div>
		</main>
	)
}
