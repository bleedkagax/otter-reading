import { useState } from 'react'
import { useLoaderData } from 'react-router'
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
        status: 'active',
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
  
  // Handle word selection
  const handleWordSelect = async (word: string, context: string = '') => {
    setSelectedWord(word)
    setWordContext(context)
    
    // Add to vocabulary
    try {
      const formData = new FormData()
      formData.append('intent', 'addVocabulary')
      formData.append('word', word)
      formData.append('context', context)
      
      const response = await fetch(`/ielts/passages/${passage.id}/read`, {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      if (data.success) {
        showNotification(data.message, 'success')
      } else {
        showNotification(data.error, 'error')
      }
    } catch (error) {
      showNotification('Failed to add word', 'error')
    }
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
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dictionary panel */}
      {showDictionary && selectedWord && (
        <div className={`fixed bottom-0 right-0 w-full md:w-1/3 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border-t md:border-l shadow-lg z-20 max-h-[50vh] overflow-auto transition-colors duration-200`}>
          <div className={`sticky top-0 ${
            darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
          } border-b p-3 flex justify-between items-center transition-colors duration-200`}>
            <h3 className="font-medium">{selectedWord}</h3>
            <button 
              onClick={() => setShowDictionary(false)}
              className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4">
            {wordContext && (
              <div className={`mb-4 text-sm italic ${
                darkMode ? 'bg-gray-700' : 'bg-gray-50'
              } p-3 rounded-md transition-colors duration-200`}>
                <p>Context: "{wordContext}"</p>
              </div>
            )}
            <iframe 
              src={`https://dictionary.cambridge.org/dictionary/english/${selectedWord}`} 
              className={`w-full min-h-[300px] border-none ${darkMode ? 'bg-white' : ''}`}
              title={`Dictionary definition for ${selectedWord}`}
            />
          </div>
        </div>
      )}
      
      <style jsx global>{`
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
      `}</style>
    </div>
  )
} 