import PublicCollectionPage from './PublicCollectionPage'

export default function Page({ params }: { params: { id: string; 'share-token': string } }) {
  return <PublicCollectionPage collectionId={params.id} shareToken={params['share-token']} />
}
