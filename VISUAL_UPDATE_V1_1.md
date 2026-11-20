# THAOS V1.1 — Visual Update

Основа: THAOS Player V1 LIGHT (без замены игровых механик, аккаунтов и Firestore).

Изменения:
- Главная: авторский фон с огромной статуей (`assets/home/thaos-statue-hero.webp`), перераспределён заголовок и кнопки, мягкий параллакс курсора. Взята одобренная версия изображения БЕЗ диагональных цветных полос.
- Регистрация: одобренная сцена падения в бездну (`assets/auth/thaos-abyss-auth.webp`), затемнение под форму, мягкий параллакс.
- Мир: загруженный пользователем `taos-map.svg` поставлен поверх старого файла, 23 маркера сохранены, пропорции canvas синхронизированы с viewBox 4071.54 × 4103.92.
- Досье 13 классов: вместо «Прогрессия» выводится индивидуальная «Боевая роль»; прогрессия навыков и модуль Core не менялись.
- Исходные классовые и расовые арты, активности, Firebase-конфигурация, экран игрока и права Firestore сохранены из V1 LIGHT.

Внесённые файлы: `index.html`, `auth.html`, `world.html`, `class.html`, `js/class-data.js`, `js/class-page.js`, `assets/world/taos-map.svg`, `assets/world/atlas-markers.json`, `css/player.css` (синхронизация пропорций карты игрока). Добавлены: `css/visual-refresh.css`, `js/hero-parallax.js`, `assets/home/thaos-statue-hero.webp`, `assets/auth/thaos-abyss-auth.webp`.

Проверка: открой главную, регистрацию (смена вкладки вход/регистрация), Мир (все 23 точки), классы (переключатель). Для теста сохранения персонажа нужен действующий Firebase Authentication и Firestore Rules.
