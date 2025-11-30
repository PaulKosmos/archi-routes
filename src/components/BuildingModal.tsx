'use client'

import BuildingModalNew from './BuildingModalNew'
import type { Building } from '@/types/building'

interface BuildingModalProps {
  building: Building | null
  isOpen: boolean
  onClose: () => void
}

export default function BuildingModal({ building, isOpen, onClose }: BuildingModalProps) {
  return <BuildingModalNew building={building} isOpen={isOpen} onClose={onClose} />
}
