# 📋 Homepage News & Blog Sections - Fix Guide

## Problem Summary

The News Section and Blog Posts Section were not visible on the homepage due to:
1. **Missing `architecture_news` table** - Was referenced but never created in the database
2. **Supabase relationship cache issues** - Relationship joins failing between tables and profiles
3. **Storage bucket misconfigurations** - Wrong bucket names used for image URLs

## Solution Applied

### ✅ Code Fixes (Completed)

#### 1. BlogPostsSection.tsx
- **Issue**: Used incorrect storage bucket 'blog' (doesn't exist)
- **Fix**: Changed to 'photos' bucket which is available
- **Issue**: Failed relationship join with profiles table
- **Fix**: Refactored to fetch author data separately (2-query approach)

#### 2. NewsSection.tsx
- **Issue**: Used incorrect storage bucket 'news' (doesn't exist)  
- **Fix**: Changed to 'photos' bucket which is available
- **Issue**: Referenced non-existent `architecture_news` table
- **Issue**: Failed relationship join with profiles table
- **Fix**: Refactored to fetch author data separately (2-query approach)

#### 3. EnhancedFooter.tsx
- **Status**: No changes needed (already working correctly)

### ⚠️ Database Schema - Action Required

The application now works with graceful fallbacks, but to enable full functionality, you need to create the missing `architecture_news` table:

## How to Apply the Migration

### Option 1: Using Supabase Web Console (Recommended)

1. Go to https://app.supabase.com/
2. Login and select your project: `jkozshkubprsvkayfvhf`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of: `database/migrations/014_create_news_tables.sql`
6. Click **Run** button
7. You should see messages like "CREATE TABLE" and other success confirmations

### Option 2: Using Supabase CLI

If you have Supabase CLI installed locally:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to your Supabase account
supabase login

# Link to your project
supabase link --project-ref jkozshkubprsvkayfvhf

# Apply the migration
supabase db push
```

### Option 3: Using SQL Editor with Individual Statements

If copying the full file doesn't work, execute the SQL in sections:

1. **Create tables:**
```sql
-- Copy the table creation section from database/migrations/014_create_news_tables.sql
-- Lines: CREATE TABLE IF NOT EXISTS architecture_news ...
-- through CREATE INDEX ... news_tags_slug
```

2. **Create functions and triggers:**
```sql
-- Copy the triggers section from the migration file
```

3. **Enable RLS and create policies:**
```sql
-- Copy the RLS section from the migration file
```

## What the Migration Creates

### Tables:
- **architecture_news** - Main table for news articles (fields: title, slug, content, featured_image_url, category, status, published_at, author_id, etc.)
- **news_interactions** - Tracks user interactions (views, likes, shares)
- **news_tags** - Tags for categorizing news

### Triggers:
- Automatic `updated_at` timestamp updates
- Statistics counters for views, likes, shares

### RLS Policies:
- Published news articles accessible to all users
- Authors can manage their own articles

## After Migration: Add Test Data

To verify the sections display correctly, add some test news:

```sql
INSERT INTO architecture_news (
  title, slug, summary, content, status, 
  category, published_at, author_id
) VALUES (
  'Modern Architecture in Tokyo',
  'modern-architecture-tokyo',
  'Explore the latest architectural innovations in Tokyo',
  '<p>Full article content here...</p>',
  'published',
  'projects',
  NOW(),
  'USER_ID_HERE'  -- Replace with an actual profile ID from the profiles table
);
```

To find an author ID:
```sql
SELECT id, email, display_name FROM profiles LIMIT 5;
```

## Troubleshooting

### Issue: "Table does not exist" error in browser console

**Solution**: Run the migration file in Supabase SQL Editor

### Issue: "Could not find relationship" error

**Solution**: This is normal if the table doesn't exist. The code now handles this gracefully and will automatically start working once you apply the migration.

### Issue: "Permission denied" error when creating tables

**Solution**: 
- Make sure you're using your service role key, not the anon key
- Ensure your Supabase account has write permissions
- Contact Supabase support if permissions are restricted

### Issue: Blog/News posts not showing even after migration

**Causes**:
1. No published posts in the database
2. Published posts have no `published_at` timestamp
3. Posts marked as 'draft' instead of 'published'

**Check published content:**
```sql
SELECT id, title, status, published_at FROM blog_posts WHERE status = 'published';
SELECT id, title, status, published_at FROM architecture_news WHERE status = 'published';
```

## How the Fix Works

### Before (Broken):
```typescript
// This failed because the relationship didn't exist
const { data } = await supabase
  .from('blog_posts')
  .select(`
    *,
    author:profiles!author_id (...)  // ❌ This relationship failed
  `)
```

### After (Working):
```typescript
// Step 1: Fetch posts without relationship
const { data } = await supabase
  .from('blog_posts')
  .select('*')  // ✅ No relationship join

// Step 2: Fetch author data separately  
const { data: authors } = await supabase
  .from('profiles')
  .select('id, display_name, ...')
  .in('id', authorIds)

// Step 3: Merge the data manually
const postsWithAuthors = data.map(post => ({
  ...post,
  author: authorsMap.get(post.author_id)
}))
```

## Current Status

- ✅ Code refactored to work without relationship joins
- ✅ Storage bucket issues fixed
- ⏳ **Waiting for migration**: `architecture_news` table needs to be created
- ⏳ **Waiting for test data**: News and blog posts need to be added

## Next Steps

1. **Apply the migration** using the methods above
2. **Test the sections** by refreshing http://localhost:3001
3. **Add test data** using the SQL commands provided
4. **Verify sections display** with real content

## File References

- **Components Modified**:
  - `src/components/BlogPostsSection.tsx` - Refactored author fetch logic
  - `src/components/NewsSection.tsx` - Refactored author fetch logic + error handling
  - `src/components/EnhancedFooter.tsx` - No changes (already working)

- **Migration File**:
  - `database/migrations/014_create_news_tables.sql` - Contains all SQL to create news infrastructure

- **Configuration**:
  - `.env.local` - Supabase project URL and keys

---

**Last Updated**: 2025-11-02  
**Status**: Ready for Migration  
**Support**: Check browser console (F12) for any remaining errors after migration
