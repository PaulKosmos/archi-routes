'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import OptimizedImage from '../../components/OptimizedImage'
import WebPImage from '../../components/WebPImage'
import ResponsiveImage from '../../components/ResponsiveImage'
import PerformanceMonitor from '../../components/PerformanceMonitor'
import BundleAnalyzer from '../../components/BundleAnalyzer'
import { BarChart3, Image as ImageIcon, Monitor, Package } from 'lucide-react'

export default function TestOptimizationPage() {
  const [activeTab, setActiveTab] = useState<'images' | 'performance' | 'bundle'>('images')

  const testImages = [
    {
      src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      alt: 'Современная архитектура'
    },
    {
      src: 'https://images.unsplash.com/photo-1520637836862-4d197d17c88a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      alt: 'Городской пейзаж'
    },
    {
      src: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      alt: 'Архитектурный дизайн'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">
                Тест оптимизации производительности
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('images')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'images'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ImageIcon className="w-4 h-4 inline mr-2" />
              Оптимизация изображений
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'performance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Monitor className="w-4 h-4 inline mr-2" />
              Мониторинг производительности
            </button>
            <button
              onClick={() => setActiveTab('bundle')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bundle'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Анализ бандла
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'images' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Оптимизация изображений
              </h2>
              
              {/* OptimizedImage */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  OptimizedImage - Ленивая загрузка с placeholder
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {testImages.map((image, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      <OptimizedImage
                        src={image.src}
                        alt={image.alt}
                        width={300}
                        height={200}
                        className="w-full h-48 object-cover"
                        placeholder="blur"
                      />
                      <div className="p-4">
                        <p className="text-sm text-gray-600">{image.alt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* WebPImage */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  WebPImage - Автоматическое WebP с fallback
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {testImages.map((image, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      <WebPImage
                        src={image.src}
                        alt={image.alt}
                        width={300}
                        height={200}
                        className="w-full h-48 object-cover"
                        quality={85}
                      />
                      <div className="p-4">
                        <p className="text-sm text-gray-600">{image.alt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ResponsiveImage */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  ResponsiveImage - Адаптивные размеры
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {testImages.map((image, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      <ResponsiveImage
                        src={image.src}
                        alt={image.alt}
                        width={300}
                        height={200}
                        className="w-full h-48 object-cover"
                        quality={90}
                        breakpoints={{
                          mobile: 200,
                          tablet: 300,
                          desktop: 400
                        }}
                      />
                      <div className="p-4">
                        <p className="text-sm text-gray-600">{image.alt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Мониторинг производительности
              </h2>
              
              <PerformanceMonitor 
                showDetails={true}
                className="max-w-4xl"
              />
            </div>
          </div>
        )}

        {activeTab === 'bundle' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Анализ бандла
              </h2>
              
              <BundleAnalyzer className="max-w-4xl" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
