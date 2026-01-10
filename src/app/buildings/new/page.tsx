'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Dynamically import the entire component with SSR disabled
const AddBuildingClient = dynamic(() => import('./AddBuildingClient'), {
  ssr: false,
  loading: () => (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading add building form...</p>
        </div>
      </div>
    </div>
  )
})

export default function AddObjectPage() {
  return <AddBuildingClient />
}
