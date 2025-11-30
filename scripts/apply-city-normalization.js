#!/usr/bin/env node

/**
 * Скрипт для применения миграции нормализации городов
 * Применяет миграцию 021_normalize_city_search.sql
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Ошибка: Отсутствуют учетные данные Supabase');
    console.error('  NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
    console.error('  SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗');
    process.exit(1);
}

async function applyMigration() {
    try {
        console.log('🚀 Начало миграции нормализации городов...\n');

        // Создаем клиент Supabase с service role ключом
        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

        // Читаем файл миграции
        const migrationPath = path.join(__dirname, '../database/migrations/021_normalize_city_search.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        console.log('📄 Файл миграции прочитан: 021_normalize_city_search.sql');
        console.log(`📝 Размер SQL: ${migrationSQL.length} символов\n`);

        console.log('⚠️  Примечание: Прямое выполнение SQL недоступно через SDK');
        console.log('Пожалуйста, примените миграцию вручную через Supabase Dashboard:\n');
        console.log('1. Перейдите на: https://app.supabase.com/projects');
        console.log('2. Выберите ваш проект');
        console.log('3. Перейдите: SQL Editor → New Query');
        console.log('4. Скопируйте содержимое из: database/migrations/021_normalize_city_search.sql');
        console.log('5. Вставьте и нажмите: Run\n');

        console.log('📋 Или выполните команду для копирования SQL в буфер обмена:\n');
        console.log('  type database\\migrations\\021_normalize_city_search.sql | clip\n');

        console.log('✅ После применения миграции:');
        console.log('   - Города будут нормализованы при поиске');
        console.log('   - "Берлин" и "Berlin" будут найдены как один город');
        console.log('   - Поддержка кириллицы, латиницы и акцентов\n');

    } catch (error) {
        console.error('❌ Ошибка во время миграции:');
        console.error(error.message);
        process.exit(1);
    }
}

applyMigration();
