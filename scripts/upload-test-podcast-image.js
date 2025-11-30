const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Read .env.local manually
const envPath = path.join(__dirname, '../.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function uploadTestImage() {
  try {
    console.log('📸 Uploading test podcast cover image...')

    // Create a simple test image (1x1 red pixel PNG)
    const testImagePath = path.join(__dirname, '../test-podcast-cover.png')
    
    if (!fs.existsSync(testImagePath)) {
      console.log('Creating test image...')
      const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8DwHwMhwOAqEgAAAP//AwCFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64')
      fs.writeFileSync(testImagePath, pngData)
    }

    const fileContent = fs.readFileSync(testImagePath)
    const fileName = `test-podcast-cover-${Date.now()}.png`
    const filePath = `podcasts/covers/${fileName}`

    // Upload to storage
    console.log(`Uploading to: ${filePath}`)
    const { data, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(filePath, fileContent, { upsert: true })

    if (uploadError) {
      console.error('❌ Upload error:', uploadError)
      throw uploadError
    }

    console.log('✅ Image uploaded successfully:', data)

    // Get first episode
    const { data: episodes, error: episodeError } = await supabase
      .from('podcast_episodes')
      .select('id, title')
      .limit(1)

    if (episodeError) throw episodeError
    if (!episodes || episodes.length === 0) {
      console.error('No episodes found')
      return
    }

    const episodeId = episodes[0].id
    console.log(`\n📝 Updating episode "${episodes[0].title}" with image...`)

    // Update episode with image path
    const { error: updateError } = await supabase
      .from('podcast_episodes')
      .update({ cover_image_url: filePath })
      .eq('id', episodeId)

    if (updateError) {
      console.error('❌ Update error:', updateError)
      throw updateError
    }

    console.log('✅ Episode updated with cover image')
    console.log(`\n✅ Complete! Episode ID: ${episodeId}`)
    console.log(`Cover image URL: ${filePath}`)
    console.log('\nView at: http://localhost:3000/podcasts')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

uploadTestImage()
