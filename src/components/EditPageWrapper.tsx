// src/components/EditPageWrapper.tsx
'use client'

import Link from 'next/link'
import { useEditPermissions } from '../hooks/useEditPermissions'

interface EditPageWrapperProps {
  contentType: 'building' | 'route'
  contentId: string
  children: React.ReactNode
}

export default function EditPageWrapper({ 
  contentType, 
  contentId, 
  children 
}: EditPageWrapperProps) {
  const permissions = useEditPermissions(contentType, contentId)

  // Показываем загрузку
  if (permissions.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    )
  }

  // Показываем ошибку доступа
  if (!permissions.canEdit) {
    const backUrl = `/${contentType === 'building' ? 'buildings' : 'routes'}/${contentId}`
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white p-8 rounded-lg shadow-lg">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.348 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Access Denied
          </h3>
          
          <p className="text-sm text-gray-500 mb-6">
            {permissions.reason}
          </p>

          {permissions.isAuthenticated && permissions.userRole && (
            <p className="text-xs text-gray-400 mb-6">
              Your role: <span className="font-medium">{permissions.userRole}</span>
            </p>
          )}

          <div className="space-y-3">
            <Link 
              href={backUrl}
              className="w-full inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to viewing
            </Link>
            
            {!permissions.isAuthenticated && (
              <Link
                href="/auth"
                className="w-full inline-flex justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Показываем контент редактирования
  console.log('🎉 EditPageWrapper: Showing edit form!', permissions)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Хедер с информацией о правах */}
      <div className="bg-green-50 border-b border-green-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center text-sm text-green-700">
          <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Edit mode active
          {permissions.userRole && (
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              {permissions.userRole}
            </span>
          )}
        </div>
      </div>
      
      {children}
    </div>
  )
}