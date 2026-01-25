import PublicCollectionPage from './PublicCollectionPage'

interface PageProps {
  params: Promise<{ id: string; 'share-token': string }>
}

export default async function Page({ params }: PageProps) {
  const { id, 'share-token': shareToken } = await params
  return <PublicCollectionPage collectionId={id} shareToken={shareToken} />
}
