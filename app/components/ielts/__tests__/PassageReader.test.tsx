import { render, screen, fireEvent } from '@testing-library/react'
import { PassageReader } from '../PassageReader'
import { test, expect, vi } from 'vitest'

test.describe('PassageReader', () => {
  const mockContent = 'This is a test paragraph.\n\nThis is another paragraph with some content.'
  const mockTitle = 'Test Passage'

  test('renders the passage content and title', () => {
    render(<PassageReader title={mockTitle} content={mockContent} />)

    expect(screen.getByText(mockTitle)).toBeInTheDocument()
    expect(screen.getByText('This is a test paragraph.')).toBeInTheDocument()
    expect(screen.getByText('This is another paragraph with some content.')).toBeInTheDocument()
  })

  test('renders in simple mode', () => {
    render(<PassageReader title={mockTitle} content={mockContent} simpleMode={true} />)

    expect(screen.getByText(mockTitle)).toBeInTheDocument()
    expect(screen.getByText('This is a test paragraph.')).toBeInTheDocument()
    expect(screen.getByText('This is another paragraph with some content.')).toBeInTheDocument()

    // In simple mode, there should be no timer
    expect(screen.queryByText(/:/)).not.toBeInTheDocument()
  })

  test('renders with questions', () => {
    const mockParts = [
      {
        id: '1',
        name: 'Part 1',
        questions: [
          {
            id: '1',
            text: 'What is the main idea?',
            type: 'multiple-choice',
            options: ['Option A', 'Option B', 'Option C', 'Option D']
          }
        ]
      }
    ]

    render(
      <PassageReader
        title={mockTitle}
        content={mockContent}
        parts={mockParts}
      />
    )

    expect(screen.getByText('Part 1')).toBeInTheDocument()
    expect(screen.getByText('What is the main idea?')).toBeInTheDocument()
  })

  test('handles text selection for highlighting', () => {
    const mockOnHighlight = vi.fn()

    render(
      <PassageReader
        title={mockTitle}
        content={mockContent}
        onHighlight={mockOnHighlight}
        disableNativeToolbar={true}
      />
    )

    // Mock a text selection
    const paragraph = screen.getByText('This is a test paragraph.')

    // Create a mock selection
    const mockSelection = {
      toString: () => 'test',
      getRangeAt: () => ({
        getBoundingClientRect: () => ({
          left: 100,
          width: 50,
          bottom: 100
        }),
        startOffset: 10,
        endOffset: 14
      }),
      removeAllRanges: vi.fn()
    }

    // Mock the window.getSelection
    const originalGetSelection = window.getSelection
    window.getSelection = vi.fn().mockReturnValue(mockSelection)

    // Trigger the mouseup event
    fireEvent.mouseUp(paragraph)

    // Restore the original getSelection
    window.getSelection = originalGetSelection

    // The highlight toolbar should be visible
    expect(screen.getByTitle('黄色标记')).toBeInTheDocument()
    expect(screen.getByTitle('绿色标记')).toBeInTheDocument()
    expect(screen.getByTitle('蓝色标记')).toBeInTheDocument()
  })

  test('renders with different font sizes', () => {
    render(<PassageReader title={mockTitle} content={mockContent} />)

    // Check if the passage is rendered with the default font size
    const passageContainer = screen.getByText('This is a test paragraph.').closest('p')
    expect(passageContainer).toHaveClass('text-sm')
  })

  test('renders with highlights', () => {
    const mockHighlights = [
      {
        id: '1',
        paragraphIndex: 0,
        textOffset: 5,
        start: 5,
        end: 9,
        color: '#FFEB3B80',
        text: 'is a'
      }
    ]

    render(
      <PassageReader
        title={mockTitle}
        content={mockContent}
        highlights={mockHighlights}
      />
    )

    // The highlighted text should be rendered with a span
    const highlightedSpan = screen.getByText('is a')
    expect(highlightedSpan).toHaveStyle('background-color: #FFEB3B80')
  })

  test('handles answer selection', () => {
    const mockParts = [
      {
        id: '1',
        name: 'Part 1',
        questions: [
          {
            id: '1',
            text: 'What is the main idea?',
            type: 'multiple-choice',
            options: ['Option A', 'Option B', 'Option C', 'Option D']
          }
        ]
      }
    ]

    const mockOnSubmit = vi.fn()

    render(
      <PassageReader
        title={mockTitle}
        content={mockContent}
        parts={mockParts}
        onSubmit={mockOnSubmit}
      />
    )

    // Select an answer
    const optionA = screen.getByText('Option A')
    fireEvent.click(optionA)

    // Submit the answers
    const submitButton = screen.getByText(/Submit/)
    fireEvent.click(submitButton)

    // Check if onSubmit was called with the correct answers
    expect(mockOnSubmit).toHaveBeenCalledWith({ '1': 'Option A' })
  })
})
