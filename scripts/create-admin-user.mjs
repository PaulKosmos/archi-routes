#!/usr/bin/env node

/**
 * Скрипт для создания админ-пользователя
 * Использование: node scripts/create-admin-user.mjs
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

async function createAdminUser() {
  const email = 'admin@archiroutes.com';
  const password = 'Admin2024!';

  console.log('🔍 Проверка существующего админ-пользователя...\n');

  try {
    // Проверяем, существует ли уже admin
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .limit(1);

    if (existingProfiles && existingProfiles.length > 0) {
      const profile = existingProfiles[0];
      console.log('✅ Админ-пользователь уже существует:');
      console.log(`   Email: Не сохранен в таблице profiles`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   Имя: ${profile.full_name || 'Не указано'}`);
      console.log(`   Роль: ${profile.role}`);
      console.log('\n💡 Вы можете использовать существующие учетные данные для входа');
      return;
    }

    console.log('⚠️ Админ-пользователь не найден. Создаем нового...\n');

    // Создаем нового пользователя через auth API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'Admin User'
      }
    });

    if (authError) {
      console.error('❌ Ошибка при создании пользователя:', authError.message);
      return;
    }

    console.log('✅ Пользователь создан в auth.users');
    console.log(`   User ID: ${authData.user.id}`);

    // Обновляем профиль
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        full_name: 'Admin User',
        role: 'admin',
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('❌ Ошибка при обновлении профиля:', profileError.message);
      return;
    }

    console.log('✅ Профиль обновлен с ролью admin\n');
    console.log('🎉 Админ-пользователь успешно создан!');
    console.log('\n📝 Учетные данные для входа:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️ ВАЖНО: Измените пароль после первого входа!');

  } catch (error) {
    console.error('❌ Непредвиденная ошибка:', error);
  }
}

createAdminUser();
