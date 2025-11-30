#!/usr/bin/env node

/**
 * Скрипт для проверки блоков сетки новостей в базе данных
 * Использование: node scripts/check-grid-blocks.mjs
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

async function checkGridBlocks() {
  console.log('🔍 Проверка блоков сетки новостей...\n');

  try {
    // Получаем все блоки
    const { data: blocks, error: blocksError } = await supabase
      .from('news_grid_blocks')
      .select('*')
      .order('position', { ascending: true });

    if (blocksError) {
      console.error('❌ Ошибка при получении блоков:', blocksError);
      return;
    }

    console.log(`📊 Всего блоков в базе данных: ${blocks?.length || 0}\n`);

    if (!blocks || blocks.length === 0) {
      console.log('⚠️ Блоки сетки не найдены в базе данных');
      console.log('💡 Создайте первый блок через интерфейс на странице /news');
      return;
    }

    // Выводим информацию о каждом блоке
    for (const block of blocks) {
      console.log(`📦 Блок ID: ${block.id}`);
      console.log(`   Тип: ${block.block_type}`);
      console.log(`   Позиция: ${block.position}`);
      console.log(`   Активен: ${block.is_active ? '✅' : '❌'}`);
      console.log(`   Новости (${block.news_ids?.length || 0}): ${block.news_ids?.join(', ') || 'нет'}`);
      console.log(`   Создан: ${new Date(block.created_at).toLocaleString('ru-RU')}`);
      console.log(`   Обновлен: ${new Date(block.updated_at).toLocaleString('ru-RU')}`);
      console.log('');

      // Проверяем, существуют ли новости
      if (block.news_ids && block.news_ids.length > 0) {
        const { data: newsArticles, error: newsError } = await supabase
          .from('architecture_news')
          .select('id, title, status')
          .in('id', block.news_ids);

        if (newsError) {
          console.log(`   ⚠️ Ошибка при проверке новостей: ${newsError.message}`);
        } else {
          console.log(`   📰 Новости в блоке:`);
          for (const news of newsArticles || []) {
            console.log(`      - ${news.title} (${news.status})`);
          }

          const missingIds = block.news_ids.filter(
            id => !newsArticles?.find(n => n.id === id)
          );
          if (missingIds.length > 0) {
            console.log(`   ⚠️ Отсутствующие новости: ${missingIds.join(', ')}`);
          }
        }
        console.log('');
      }
    }

    // Статистика
    const activeBlocks = blocks.filter(b => b.is_active);
    const inactiveBlocks = blocks.filter(b => !b.is_active);

    console.log('\n📈 Статистика:');
    console.log(`   Активных блоков: ${activeBlocks.length}`);
    console.log(`   Неактивных блоков: ${inactiveBlocks.length}`);

    const blockTypes = blocks.reduce((acc, b) => {
      acc[b.block_type] = (acc[b.block_type] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 Распределение по типам:');
    for (const [type, count] of Object.entries(blockTypes)) {
      console.log(`   ${type}: ${count}`);
    }

  } catch (error) {
    console.error('❌ Непредвиденная ошибка:', error);
  }
}

checkGridBlocks();
