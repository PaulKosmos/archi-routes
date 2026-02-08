'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function ComingSoonPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/site-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="coming-soon-page">
      <div className="coming-soon-container">
        {/* Logo from Header */}
        <div className="coming-soon-logo">
          <Image
            src="/ar-logo.svg"
            alt="Archiroutes Logo"
            width={180}
            height={48}
            priority
          />
        </div>

        {/* Main Content */}
        <div className="coming-soon-content">
          <h1 className="coming-soon-title">Coming Soon</h1>
          <p className="coming-soon-subtitle">
            We&apos;re putting the finishing touches on something special.
            <br />
            <strong>See you soon!</strong>
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="coming-soon-form">
          <div className="coming-soon-input-wrapper">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter access password..."
              className="coming-soon-input"
              disabled={isLoading}
              autoFocus
            />
            <button
              type="submit"
              className="coming-soon-button"
              disabled={isLoading || !password}
            >
              {isLoading ? (
                <span className="coming-soon-spinner" />
              ) : (
                'Enter'
              )}
            </button>
          </div>
          {error && <p className="coming-soon-error">{error}</p>}
        </form>

        {/* Footer */}
        <p className="coming-soon-footer">
          © 2026 Archiroutes. All rights reserved.
        </p>
      </div>

      <style jsx>{`
        .coming-soon-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: hsl(0 0% 98%);
          padding: 20px;
          position: relative;
        }

        .coming-soon-container {
          max-width: 480px;
          width: 100%;
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .coming-soon-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 48px;
        }

        .coming-soon-content {
          margin-bottom: 40px;
        }

        .coming-soon-title {
          font-size: 48px;
          font-weight: 700;
          color: hsl(0 0% 8%);
          margin: 0 0 16px 0;
          letter-spacing: -1px;
        }

        .coming-soon-subtitle {
          font-size: 18px;
          color: hsl(0 0% 40%);
          line-height: 1.6;
          margin: 0;
        }

        .coming-soon-subtitle strong {
          color: hsl(4 90% 58%);
        }

        .coming-soon-form {
          margin-bottom: 48px;
        }

        .coming-soon-input-wrapper {
          display: flex;
          gap: 12px;
          background: hsl(0 0% 100%);
          border: 2px solid hsl(0 0% 88%);
          border-radius: 16px;
          padding: 6px;
          transition: all 0.3s ease;
        }

        .coming-soon-input-wrapper:focus-within {
          border-color: hsl(4 90% 58%);
          box-shadow: 0 0 0 4px hsla(4, 90%, 58%, 0.1);
        }

        .coming-soon-input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 16px 20px;
          font-size: 16px;
          color: hsl(0 0% 8%);
          outline: none;
        }

        .coming-soon-input::placeholder {
          color: hsl(0 0% 60%);
        }

        .coming-soon-button {
          background: hsl(4 90% 58%);
          border: none;
          border-radius: 12px;
          padding: 16px 32px;
          font-size: 16px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 100px;
        }

        .coming-soon-button:hover:not(:disabled) {
          background: hsl(4 90% 50%);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px hsla(4, 90%, 58%, 0.3);
        }

        .coming-soon-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .coming-soon-spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .coming-soon-error {
          margin-top: 12px;
          color: hsl(4 90% 48%);
          font-size: 14px;
        }

        .coming-soon-footer {
          font-size: 14px;
          color: hsl(0 0% 60%);
          margin: 0;
        }

        @media (max-width: 480px) {
          .coming-soon-title {
            font-size: 36px;
          }

          .coming-soon-subtitle {
            font-size: 16px;
          }

          .coming-soon-input-wrapper {
            flex-direction: column;
          }

          .coming-soon-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
