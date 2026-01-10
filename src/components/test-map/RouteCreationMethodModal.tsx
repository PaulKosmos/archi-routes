'use client'

import { X, MapPin, Sparkles } from 'lucide-react'

interface RouteCreationMethodModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectManual: () => void
  onSelectAI: () => void
}

export default function RouteCreationMethodModal({
  isOpen,
  onClose,
  onSelectManual,
  onSelectAI
}: RouteCreationMethodModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">
            Route Creation
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-center text-gray-600 mb-8 text-lg">
            How would you like to create your route?
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Вручную */}
            <button
              onClick={onSelectManual}
              className="group relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-blue-500 transition-all duration-300 hover:shadow-xl bg-white p-8"
            >
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                  <MapPin className="w-10 h-10 text-blue-600 group-hover:text-white transition-colors" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
                Create Manually
              </h3>

              {/* Description */}
              <p className="text-gray-600 text-center mb-4 leading-relaxed">
                Select buildings on the map yourself and create a personalized route
              </p>

              {/* Features */}
              <ul className="text-sm text-gray-500 space-y-2 mb-6">
                <li className="flex items-center justify-center">
                  <span className="mr-2">✓</span>
                  <span>Full control over route</span>
                </li>
                <li className="flex items-center justify-center">
                  <span className="mr-2">✓</span>
                  <span>Choose building order</span>
                </li>
                <li className="flex items-center justify-center">
                  <span className="mr-2">✓</span>
                  <span>From 2 to 20 buildings</span>
                </li>
              </ul>

              {/* Button */}
              <div className="mt-auto">
                <div className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium group-hover:bg-blue-700 transition-colors text-center">
                  Select
                </div>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-10 transition-opacity"></div>
            </button>

            {/* AI генерация */}
            <div className="relative rounded-xl border-2 border-gray-200 bg-gray-50 p-8 opacity-60">
              {/* "Скоро" badge */}
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                  Coming Soon
                </span>
              </div>

              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-purple-600" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-gray-900 mb-3 text-center">
                Generate with AI
              </h3>

              {/* Description */}
              <p className="text-gray-600 text-center mb-4 leading-relaxed">
                Specify your preferences and AI will create the perfect route
              </p>

              {/* Features */}
              <ul className="text-sm text-gray-500 space-y-2 mb-6">
                <li className="flex items-center justify-center">
                  <span className="mr-2">✓</span>
                  <span>Smart recommendations</span>
                </li>
                <li className="flex items-center justify-center">
                  <span className="mr-2">✓</span>
                  <span>Consider your interests</span>
                </li>
                <li className="flex items-center justify-center">
                  <span className="mr-2">✓</span>
                  <span>Optimal route</span>
                </li>
              </ul>

              {/* Button */}
              <div className="mt-auto">
                <div className="px-6 py-3 bg-gray-400 text-white rounded-lg font-medium text-center cursor-not-allowed">
                  In Development
                </div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 text-center flex items-center justify-center">
              <span className="mr-2">💡</span>
              <span>Create personal routes for your walks. You can edit them anytime.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

