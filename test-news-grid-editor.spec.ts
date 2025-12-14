import { test, expect } from '@playwright/test';

test.describe('News Grid Editor Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Переходим на страницу логина
    await page.goto('http://localhost:3001/news');

    // Ждем загрузки страницы
    await page.waitForLoadState('networkidle');
  });

  test('1. Бейджи на странице /news имеют rounded-full', async ({ page }) => {
    // Находим бейджи категорий
    const categoryBadge = page.locator('.absolute.top-3.left-3').first();

    if (await categoryBadge.isVisible()) {
      // Проверяем, что бейдж имеет класс rounded-full
      const classes = await categoryBadge.getAttribute('class');
      expect(classes).toContain('rounded-full');
      console.log('✓ Бейджи категорий имеют rounded-full');
    }
  });

  test('2. Тестирование режима редактирования с логином админа', async ({ page }) => {
    // Проверяем, есть ли кнопка "Редактировать сетку"
    const editButton = page.getByRole('button', { name: /редактировать сетку/i });

    if (await editButton.isVisible()) {
      console.log('✓ Кнопка "Редактировать сетку" видна (пользователь уже авторизован)');

      // Нажимаем на кнопку "Редактировать сетку"
      await editButton.click();
      await page.waitForTimeout(1000);

      // 2.1 Проверяем белый фон sticky меню
      const stickyHeader = page.locator('.sticky.top-0.z-30');
      const headerBg = await stickyHeader.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      // rgb(255, 255, 255) = белый
      expect(headerBg).toContain('255, 255, 255');
      console.log('✓ Sticky меню имеет белый фон:', headerBg);

      // 2.2 Проверяем пропорции главной новости
      const featuredNewsContainer = page.locator('.border-4.border-amber-400').first();
      if (await featuredNewsContainer.isVisible()) {
        const height = await featuredNewsContainer.evaluate((el) => {
          return window.getComputedStyle(el).maxHeight;
        });
        expect(height).toBe('400px');
        console.log('✓ Главная новость имеет max-height: 400px');
      }

      // 2.3 Проверяем, что drag and drop работает (карточки не открываются при клике)
      const newsCards = page.locator('.cursor-move');
      const firstCard = newsCards.first();

      if (await firstCard.isVisible()) {
        // Проверяем, что NewsCard имеет disableLink
        const cardLink = firstCard.locator('a');
        const linkCount = await cardLink.count();

        // Если ссылок нет, значит disableLink работает
        expect(linkCount).toBe(0);
        console.log('✓ NewsCard в режиме редактирования не имеет ссылки (disableLink работает)');
      }

      console.log('✓ Все проверки режима редактирования пройдены');
    } else {
      console.log('⚠ Кнопка "Редактировать сетку" не видна - требуется авторизация как админ');

      // Если пользователь не авторизован, можно попробовать авторизоваться
      // Но для этого нужно знать структуру формы входа
    }
  });

  test('3. Проверка всех бейджей на странице', async ({ page }) => {
    // Проверяем бейджи зданий и тегов
    const buildingBadges = page.locator('.bg-\\[hsl\\(var\\(--news-primary\\)\\)\\/10\\]');
    const tagBadges = page.locator('.border.border-border');

    const buildingCount = await buildingBadges.count();
    const tagCount = await tagBadges.count();

    console.log(`Найдено бейджей зданий: ${buildingCount}`);
    console.log(`Найдено бейджей тегов: ${tagCount}`);

    // Проверяем несколько первых бейджей
    if (buildingCount > 0) {
      const firstBuildingBadge = buildingBadges.first();
      const classes = await firstBuildingBadge.getAttribute('class');
      expect(classes).toContain('rounded-full');
      console.log('✓ Бейджи зданий имеют rounded-full');
    }

    if (tagCount > 0) {
      const firstTagBadge = tagBadges.first();
      const classes = await firstTagBadge.getAttribute('class');
      expect(classes).toContain('rounded-full');
      console.log('✓ Бейджи тегов имеют rounded-full');
    }
  });
});

test.describe('Visual Regression Tests', () => {
  test('Скриншот страницы /news', async ({ page }) => {
    await page.goto('http://localhost:3001/news');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/news-page.png', fullPage: true });
    console.log('✓ Скриншот сохранен в test-results/news-page.png');
  });
});
