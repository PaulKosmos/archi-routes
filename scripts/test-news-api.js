// Test script to check news API functionality
// Run with: node scripts/test-news-api.js

const BASE_URL = 'http://localhost:3000'; // Change if needed

async function testNewsAPI() {
  console.log('🧪 Testing News API...\n');

  try {
    // Test 1: Get all news
    console.log('1️⃣ Testing GET /api/news');
    const allNewsResponse = await fetch(`${BASE_URL}/api/news`);
    
    if (allNewsResponse.ok) {
      const allNewsData = await allNewsResponse.json();
      console.log(`✅ Found ${allNewsData.data?.length || 0} news articles`);
      
      if (allNewsData.data && allNewsData.data.length > 0) {
        const firstNews = allNewsData.data[0];
        console.log(`   First article: "${firstNews.title}" (slug: ${firstNews.slug})`);
        
        // Test 2: Get specific news by ID
        console.log('\n2️⃣ Testing GET /api/news/[id]');
        const detailResponse = await fetch(`${BASE_URL}/api/news/${firstNews.id}`);
        
        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          console.log(`✅ Successfully fetched detailed news: "${detailData.title}"`);
        } else {
          console.log(`❌ Failed to fetch news by ID: ${detailResponse.status}`);
        }

        // Test 3: Search by slug
        console.log('\n3️⃣ Testing search by slug');
        const searchResponse = await fetch(`${BASE_URL}/api/news?search=${encodeURIComponent(firstNews.slug)}&limit=10`);
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const foundBySlug = searchData.data?.find(item => item.slug === firstNews.slug);
          
          if (foundBySlug) {
            console.log(`✅ Successfully found news by slug: "${foundBySlug.title}"`);
          } else {
            console.log(`❌ Could not find news by slug "${firstNews.slug}"`);
            console.log(`   Search returned ${searchData.data?.length || 0} results`);
          }
        } else {
          console.log(`❌ Search request failed: ${searchResponse.status}`);
        }
      } else {
        console.log('⚠️ No news articles found. Need to create test data.');
      }
    } else {
      console.log(`❌ Failed to fetch news: ${allNewsResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testNewsAPI();
