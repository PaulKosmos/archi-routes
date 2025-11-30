// src/utils/pdfExport.ts - Утилиты для экспорта коллекций в PDF
import { Collection, prepareCollectionForPDF } from './collectionsUtils'

// Интерфейс для настроек экспорта
interface PDFExportOptions {
  includeImages?: boolean
  includePersonalNotes?: boolean
  includeVisitDates?: boolean
  includeStatistics?: boolean
  pageSize?: 'A4' | 'Letter'
  language?: 'ru' | 'en'
}

// Функция экспорта коллекции в PDF
export async function exportCollectionToPDF(
  collection: Collection, 
  options: PDFExportOptions = {}
): Promise<void> {
  // Настройки по умолчанию
  const {
    includeImages = true,
    includePersonalNotes = true,
    includeVisitDates = true,
    includeStatistics = true,
    pageSize = 'A4',
    language = 'ru'
  } = options

  try {
    // Динамический импорт jsPDF для уменьшения размера бандла
    const { default: jsPDF } = await import('jspdf')
    
    // Подготавливаем данные
    const pdfData = prepareCollectionForPDF(collection)
    
    // Создаем новый PDF документ
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: pageSize.toLowerCase() as any
    })

    // Настройки страницы
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - 2 * margin
    const lineHeight = 7
    let currentY = margin

    // Функция для добавления новой страницы
    const addNewPage = () => {
      doc.addPage()
      currentY = margin
    }

    // Функция для проверки необходимости новой страницы
    const checkPageBreak = (heightNeeded: number) => {
      if (currentY + heightNeeded > pageHeight - margin) {
        addNewPage()
      }
    }

    // Функция для добавления текста с переносом
    const addWrappedText = (text: string, fontSize: number, fontStyle: string = 'normal') => {
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', fontStyle)
      
      const lines = doc.splitTextToSize(text, contentWidth)
      const textHeight = lines.length * lineHeight
      
      checkPageBreak(textHeight)
      
      lines.forEach((line: string) => {
        doc.text(line, margin, currentY)
        currentY += lineHeight
      })
      
      currentY += 3 // Дополнительный отступ
    }

    // Заголовок документа
    addWrappedText(`Коллекция: ${pdfData.title}`, 20, 'bold')
    currentY += 5

    // Описание коллекции
    if (pdfData.description) {
      addWrappedText(pdfData.description, 12, 'normal')
      currentY += 5
    }

    // Информация о коллекции
    const infoText = [
      `Создана: ${pdfData.createdAt}`,
      `Зданий в коллекции: ${pdfData.buildingCount}`,
      `Экспортировано: ${new Date().toLocaleDateString('ru-RU')}`
    ].join(' • ')
    
    addWrappedText(infoText, 10, 'italic')
    currentY += 10

    // Статистика (если включена)
    if (includeStatistics && pdfData.buildings.length > 0) {
      addWrappedText('Статистика коллекции:', 14, 'bold')
      
      const cities = new Set(pdfData.buildings.map(b => b.city).filter(Boolean))
      const architects = new Set(pdfData.buildings.map(b => b.architect).filter(Boolean))
      const avgRating = pdfData.buildings.length > 0 
        ? pdfData.buildings.reduce((sum, b) => sum + b.rating, 0) / pdfData.buildings.length
        : 0
      const visitedCount = pdfData.buildings.filter(b => b.visitDate).length
      
      const statsText = [
        `Городов: ${cities.size}`,
        `Архитекторов: ${architects.size}`,
        `Средний рейтинг: ${avgRating.toFixed(1)}`,
        `Посещено: ${visitedCount} из ${pdfData.buildings.length}`
      ].join(' • ')
      
      addWrappedText(statsText, 10, 'normal')
      currentY += 10
    }

    // Список зданий
    if (pdfData.buildings.length > 0) {
      addWrappedText('Здания в коллекции:', 16, 'bold')
      currentY += 5

      pdfData.buildings.forEach((building, index) => {
        checkPageBreak(40) // Минимальная высота для здания

        // Номер и название здания
        addWrappedText(`${index + 1}. ${building.name}`, 12, 'bold')

        // Основная информация
        const buildingInfo = []
        if (building.architect) buildingInfo.push(`Архитектор: ${building.architect}`)
        if (building.city) buildingInfo.push(`Город: ${building.city}`)
        if (building.year) buildingInfo.push(`Год: ${building.year}`)
        if (building.rating > 0) buildingInfo.push(`Рейтинг: ${building.rating}/5`)

        if (buildingInfo.length > 0) {
          addWrappedText(buildingInfo.join(' • '), 10, 'normal')
        }

        // Даты (если включены)
        if (includeVisitDates) {
          const dates = []
          if (building.visitDate) dates.push(`Посещено: ${building.visitDate}`)
          dates.push(`Добавлено: ${building.addedAt}`)
          
          if (dates.length > 0) {
            addWrappedText(dates.join(' • '), 9, 'italic')
          }
        }

        // Личная заметка (если включена)
        if (includePersonalNotes && building.personalNote) {
          addWrappedText(`Заметка: ${building.personalNote}`, 10, 'normal')
        }

        // Изображение (если включено и доступно)
        if (includeImages && building.image) {
          try {
            checkPageBreak(60) // Высота для изображения
            
            // Загружаем изображение (в реальном приложении нужна более сложная логика)
            // Здесь просто добавляем placeholder
            doc.setFillColor(240, 240, 240)
            doc.rect(margin, currentY, contentWidth, 50, 'F')
            
            doc.setFontSize(8)
            doc.setTextColor(100)
            doc.text('Изображение здания', margin + 5, currentY + 25)
            doc.setTextColor(0)
            
            currentY += 55
          } catch (imageError) {
            console.warn('Ошибка загрузки изображения:', imageError)
          }
        }

        currentY += 10 // Отступ между зданиями
      })
    }

    // Футер на последней странице
    currentY = pageHeight - margin - 20
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text('Создано с помощью ArchiRoutes • archiroutes.com', margin, currentY)
    doc.setTextColor(0)

    // Сохраняем файл
    const fileName = `${pdfData.title.replace(/[^a-zA-Z0-9а-яё\s]/gi, '')}.pdf`
    doc.save(fileName)

  } catch (error) {
    console.error('Ошибка экспорта в PDF:', error)
    throw new Error('Не удалось экспортировать коллекцию в PDF')
  }
}

// Функция для экспорта нескольких коллекций в один PDF
export async function exportMultipleCollectionsToPDF(
  collections: Collection[],
  options: PDFExportOptions = {}
): Promise<void> {
  if (collections.length === 0) {
    throw new Error('Нет коллекций для экспорта')
  }

  try {
    const { default: jsPDF } = await import('jspdf')
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: options.pageSize?.toLowerCase() as any || 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    let currentY = margin

    // Заголовок документа
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Мои коллекции архитектуры', margin, currentY)
    currentY += 15

    // Информация об экспорте
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.text(`Экспортировано: ${new Date().toLocaleDateString('ru-RU')}`, margin, currentY)
    doc.text(`Всего коллекций: ${collections.length}`, margin, currentY + 5)
    currentY += 20

    // Содержание
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Содержание:', margin, currentY)
    currentY += 10

    collections.forEach((collection, index) => {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`${index + 1}. ${collection.name} (${collection.building_count || 0} зданий)`, margin + 5, currentY)
      currentY += 7
    })

    // Экспортируем каждую коллекцию
    for (let i = 0; i < collections.length; i++) {
      doc.addPage()
      
      // Здесь можно добавить логику экспорта каждой коллекции
      // Для простоты добавляем заголовок
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(`${i + 1}. ${collections[i].name}`, margin, margin)
    }

    // Сохраняем файл
    const fileName = `Мои_коллекции_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)

  } catch (error) {
    console.error('Ошибка экспорта коллекций в PDF:', error)
    throw new Error('Не удалось экспортировать коллекции в PDF')
  }
}

// Функция для генерации публичной ссылки на коллекцию
export function generateCollectionShareLink(
  collectionId: string, 
  collectionName: string
): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const shareUrl = `${baseUrl}/collections/${collectionId}`
  
  return shareUrl
}

// Функция для создания текста для социальных сетей
export function generateSocialShareText(
  collection: Collection,
  shareUrl: string
): {
  twitter: string
  facebook: string
  telegram: string
  email: string
} {
  const title = collection.name
  const description = collection.description || ''
  const buildingCount = collection.building_count || 0
  
  const baseText = `${title} — коллекция из ${buildingCount} архитектурных зданий`
  const fullText = description 
    ? `${baseText}. ${description.slice(0, 100)}${description.length > 100 ? '...' : ''}`
    : baseText

  return {
    twitter: `${fullText} ${shareUrl} #архитектура #ArchiRoutes`,
    facebook: fullText,
    telegram: `${fullText}\n\n${shareUrl}`,
    email: `Посмотрите мою коллекцию архитектурных зданий "${title}"\n\n${description}\n\nСсылка: ${shareUrl}\n\nСоздано с помощью ArchiRoutes`
  }
}

// Функция для экспорта коллекции в JSON
export function exportCollectionToJSON(collection: Collection): void {
  const exportData = {
    name: collection.name,
    description: collection.description,
    created_at: collection.created_at,
    is_public: collection.is_public,
    building_count: collection.building_count,
    buildings: collection.buildings?.map(cb => ({
      building_name: cb.building?.name,
      architect: cb.building?.architect,
      city: cb.building?.city,
      country: cb.building?.country,
      year_built: cb.building?.year_built,
      architectural_style: cb.building?.architectural_style,
      rating: cb.building?.rating,
      personal_note: cb.personal_note,
      visit_date: cb.visit_date,
      added_at: cb.added_at
    })) || [],
    exported_at: new Date().toISOString(),
    exported_from: 'ArchiRoutes'
  }

  const dataStr = JSON.stringify(exportData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  
  const link = document.createElement('a')
  link.href = URL.createObjectURL(dataBlob)
  link.download = `${collection.name.replace(/[^a-zA-Z0-9а-яё\s]/gi, '')}.json`
  link.click()
  
  URL.revokeObjectURL(link.href)
}
