# Инструкция по применению миграции нормализации городов

## Важно! 
К сожалению, у MCP нет прав для выполнения DDL операций через API. Миграцию нужно применить вручную через Supabase Dashboard.

## Быстрый способ (Рекомендуется)

### Шаг 1: Откройте Supabase SQL Editor

1. Перейдите на: https://app.supabase.com/project/gkjbxupefmdnoxmirjwv/sql/new
2. Это откроет новый SQL редактор для вашего проекта

### Шаг 2: Скопируйте миграцию

Откройте файл и скопируйте его содержимое:
```
database\migrations\021_normalize_city_search.sql
```

### Шаг 3: Вставьте и запустите

1. Вставьте скопированный SQL в редактор
2. Нажмите кнопку **Run** (или Ctrl+Enter)
3. Дождитесь выполнения (займет 5-10 секунд)

### Шаг 4: Проверьте результат

После успешного выполнения вы увидите сообщения:
- ✅ Migration 021: City name normalization completed successfully
- ✅ Buildings with cities: [количество]
- ✅ Unique normalized cities: [количество]

---

## Что делает миграция

1. **Создает функцию normalize_city_name()**
   - Транслитерирует кириллицу → латиницу
   - Убирает акценты
   - Приводит к нижнему регистру

2. **Добавляет колонку city_normalized**
   - Автоматически заполняется для всех зданий
   - Индексируется для быстрого поиска

3. **Создает таблицу city_name_variants**
   - Хранит варианты названий городов
   - Берлин, Berlin, Москва, Moscow и т.д.

---

## Проверка после применения

Выполните в SQL Editor:

```sql
-- Проверка функции
SELECT 
  normalize_city_name('Берлин') as cyrillic,
  normalize_city_name('Berlin') as latin,
  normalize_city_name('BERLIN') as uppercase;

-- Все три должны вернуть: 'berlin'

-- Проверка данных
SELECT city, city_normalized, COUNT(*) 
FROM buildings 
WHERE city IS NOT NULL 
GROUP BY city, city_normalized 
ORDER BY COUNT(*) DESC 
LIMIT 10;
```

---

## Готово!

После применения миграции:
- ✅ Поиск "Берлин" найдет все здания в Berlin
- ✅ Поиск "Berlin" найдет все здания в Берлин  
- ✅ Регистр не имеет значения
- ✅ Акценты игнорируются

Код уже обновлен и готов к использованию!
