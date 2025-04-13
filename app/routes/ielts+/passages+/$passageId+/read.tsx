import { useState } from 'react'
import { useLoaderData, useFetcher } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { PassageReader } from '#app/components/ielts/PassageReader'
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '#app/utils/router-helpers'
import { useTheme } from '#app/routes/resources+/theme-switch'

// Highlighted section type
interface HighlightedSection {
  start: number
  end: number
  color: string
}

// Dictionary API response types
interface DictionaryEntry {
  word: string
  phonetics: Array<{
    text?: string
    audio?: string
  }>
  meanings: Array<{
    partOfSpeech: string
    definitions: Array<{
      definition: string
      example?: string
    }>
    synonyms?: string[]
  }>
}

// Fetcher data type
interface VocabularyFetcherData {
  success: boolean
  message?: string
  error?: string
  vocabularyId?: string
}

// Passage type
interface Passage {
  id: string
  title: string
  content: string
}

// User vocabulary type
interface UserVocabulary {
  id: string
  createdAt: Date
  userId: string
  passageId: string | null
  word: string
  translation: string | null
  context: string | null
  note: string | null
  mastered: boolean
  lastReviewed: Date | null
  reviewCount: number
}

// Loader data type
interface LoaderData {
  passage: Passage
  userVocabulary: UserVocabulary[]
  userId: string
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireUserId(request)

  const passageId = params.passageId
  if (!passageId) throw new Response('Passage ID is required', { status: 400 })

  const passage = await prisma.ieltsPassage.findUnique({
    where: { id: passageId },
  })

  if (!passage) throw new Response('Passage not found', { status: 404 })

  // Get user vocabulary
  const userVocabulary = await prisma.ieltsUserVocabulary.findMany({
    where: {
      userId,
      passageId,
    },
  })

  return json<LoaderData>({
    passage,
    userVocabulary,
    userId
  })
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userId = await requireUserId(request)
  const passageId = params.passageId

  if (!passageId) {
    return json({ success: false, error: 'Passage ID is missing' }, { status: 400 })
  }

  const formData = await request.formData()
  const intent = formData.get('intent') as string

  if (intent === 'addVocabulary') {
    const word = formData.get('word') as string
    const context = formData.get('context') as string

    if (!word) {
      return json({ success: false, error: 'Word cannot be empty' }, { status: 400 })
    }

    // Check if already exists
    const existingVocab = await prisma.ieltsUserVocabulary.findUnique({
      where: {
        userId_word: {
          userId,
          word,
        },
      },
    })

    if (existingVocab) {
      return json({
        success: true,
        message: 'Word already in vocabulary',
        vocabularyId: existingVocab.id
      })
    }

    // Add to vocabulary
    const newVocab = await prisma.ieltsUserVocabulary.create({
      data: {
        userId,
        passageId,
        word,
        context,
        mastered: false,
        note: '',
      },
    })

    return json({
      success: true,
      message: 'Word added to vocabulary',
      vocabularyId: newVocab.id
    })
  }

  return json({ success: false, error: 'Unknown action' }, { status: 400 })
}

export default function ReadPassage() {
  const { passage, userVocabulary } = useLoaderData<typeof loader>() as LoaderData
  const [selectedWord, setSelectedWord] = useState('')
  const [wordContext, setWordContext] = useState('')
  const [showDictionary, setShowDictionary] = useState(false)
  const [notification, setNotification] = useState<{text: string, type: 'success' | 'error'} | null>(null)
  const [fontSize, setFontSize] = useState<'text-base' | 'text-lg' | 'text-xl'>('text-lg')
  const theme = useTheme()
  const vocabularyFetcher = useFetcher<VocabularyFetcherData>()
  const [wordDefinition, setWordDefinition] = useState<DictionaryEntry[] | null>(null)
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false)
  const [selectionPosition, setSelectionPosition] = useState<{x: number, y: number} | null>(null)

  // Show temporary notification
  const showNotification = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // Handle word selection
  const handleWordSelect = (word: string, context: string = '') => {
    setSelectedWord(word)
    setWordContext(context)
    setShowDictionary(true)
    setWordDefinition(null)
    setIsLoadingDefinition(true)

    // Get selection position for popups
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setSelectionPosition({
        x: rect.left + window.scrollX + (rect.width / 2),
        y: rect.bottom + window.scrollY
      })
    }

    // Fetch definition
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
      .then(response => response.json())
      .then((data) => {
        setWordDefinition(data as DictionaryEntry[])
        setIsLoadingDefinition(false)
      })
      .catch(error => {
        console.error('Error fetching definition:', error)
        setIsLoadingDefinition(false)
      })

    // Add to vocabulary using fetcher
    vocabularyFetcher.submit(
      {
        intent: 'addVocabulary',
        word,
        context
      },
      { method: 'post' }
    )
  }

  // Show notification based on fetcher state
  if (vocabularyFetcher.data && !vocabularyFetcher.state) {
    const data = vocabularyFetcher.data
    if (data.success) {
      showNotification(data.message || 'Word added to vocabulary', 'success')
    } else if (data.error) {
      showNotification(data.error, 'error')
    }
    vocabularyFetcher.data = null
  }

  // Toggle dictionary visibility
  const toggleDictionary = () => {
    setShowDictionary(prev => !prev)
  }

  // Change font size
  const changeFontSize = (size: 'text-base' | 'text-lg' | 'text-xl') => {
    setFontSize(size)
  }

  return (
    <div className="min-h-screen bg-notion-bg-default text-notion-text-default transition-colors duration-200">
      {/* Navigation header - Improved style */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-3">
          <div className="flex items-center gap-3">
            <a
              href="/ielts/passages"
              className="text-gray-500 hover:text-gray-800 transition-colors p-1.5 rounded-full hover:bg-gray-100"
              aria-label="Back to list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <h1 className="text-xl font-semibold truncate max-w-md">
              {passage.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Reading settings */}
            <div className="relative group">
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 transition-colors"
                aria-label="Reading settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>

              <div className="notion-floating-menu absolute right-0 mt-2 w-56 hidden group-hover:block bg-white shadow-lg border border-gray-200 rounded-lg">
                <div className="py-3 px-4">
                  <p className="text-sm font-medium mb-3 text-gray-700">Font Size</p>
                  <div className="flex flex-col gap-2 mb-3">
                    <button
                      onClick={() => changeFontSize('text-base')}
                      className={`px-3 py-2 rounded-md text-sm flex items-center justify-between ${
                        fontSize === 'text-base'
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span>Normal</span>
                      {fontSize === 'text-base' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => changeFontSize('text-lg')}
                      className={`px-3 py-2 rounded-md text-sm flex items-center justify-between ${
                        fontSize === 'text-lg'
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span>Large</span>
                      {fontSize === 'text-lg' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => changeFontSize('text-xl')}
                      className={`px-3 py-2 rounded-md text-sm flex items-center justify-between ${
                        fontSize === 'text-xl'
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span>X-Large</span>
                      {fontSize === 'text-xl' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={toggleDictionary}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors ${
                showDictionary
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>{showDictionary ? 'Hide Dictionary' : 'Dictionary'}</span>
            </button>

            <a
              href={`/ielts/passages/${passage.id}/practice`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
              title="Switch to practice mode with questions"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Practice</span>
            </a>
          </div>
        </div>
      </header>

      {/* Notification - Notion style */}
      {notification && (
        <div className="fixed top-16 right-4 z-50 max-w-sm notion-fade-in">
          <div
            className={`px-4 py-2 rounded-md shadow-lg ${
              notification.type === 'success'
                ? 'bg-notion-bg-green text-notion-text-green'
                : 'bg-notion-bg-red text-notion-text-red'
            }`}
          >
            {notification.text}
          </div>
        </div>
      )}

      {/* Main reading area - Notion style */}
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="notion-container shadow-sm overflow-hidden transition-colors duration-200 bg-white">
          <div className="p-4 md:p-8 lg:p-10">
            <div className={`notion-reader-container ${fontSize} max-w-none`}>
              <PassageReader
                title={passage.title}
                content={passage.content}
                simpleMode={true}
                onWordSelect={handleWordSelect}
                disableNativeToolbar={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Word selection toolbar - Notion style */}
      {selectedWord && selectionPosition && (
        <div
          style={{
            position: 'absolute',
            left: `${selectionPosition.x}px`,
            top: `${selectionPosition.y + 5}px`,
            transform: 'translateX(-50%)',
            zIndex: 30
          }}
          className="notion-selection-toolbar notion-fade-in"
        >
          <button
            onClick={() => setShowDictionary(true)}
            className="notion-selection-toolbar-item text-notion-text-blue"
            title="Show dictionary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </button>

          <div className="h-4 border-r border-gray-200 mx-1"></div>

          <div className="flex items-center">
            <button
              className="notion-selection-toolbar-item"
              title="Highlight in yellow"
              onClick={() => {
                showNotification(`Highlighted "${selectedWord}" in yellow`, 'success')
                setSelectionPosition(null)
              }}
            >
              <div className="w-4 h-4 rounded-full bg-notion-bg-yellow border border-notion-yellow"></div>
            </button>
            <button
              className="notion-selection-toolbar-item"
              title="Highlight in green"
              onClick={() => {
                showNotification(`Highlighted "${selectedWord}" in green`, 'success')
                setSelectionPosition(null)
              }}
            >
              <div className="w-4 h-4 rounded-full bg-notion-bg-green border border-notion-green"></div>
            </button>
            <button
              className="notion-selection-toolbar-item"
              title="Highlight in blue"
              onClick={() => {
                showNotification(`Highlighted "${selectedWord}" in blue`, 'success')
                setSelectionPosition(null)
              }}
            >
              <div className="w-4 h-4 rounded-full bg-notion-bg-blue border border-notion-blue"></div>
            </button>
            <button
              className="notion-selection-toolbar-item"
              title="Highlight in purple"
              onClick={() => {
                showNotification(`Highlighted "${selectedWord}" in purple`, 'success')
                setSelectionPosition(null)
              }}
            >
              <div className="w-4 h-4 rounded-full bg-notion-bg-purple border border-notion-purple"></div>
            </button>
          </div>
        </div>
      )}

      {/* Dictionary panel - Notion style */}
      {showDictionary && selectedWord && selectionPosition && (
        <div
          className="notion-dictionary-panel notion-fade-in fixed z-20 w-full md:w-96"
          style={{
            left: selectionPosition.x > window.innerWidth / 2
              ? Math.max(selectionPosition.x - 350, 10) + 'px'
              : Math.min(selectionPosition.x + 10, window.innerWidth - 350) + 'px',
            top: selectionPosition.y > window.innerHeight / 2
              ? Math.max(selectionPosition.y - 320, 70) + 'px'
              : Math.min(selectionPosition.y + 30, window.innerHeight - 320) + 'px'
          }}
        >
          <div className="notion-dictionary-header">
            <h3 className="notion-dictionary-word">{selectedWord}</h3>
            <button
              onClick={() => {
                setShowDictionary(false)
                // Don't clear the selection position so the word selection toolbar remains visible
              }}
              className="notion-floating-menu-item"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="notion-dictionary-content">
            {wordContext && (
              <div className="notion-dictionary-context">
                <p>Context: "{wordContext}"</p>
              </div>
            )}

            {isLoadingDefinition && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-notion-blue"></div>
              </div>
            )}

            {!isLoadingDefinition && wordDefinition && (
              <div>
                {Array.isArray(wordDefinition) ? (
                  <>
                    {wordDefinition.map((entry, entryIndex) => (
                      <div key={entryIndex} className="mb-4">
                        {entry.phonetics?.[0] && (
                          <div className="flex items-center mb-2">
                            {entry.phonetics[0].text && (
                              <span className="text-sm mr-3">{entry.phonetics[0].text}</span>
                            )}
                            {entry.phonetics[0].audio && (
                              <button
                                onClick={() => {
                                  const audio = new Audio(entry.phonetics[0].audio || '');
                                  audio.play();
                                }}
                                className="notion-floating-menu-item p-1"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}

                        {entry.meanings?.map((meaning, meaningIndex) => (
                          <div key={meaningIndex} className="mb-3">
                            <h4 className="notion-dictionary-part-of-speech">
                              {meaning.partOfSpeech}
                            </h4>

                            <ol className="list-decimal pl-5 space-y-1">
                              {meaning.definitions?.slice(0, 3).map((def, defIndex) => (
                                <li key={defIndex} className="notion-dictionary-definition text-sm">
                                  <p>{def.definition}</p>
                                  {def.example && (
                                    <p className="notion-dictionary-example">
                                      "{def.example}"
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ol>

                            {meaning.synonyms && meaning.synonyms.length > 0 && (
                              <div className="mt-2">
                                <h5 className="text-xs font-medium text-notion-text-gray">
                                  Synonyms:
                                </h5>
                                <div className="notion-dictionary-synonyms">
                                  {meaning.synonyms.slice(0, 5).map((synonym, synIndex) => (
                                    <span
                                      key={synIndex}
                                      className="notion-dictionary-synonym"
                                    >
                                      {synonym}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="bg-notion-bg-gray p-4 rounded">
                    <p>No definition found for "{selectedWord}"</p>
                  </div>
                )}
              </div>
            )}

            {!isLoadingDefinition && !wordDefinition && (
              <div className="bg-notion-bg-gray p-4 rounded text-notion-text-gray">
                <p>Unable to load definition for "{selectedWord}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        /* Notion-style selection */
        ::selection {
          background: var(--notion-bg-blue);
        }

        /* Disable the browser's context menu on selection */
        .notion-reader-container {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        /* But allow text selection */
        .notion-reader-container p,
        .notion-reader-container h1,
        .notion-reader-container h2,
        .notion-reader-container h3,
        .notion-reader-container h4,
        .notion-reader-container h5,
        .notion-reader-container h6,
        .notion-reader-container li,
        .notion-reader-container span {
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          user-select: text;
        }
      `}</style>
    </div>
  )
}