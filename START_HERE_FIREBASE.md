**НОВАЯ ВЕРСИЯ:** см. `START_PLAYER_V1.md` — новые правила Firestore и инструкция по Player System V1.

# THAOS — подключение к Firebase `thaos-beca8`

**Веб-конфигурация уже внесена в `js/firebase-config.js`.** Повторно вставлять её не нужно.

## Что осталось сделать в Firebase Console
1. Security → Authentication → Sign-in method → Email/Password → Enable → Save.
2. Databases & Storage → Firestore → Create database → Standard edition → `(default)` → регион → **Production mode** → Create.
3. Firestore → Rules: вставить содержимое корневого `firestore.rules` и нажать Publish.
4. Authentication → Settings → Authorized domains: если сайт размещён на GitHub Pages, добавить `yourusername.github.io` (без https:// и пути), если отсутствует. Для локальной проверки добавить `localhost`, если отсутствует.
5. Разместить содержимое архива в корне репозитория GitHub, убедиться, что `index.html` в корне, включить Settings → Pages → main → /(root).
6. После публикации открыть `auth.html`, зарегистрировать тестовый аккаунт, затем проверить Firebase Authentication → Users и Firestore → Data → users/{uid}.

## Ограничения
- Firebase-проект и сервисы включаются **владельцем через консоль**; архив сам их не создаёт.
- Текущие Firestore Rules позволяют профили `users/{uid}` только самим владельцам. Персонажи и кампании пока закрыты.
- Для тестирования сайта используйте HTTP(S) через GitHub Pages или локальный веб-сервер. Не открывайте auth.html через `file://`.
- Файл `privacy.html` — черновик; перед запуском для публики нужна реальная политика конфиденциальности.
- Не публикуйте приватные ключи Firebase Admin SDK, сервисные аккаунты или пароли.

Более подробная инструкция: `FIREBASE_SETUP.md`.
