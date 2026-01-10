// src/app/buildings/page.tsx
// Redirect to universal search page
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Buildings Catalog - Architecture Platform',
  description: 'Catalog of architectural objects, buildings, and monuments with search and filtering by styles, architects, years of construction, and other parameters.',
  keywords: 'buildings catalog, architecture, monuments, architectural objects, building search',
  openGraph: {
    title: 'Buildings Catalog - Architecture Platform',
    description: 'Catalog of architectural objects, buildings, and monuments with smart search and filters',
    type: 'website'
  }
}

export default function BuildingsRoute() {
  // Redirect to universal search page
  redirect('/search')
}