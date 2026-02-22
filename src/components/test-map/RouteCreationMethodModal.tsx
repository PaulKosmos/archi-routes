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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-w-3xl relative animate-fadeIn max-h-[85vh] md:max-h-none overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl md:rounded-t-2xl z-10">
          <h2 className="text-lg md:text-2xl font-semibold text-gray-900">
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
        <div className="p-4 md:p-8">
          <p className="text-center text-gray-600 mb-4 md:mb-8 text-sm md:text-lg">
            How would you like to create your route?
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
            {/* Manual creation */}
            <button
              onClick={onSelectManual}
              className="group relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-blue-500 transition-all duration-300 hover:shadow-xl bg-white p-4 md:p-8 text-left"
            >
              <div className="flex md:flex-col items-center md:items-center gap-3 md:gap-0">
                {/* Icon */}
                <div className="w-12 h-12 md:w-20 md:h-20 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-500 transition-colors flex-shrink-0 md:mb-4">
                  <MapPin className="w-6 h-6 md:w-10 md:h-10 text-blue-600 group-hover:text-white transition-colors" />
                </div>

                <div className="flex-1 md:text-center">
                  {/* Title */}
                  <h3 className="text-base md:text-xl font-semibold text-gray-900 mb-1 md:mb-3">
                    Create Manually
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-xs md:text-base mb-0 md:mb-4 leading-relaxed">
                    Select buildings on the map and create a personalized route
                  </p>
                </div>
              </div>

              {/* Features - hidden on mobile for compactness */}
              <ul className="hidden md:block text-sm text-gray-500 space-y-2 mb-6">
                <li className="flex items-center justify-center">
                  <span className="mr-2">✓</span>
                  <span>Full control over route</span>
                </li>
                <li className="flex items-center justify-center">
                  <span className="mr-2">✓</span>
                  <span>Choose object order</span>
                </li>
                <li className="flex items-center justify-center">
                  <span className="mr-2">✓</span>
                  <span>From 2 to 20 objects</span>
                </li>
              </ul>

              {/* Button */}
              <div className="mt-3 md:mt-auto">
                <div className="px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white rounded-lg font-medium group-hover:bg-blue-700 transition-colors text-center text-sm md:text-base">
                  Select
                </div>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"></div>
            </button>

            {/* AI generation */}
            <div className="relative rounded-xl border-2 border-gray-200 bg-gray-50 p-4 md:p-8 opacity-60">
              {/* "Coming Soon" badge */}
              <div className="absolute top-3 right-3 md:top-4 md:right-4">
                <span className="px-2 md:px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                  Coming Soon
                </span>
              </div>

              <div className="flex md:flex-col items-center md:items-center gap-3 md:gap-0">
                {/* Icon */}
                <div className="w-12 h-12 md:w-20 md:h-20 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 md:mb-4">
                  <Sparkles className="w-6 h-6 md:w-10 md:h-10 text-purple-600" />
                </div>

                <div className="flex-1 md:text-center">
                  {/* Title */}
                  <h3 className="text-base md:text-xl font-semibold text-gray-900 mb-1 md:mb-3">
                    Generate with AI
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-xs md:text-base mb-0 md:mb-4 leading-relaxed">
                    Specify preferences and AI will create the perfect route
                  </p>
                </div>
              </div>

              {/* Features - hidden on mobile */}
              <ul className="hidden md:block text-sm text-gray-500 space-y-2 mb-6">
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
              <div className="mt-3 md:mt-auto">
                <div className="px-4 md:px-6 py-2 md:py-3 bg-gray-400 text-white rounded-lg font-medium text-center cursor-not-allowed text-sm md:text-base">
                  In Development
                </div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="mt-4 md:mt-8 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs md:text-sm text-blue-800 text-center">
              Create personal routes for your walks. You can edit them anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
