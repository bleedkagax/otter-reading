import { useState } from 'react'
import { useLoaderData, useFetcher } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { PassageReader } from '#app/components/ielts/PassageReader'
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '#app/utils/router-helpers'

// Highlighted section type
interface HighlightedSection {
  start: number
  end: number
  color: string
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
  
  return json({ 
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
  const { passage, userVocabulary } = useLoaderData<typeof loader>()
  const [selectedWord, setSelectedWord] = useState('')
  const [wordContext, setWordContext] = useState('')
  const [showDictionary, setShowDictionary] = useState(false)
  const [notification, setNotification] = useState<{text: string, type: 'success' | 'error'} | null>(null)
  const [fontSize, setFontSize] = useState<'text-sm' | 'text-base' | 'text-lg'>('text-base')
  const [darkMode, setDarkMode] = useState(false)
  const vocabularyFetcher = useFetcher()
  const [wordDefinition, setWordDefinition] = useState<any>(null)
  const [isLoadingDefinition, setIsLoadingDefinition] = useState(false)
  const [selectionPosition, setSelectionPosition] = useState<{x: number, y: number} | null>(null)
  
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
      .then(data => {
        setWordDefinition(data)
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
    if (vocabularyFetcher.data.success) {
      showNotification(vocabularyFetcher.data.message, 'success')
    } else if (vocabularyFetcher.data.error) {
      showNotification(vocabularyFetcher.data.error, 'error')
    }
    vocabularyFetcher.data = null
  }
  
  // Show temporary notification
  const showNotification = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type })
    setTimeout(() => setNotification(null), 3000)
  }
  
  // Toggle dictionary visibility
  const toggleDictionary = () => {
    setShowDictionary(prev => !prev)
  }
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(prev => !prev)
  }
  
  // Change font size
  const changeFontSize = (size: 'text-sm' | 'text-base' | 'text-lg') => {
    setFontSize(size)
  }
  
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'} transition-colors duration-200`}>
      {/* Navigation header */}
      <header className={`sticky top-0 z-10 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b shadow-sm transition-colors duration-200`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <a 
              href="/ielts/passages" 
              className={`${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'} transition-colors`}
              aria-label="Back to list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </a>
            <h1 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} truncate max-w-md transition-colors duration-200`}>
              {passage.title}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Reading settings */}
            <div className="relative group">
              <button 
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                aria-label="Reading settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
              
              <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg hidden group-hover:block ${
                darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <div className="py-2 px-3">
                  <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Font Size</p>
                  <div className="flex gap-2 mb-3">
                    <button 
                      onClick={() => changeFontSize('text-sm')} 
                      className={`px-2 py-1 rounded text-xs ${
                        fontSize === 'text-sm' 
                          ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700') 
                          : (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')
                      }`}
                    >Small</button>
                    <button 
                      onClick={() => changeFontSize('text-base')} 
                      className={`px-2 py-1 rounded text-xs ${
                        fontSize === 'text-base' 
                          ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700') 
                          : (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')
                      }`}
                    >Medium</button>
                    <button 
                      onClick={() => changeFontSize('text-lg')} 
                      className={`px-2 py-1 rounded text-xs ${
                        fontSize === 'text-lg' 
                          ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700') 
                          : (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')
                      }`}
                    >Large</button>
                  </div>
                  
                  <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Theme</p>
                  <button 
                    onClick={toggleDarkMode} 
                    className={`flex items-center justify-between w-full px-2 py-1.5 rounded text-xs ${
                      darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {darkMode ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <button 
              onClick={toggleDictionary}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                showDictionary 
                  ? (darkMode ? 'bg-blue-700 text-blue-100' : 'bg-blue-100 text-blue-700') 
                  : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>{showDictionary ? 'Hide Dictionary' : 'Dictionary'}</span>
            </button>

            <a 
              href={`/ielts/passages/${passage.id}/practice`}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${
                darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-primary text-white hover:bg-primary-dark'
              } transition-colors`}
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

      {/* Notification */}
      {notification && (
        <div className="fixed top-16 right-4 z-50 max-w-sm">
          <div 
            className={`px-4 py-2 rounded-md shadow-lg ${
              notification.type === 'success' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}
          >
            {notification.text}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Main reading area */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm overflow-hidden transition-colors duration-200`}>
          <div className="p-6 md:p-8 leading-relaxed">
            <div className={`custom-reader-container ${fontSize}`}>
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

      {/* Word selection toolbar */}
      {selectedWord && selectionPosition && (
        <div 
          style={{
            position: 'absolute',
            left: `${selectionPosition.x}px`,
            top: `${selectionPosition.y + 5}px`,
            transform: 'translateX(-50%)',
            zIndex: 30
          }}
          className={`px-2 py-1.5 rounded shadow-lg flex items-center gap-2 ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}
        >
          <button 
            onClick={() => setShowDictionary(true)}
            className={`p-1.5 rounded ${
              darkMode ? 'hover:bg-gray-700 text-blue-400' : 'hover:bg-gray-100 text-blue-600'
            }`}
            title="Show dictionary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </button>
          
          <div className="h-4 border-r border-gray-300 dark:border-gray-600"></div>
          
          <div className="flex items-center gap-1.5">
            <button 
              className="w-4 h-4 rounded-full bg-yellow-300 hover:ring-2 ring-offset-1 ring-yellow-400"
              title="Highlight in yellow"
              onClick={() => {
                showNotification(`Highlighted "${selectedWord}" in yellow`, 'success')
                setSelectionPosition(null)
              }}
            ></button>
            <button 
              className="w-4 h-4 rounded-full bg-green-300 hover:ring-2 ring-offset-1 ring-green-400"
              title="Highlight in green"
              onClick={() => {
                showNotification(`Highlighted "${selectedWord}" in green`, 'success')
                setSelectionPosition(null)
              }}
            ></button>
            <button 
              className="w-4 h-4 rounded-full bg-blue-300 hover:ring-2 ring-offset-1 ring-blue-400"
              title="Highlight in blue"
              onClick={() => {
                showNotification(`Highlighted "${selectedWord}" in blue`, 'success')
                setSelectionPosition(null)
              }}
            ></button>
          </div>
        </div>
      )}

      {/* Dictionary panel */}
      {showDictionary && selectedWord && selectionPosition && (
        <div 
          className={`fixed z-20 shadow-xl rounded-lg overflow-hidden ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border max-w-md max-h-[60vh] w-full md:w-96 transition-colors duration-200`}
          style={{
            left: selectionPosition.x > window.innerWidth / 2 
              ? Math.max(selectionPosition.x - 350, 10) + 'px'
              : Math.min(selectionPosition.x + 10, window.innerWidth - 350) + 'px',
            top: selectionPosition.y > window.innerHeight / 2
              ? Math.max(selectionPosition.y - 320, 70) + 'px'
              : Math.min(selectionPosition.y + 30, window.innerHeight - 320) + 'px'
          }}
        >
          <div className={`sticky top-0 ${
            darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
          } border-b p-3 flex justify-between items-center transition-colors duration-200`}>
            <h3 className="font-medium">{selectedWord}</h3>
            <button 
              onClick={() => {
                setShowDictionary(false)
                // Don't clear the selection position so the word selection toolbar remains visible
              }}
              className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(60vh - 48px)' }}>
            {wordContext && (
              <div className={`mb-4 text-sm italic ${
                darkMode ? 'bg-gray-700' : 'bg-gray-50'
              } p-3 rounded-md transition-colors duration-200`}>
                <p>Context: "{wordContext}"</p>
              </div>
            )}
            
            {isLoadingDefinition && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            {!isLoadingDefinition && wordDefinition && (
              <div className={`${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                {Array.isArray(wordDefinition) ? (
                  <>
                    {wordDefinition.map((entry, entryIndex) => (
                      <div key={entryIndex} className="mb-4">
                        {entry.phonetics && entry.phonetics.length > 0 && (
                          <div className="flex items-center mb-2">
                            {entry.phonetics[0].text && (
                              <span className="text-sm mr-3">{entry.phonetics[0].text}</span>
                            )}
                            {entry.phonetics[0].audio && (
                              <button 
                                onClick={() => {
                                  const audio = new Audio(entry.phonetics[0].audio);
                                  audio.play();
                                }}
                                className={`p-1 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                        
                        {entry.meanings && entry.meanings.map((meaning, meaningIndex) => (
                          <div key={meaningIndex} className="mb-3">
                            <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-1`}>
                              {meaning.partOfSpeech}
                            </h4>
                            
                            <ol className="list-decimal pl-5 space-y-1">
                              {meaning.definitions.slice(0, 3).map((def, defIndex) => (
                                <li key={defIndex} className="text-sm">
                                  <p>{def.definition}</p>
                                  {def.example && (
                                    <p className={`text-xs italic mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      "{def.example}"
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ol>
                            
                            {meaning.synonyms && meaning.synonyms.length > 0 && (
                              <div className="mt-2">
                                <h5 className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  Synonyms:
                                </h5>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {meaning.synonyms.slice(0, 5).map((synonym, synIndex) => (
                                    <span 
                                      key={synIndex}
                                      className={`text-xs px-2 py-1 rounded ${
                                        darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                                      }`}
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
                  <div className={`p-4 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <p>No definition found for "{selectedWord}"</p>
                  </div>
                )}
              </div>
            )}
            
            {!isLoadingDefinition && !wordDefinition && (
              <div className={`p-4 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                <p>Unable to load definition for "{selectedWord}"</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <style>{`
        .custom-reader-container {
          line-height: 1.8;
        }
        .custom-reader-container p {
          margin-bottom: 1.5rem;
        }
        ${darkMode ? `
          .custom-reader-container h1 {
            color: #f3f4f6;
          }
        ` : ''}
        
        /* Disable browser's default selection menu */
        ::selection {
          background: rgba(59, 130, 246, 0.3);
        }
        
        /* Disable the browser's context menu on selection */
        .custom-reader-container {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        
        /* But allow text selection */
        .custom-reader-container p, 
        .custom-reader-container h1,
        .custom-reader-container h2,
        .custom-reader-container h3,
        .custom-reader-container h4,
        .custom-reader-container h5,
        .custom-reader-container h6,
        .custom-reader-container li,
        .custom-reader-container span {
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          user-select: text;
        }
      `}</style>
    </div>
  )
} 