'use client'

export const dynamic = 'force-dynamic'

import ModerationQueue from '@/components/moderation/ModerationQueue'
import Header from '@/components/Header'

export default function ModerationPage() {
  return (
    <>
      <Header buildings={[]} />
      <ModerationQueue />
    </>
  )
}
