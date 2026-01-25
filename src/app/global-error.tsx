'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔧</div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#1f2937',
              marginBottom: '1rem'
            }}>
              Application Error
            </h2>
            <p style={{
              color: '#6b7280',
              marginBottom: '2rem',
              maxWidth: '400px'
            }}>
              A critical error occurred. We apologize for the inconvenience.
            </p>
            {error.digest && (
              <p style={{
                fontSize: '0.75rem',
                color: '#9ca3af',
                marginBottom: '1rem'
              }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 500
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
