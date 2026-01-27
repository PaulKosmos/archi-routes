// src/app/test-maplibre/page.tsx - Тестовая страница MapLibre GL JS
import { Metadata } from 'next'
import TestMapLibreClient from './TestMapLibreClient'

export const metadata: Metadata = {
  title: 'Test MapLibre | Archi-Routes',
  description: 'Тестовая страница для MapLibre GL JS карты'
}

export default function TestMapLibrePage() {
  return <TestMapLibreClient />
}
