'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Application error:', error)
    }
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="text-center px-4">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
          <a
            href="/"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
