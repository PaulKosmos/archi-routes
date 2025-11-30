#!/usr/bin/env node

const { chromium } = require('playwright');

async function testPodcastsPage() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('🎬 Testing /podcasts page with Playwright...\n');
    
    // Navigate to podcasts page
    console.log('📍 Navigating to http://localhost:3000/podcasts...');
    await page.goto('http://localhost:3000/podcasts', { waitUntil: 'networkidle' });
    
    // Wait a bit to see if content loads
    await page.waitForTimeout(2000);
    
    console.log('✅ Page loaded\n');

    // Check page title
    const title = await page.title();
    console.log(`📄 Page Title: ${title}`);

    // Check for console errors
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(`[ERROR] ${msg.text()}`);
      }
    });

    // Get page HTML to analyze
    const html = await page.content();
    
    // Check for specific elements
    console.log('\n🔍 Checking for key elements:');
    
    const hasHeroSection = html.includes('hero') || html.includes('podcast');
    console.log(`   - Hero section: ${hasHeroSection ? '✅' : '❌'}`);

    const hasPodcastCards = await page.$('.podcast-card') !== null || 
                            await page.$('[class*="podcast"]') !== null;
    console.log(`   - Podcast cards: ${hasPodcastCards ? '✅ Found' : '❌ Not found'}`);

    // Look for loading states
    const hasLoadingSpinner = html.includes('skeleton') || 
                             html.includes('loading') || 
                             html.includes('animate');
    console.log(`   - Loading states present: ${hasLoadingSpinner ? '⚠️  Yes' : '✅ No'}`);

    // Check for error messages
    const hasErrorMessages = html.includes('error') && !html.includes('Error tracking');
    console.log(`   - Error messages: ${hasErrorMessages ? '❌ Yes' : '✅ No'}`);

    // Check network requests
    const requests = [];
    page.on('request', request => {
      if (request.resourceType() === 'fetch' || request.resourceType() === 'xhr') {
        requests.push({
          url: request.url(),
          method: request.method(),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Wait and capture network activity
    await page.waitForTimeout(1000);

    console.log('\n🌐 Network Activity:');
    if (requests.length > 0) {
      requests.slice(0, 5).forEach((req, i) => {
        const url = new URL(req.url);
        console.log(`   ${i + 1}. ${req.method} ${url.pathname}${url.search}`);
      });
    } else {
      console.log('   (No API requests detected)');
    }

    // Check for infinite loops or excessive re-renders
    console.log('\n🔄 Checking for re-render issues:');
    
    const bodyText = await page.locator('body').textContent();
    
    if (bodyText.includes('constantly') || bodyText.includes('updating')) {
      console.log('   ⚠️  Page content mentions "constantly updating"');
    }

    // Take a screenshot
    await page.screenshot({ path: 'podcast-page-test.png' });
    console.log('\n📸 Screenshot saved: podcast-page-test.png');

    // Check if page keeps changing
    const html1 = await page.content();
    await page.waitForTimeout(2000);
    const html2 = await page.content();

    if (html1 === html2) {
      console.log('\n✅ Page is stable (no constant updates)');
    } else {
      console.log('\n⚠️  Page content is changing frequently');
      
      // Find what's changing
      const changes = [];
      if (html1.includes('skeleton') && !html2.includes('skeleton')) {
        changes.push('Skeleton loaders being replaced with content');
      }
      if (html1.length !== html2.length) {
        changes.push(`DOM size changed: ${html1.length} → ${html2.length} bytes`);
      }
      
      if (changes.length > 0) {
        console.log('\n   Changes detected:');
        changes.forEach(c => console.log(`   - ${c}`));
      }
    }

    // Check for specific podcast data
    console.log('\n📻 Podcast Data Check:');
    const episodeElements = await page.locator('[class*="episode"], [class*="card"]').count();
    console.log(`   - Episode cards found: ${episodeElements}`);

    if (episodeElements === 0) {
      console.log('   ❌ No episodes rendering!');
      console.log('   Possible issues:');
      console.log('      1. RLS policies blocking access');
      console.log('      2. Episodes table empty');
      console.log('      3. Component not rendering correctly');
    } else {
      console.log(`   ✅ ${episodeElements} episode elements found`);
    }

    console.log('\n✅ Test complete!\n');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testPodcastsPage();
