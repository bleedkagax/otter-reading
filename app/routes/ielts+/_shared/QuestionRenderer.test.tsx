/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuestionRenderer } from './QuestionRenderer'
import { createMockQuestion } from './testUtils'

describe('QuestionRenderer', () => {
  it('renders a multiple-choice question correctly', () => {
    const question = createMockQuestion({
      type: 'multiple-choice',
      questionText: '测试多选题',
      options: JSON.stringify(['选项A', '选项B', '选项C', '选项D'])
    })
    const onChange = vi.fn()
    
    render(
      <QuestionRenderer
        question={question}
        selectedAnswer="A"
        onChange={onChange}
      />
    )
    
    // 检查问题文本是否正确渲染
    expect(screen.getByText('测试多选题')).toBeInTheDocument()
    
    // 检查选项是否正确渲染
    expect(screen.getByText('A.')).toBeInTheDocument()
    expect(screen.getByText('选项A')).toBeInTheDocument()
    expect(screen.getByText('B.')).toBeInTheDocument()
    expect(screen.getByText('选项B')).toBeInTheDocument()
    
    // 检查选中状态
    const radioButtons = screen.getAllByRole('radio')
    expect(radioButtons[0]).toBeChecked()
    expect(radioButtons[1]).not.toBeChecked()
    
    // 测试点击事件
    fireEvent.click(radioButtons[1])
    expect(onChange).toHaveBeenCalledWith(question.id, 'B')
  })
  
  it('renders a fill-in-blank question correctly', () => {
    const question = createMockQuestion({
      type: 'fill-in-blank',
      questionText: '测试填空题'
    })
    const onChange = vi.fn()
    
    render(
      <QuestionRenderer
        question={question}
        selectedAnswer="测试答案"
        onChange={onChange}
      />
    )
    
    // 检查问题文本是否正确渲染
    expect(screen.getByText('测试填空题')).toBeInTheDocument()
    
    // 检查输入框是否正确渲染
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('测试答案')
    
    // 测试输入事件
    fireEvent.change(input, { target: { value: '新答案' } })
    expect(onChange).toHaveBeenCalledWith(question.id, '新答案')
  })
  
  it('renders a true-false-ng question correctly', () => {
    const question = createMockQuestion({
      type: 'true-false-ng',
      questionText: '测试判断题'
    })
    const onChange = vi.fn()
    
    render(
      <QuestionRenderer
        question={question}
        selectedAnswer="TRUE"
        onChange={onChange}
      />
    )
    
    // 检查问题文本是否正确渲染
    expect(screen.getByText('测试判断题')).toBeInTheDocument()
    
    // 检查选项是否正确渲染
    expect(screen.getByText('TRUE')).toBeInTheDocument()
    expect(screen.getByText('FALSE')).toBeInTheDocument()
    expect(screen.getByText('NOT GIVEN')).toBeInTheDocument()
    
    // 检查选中状态
    const radioButtons = screen.getAllByRole('radio')
    expect(radioButtons[0]).toBeChecked()
    expect(radioButtons[1]).not.toBeChecked()
    
    // 测试点击事件
    fireEvent.click(radioButtons[1])
    expect(onChange).toHaveBeenCalledWith(question.id, 'FALSE')
  })
  
  it('renders a heading-matching question correctly', () => {
    const question = createMockQuestion({
      type: 'heading-matching',
      questionText: '测试标题匹配题',
      options: JSON.stringify(['标题A', '标题B', '标题C'])
    })
    const onChange = vi.fn()
    
    render(
      <QuestionRenderer
        question={question}
        selectedAnswer="B"
        onChange={onChange}
      />
    )
    
    // 检查问题文本是否正确渲染
    expect(screen.getByText('测试标题匹配题')).toBeInTheDocument()
    
    // 检查下拉框是否正确渲染
    const select = screen.getByRole('combobox')
    expect(select).toHaveValue('B')
    
    // 检查选项是否正确渲染
    expect(screen.getByText('A. 标题A')).toBeInTheDocument()
    expect(screen.getByText('B. 标题B')).toBeInTheDocument()
    expect(screen.getByText('C. 标题C')).toBeInTheDocument()
    
    // 测试选择事件
    fireEvent.change(select, { target: { value: 'C' } })
    expect(onChange).toHaveBeenCalledWith(question.id, 'C')
  })
  
  it('renders a message for unsupported question types', () => {
    const question = createMockQuestion({
      type: 'unsupported-type',
      questionText: '不支持的题型'
    })
    const onChange = vi.fn()
    
    render(
      <QuestionRenderer
        question={question}
        selectedAnswer=""
        onChange={onChange}
      />
    )
    
    // 检查错误消息是否正确渲染
    expect(screen.getByText('不支持的题目类型: unsupported-type')).toBeInTheDocument()
  })
  
  it('disables inputs when disabled prop is true', () => {
    const question = createMockQuestion({
      type: 'multiple-choice',
      questionText: '禁用状态测试',
      options: JSON.stringify(['选项A', '选项B'])
    })
    const onChange = vi.fn()
    
    render(
      <QuestionRenderer
        question={question}
        selectedAnswer="A"
        onChange={onChange}
        disabled={true}
      />
    )
    
    // 检查选项是否已禁用
    const radioButtons = screen.getAllByRole('radio')
    expect(radioButtons[0]).toBeDisabled()
    expect(radioButtons[1]).toBeDisabled()
  })
}) 