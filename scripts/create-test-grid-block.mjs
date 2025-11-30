#!/usr/bin/env node

/**
 * Скрипт для создания тестового блока сетки новостей
 * Использование: node scripts/create-test-grid-block.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Читаем переменные окружения из .env.local
const envPath = resolve(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Ошибка: NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY не установлены');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestGridBlock() {
  console.log('🔍 Создание тестового блока сетки новостей...\n');

  try {
    // Получаем ID админ-пользователя
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!adminProfile) {
      console.error('❌ Админ-пользователь не найден');
      return;
    }

    console.log(`✅ Админ ID: ${adminProfile.id}\n`);

    // Получаем опубликованные новости
    const { data: publishedNews, error: newsError } = await supabase
      .from('architecture_news')
      .select('id, title, status')
      .eq('status', 'published')
      .limit(10);

    if (newsError || !publishedNews || publishedNews.length === 0) {
      console.error('❌ Опубликованные новости не найдены:', newsError?.message);
      return;
    }

    console.log(`📰 Найдено ${publishedNews.length} опубликованных новостей\n`);

    // Создаем блок типа 'row-3' (3 новости в ряд)
    const newsIds = publishedNews.slice(0, 3).map(n => n.id);

    console.log('📦 Создание блока типа "row-3" с новостями:');
    publishedNews.slice(0, 3).forEach((news, idx) => {
      console.log(`   ${idx + 1}. ${news.title}`);
    });
    console.log('');

    const { data: newBlock, error: blockError } = await supabase
      .from('news_grid_blocks')
      .insert({
        block_type: 'row-3',
        position: 0,
        news_ids: newsIds,
        is_active: true,
        created_by: adminProfile.id
      })
      .select()
      .single();

    if (blockError) {
      console.error('❌ Ошибка при создании блока:', blockError.message);
      return;
    }

    console.log('✅ Тестовый блок успешно создан!');
    console.log(`   ID: ${newBlock.id}`);
    console.log(`   Тип: ${newBlock.block_type}`);
    console.log(`   Позиция: ${newBlock.position}`);
    console.log(`   Новостей: ${newBlock.news_ids.length}`);
    console.log(`   Активен: ${newBlock.is_active ? 'Да' : 'Нет'}`);
    console.log('\n💡 Перезагрузите страницу /news чтобы увидеть блок');

  } catch (error) {
    console.error('❌ Непредвиденная ошибка:', error);
  }
}

createTestGridBlock();
