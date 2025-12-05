const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔐 Генератор хеша пароля для защиты сайта\n');

rl.question('Введите пароль для сайта: ', (password) => {
  if (!password) {
    console.log('❌ Пароль не может быть пустым');
    rl.close();
    return;
  }

  const hash = crypto.createHash('sha256').update(password).digest('hex');

  console.log('\n✅ Хеш сгенерирован успешно!\n');
  console.log('Добавьте эти строки в ваш .env.local файл:\n');
  console.log('# Защита сайта паролем');
  console.log('NEXT_PUBLIC_SITE_PASSWORD_ENABLED=true');
  console.log(`SITE_PASSWORD_HASH=${hash}`);
  console.log('\nДля отключения защиты установите:');
  console.log('NEXT_PUBLIC_SITE_PASSWORD_ENABLED=false\n');

  rl.close();
});
