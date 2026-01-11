'use client'

import { MapPin, X } from 'lucide-react'

interface AddBuildingInstructionModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function AddBuildingInstructionModal({
  isOpen,
  onConfirm,
  onCancel
}: AddBuildingInstructionModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Фон с затемнением */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Модальное окно */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">

        {/* Заголовок */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold">Режим добавления</h2>
            </div>
            <button
              onClick={onCancel}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              title="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Контент */}
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-gray-700 leading-relaxed">
              Нажмите на <strong>карту</strong> в месте, где хотите добавить новый архитектурный объект.
            </p>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
            <p className="text-gray-700 leading-relaxed">
              Or press <strong>"Add Building"</strong> again to exit mode.
            </p>
          </div>

          {/* Визуальная подсказка */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="text-4xl">🎯</div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  После выбора откроется форма добавления объекта с автоматическим определением адреса.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
          >
            <span>Понятно, начнем!</span>
            <span>✓</span>
          </button>
        </div>
      </div>
    </div>
  )
}

