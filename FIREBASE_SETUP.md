# THAOS — запуск GitHub Pages + Firebase (регистрация и профили)

**Основа:** присланный архив `ha(1).rar`. Исходные классы, расы, арты, карта, Core и игровые данные не заменялись.

## 1. Подготовка GitHub Pages

1. Распакуйте **содержимое** `THAOS-Firebase-Starter.zip` в отдельную папку. Не загружайте ZIP/RAR в репозиторий как единственный файл.
2. Создайте репозиторий на GitHub или откройте существующий репозиторий сайта THAOS.
3. Загрузите **файлы из распакованной папки** в корень ветки `main`: `index.html`, `auth.html`, `account.html`, папки `css/`, `js/`, `assets/` и т. д. Сам `index.html` должен лежать в корне, а не внутри дополнительной папки `THAOS-Firebase-Starter/`.
4. В GitHub откройте **Settings → Pages → Build and deployment → Deploy from a branch → main → /(root) → Save**.
5. Откройте адрес `https://ИМЯ-ПОЛЬЗОВАТЕЛЯ.github.io/ИМЯ-РЕПОЗИТОРИЯ/`. Путь зависит от названия репозитория. GitHub Pages поддерживает HTTPS.
6. `auth.html` и `account.html` уже присутствуют; до настройки Firebase будет выводиться понятное предупреждение, а кнопки регистрации не будут активны.

Если GitHub предлагает выбрать одну папку, загрузите её содержимое, а не её родительскую директорию. Файл `.nojekyll` сохранён.

## 2. Создание проекта Firebase

1. Перейдите на https://console.firebase.google.com/ и создайте проект, например `THAOS`.
2. Google Analytics для первых тестов можно отключить.
3. На экране Project Overview нажмите **Web (значок </>)** и зарегистрируйте веб-приложение, например `THAOS Web`. Firebase Hosting подключать **не нужно**, если сайт уже работает на GitHub Pages.
4. В **Project settings → General → Your apps → SDK setup and configuration → Config** найдите объект `firebaseConfig`.
5. Скопируйте значения из него в **`js/firebase-config.js`**, заменив `PASTE_...` на настоящие значения. Нужны `apiKey`, `authDomain`, `projectId`, `appId`. Другие поля можно добавить, если они есть в выдаче Firebase.

Firebase Web config — публичные идентификаторы проекта; это **не секретный API-ключ с административными правами**. Ограничение доступа определяется Firebase Authentication и Firestore Security Rules. Нельзя публиковать Service Account JSON, приватные ключи, пароли или Firebase Admin SDK credentials.

## 3. Включить вход и регистрацию

1. В Firebase Console откройте **Authentication → Sign-in method**.
2. Включите **Email/Password** и сохраните. Passwordless Email Link включать для этой версии не обязательно.
3. В **Authentication → Settings → Authorized domains** добавьте свой домен GitHub Pages **без протокола и пути**, например `username.github.io`, если его нет. Для тестов через localhost добавьте `localhost` отдельно, если он отсутствует. Для редиректов и последующего входа через Google корректный домен особенно важен.
4. Дождитесь публикации файлов сайта, затем проверьте `auth.html`.

## 4. Создать Cloud Firestore

1. В консоли откройте **Firestore Database** (или Databases & Storage → Firestore) → **Create database**.
2. Выберите **Standard edition**, базу `(default)` и регион размещения, который подходит аудитории и требованиям к данным. Регион после создания не всегда можно свободно изменить.
3. Выберите **Production mode** — он изначально всё запрещает (безопаснее, чем Test mode).
4. В разделе **Rules** вставьте содержимое приложенного **`firestore.rules`** и нажмите **Publish**. Для текущей версии разрешены только документы `users/{uid}` собственного аккаунта.
5. **Коллекцию `users` вручную создавать не нужно**. Когда пользователь зарегистрируется, веб-приложение создаст документ `users/{его-uid}` со следующими полями:
   - `uid`: ID пользователя Firebase Auth;
   - `displayName`: имя в THAOS;
   - `createdAt`: серверное время.

**Пароль в Firestore не записывается.** Аутентификация выполняется Firebase Authentication.

Если увидите `Missing or insufficient permissions`, проверьте: правила опубликованы именно в нужном проекте/базе, `firebaseConfig.projectId` совпадает, и вы действительно вошли.

## 5. Как протестировать

1. Обновите репозиторий с заполненным `js/firebase-config.js` (и проверьте наличие новых страниц и папок).
2. Откройте сайт по HTTPS через GitHub Pages, затем страницу «Вход / Регистрация».
3. Переключитесь на «Регистрация», заполните имя, email и пароль (не меньше 8 символов).
4. После отправки откроется «Мой профиль». Проверьте UID, почту и имя, затем изменение имени и выход/вход.
5. В Firebase Console → **Authentication → Users** увидите новый аккаунт.
6. В Firebase Console → **Firestore Database → Data → users** появится профиль под тем же UID.
7. Попробуйте восстановление пароля и письмо для подтверждения электронной почты. Если почта не приходит, проверьте спам и квоты/шаблоны писем Firebase.

Невозможно проверить живую регистрацию, пока нет конфигурации вашего Firebase-проекта и опубликованных Firestore Rules. Все файлы и UI готовы для этого подключения, но Firebase-проект создаёт и контролирует владелец.

## 6. Архитектура игроков и ГМов (следующий шаг)

Начальная схема:

```
Firebase Authentication:
  UID → email, password hash (управляется Firebase; не в Firestore)

Cloud Firestore:
  users/{uid}                     # приватный профиль, реализовано
  users/{uid}/characters/{id}     # персонажи, ПОКА закрыто
  campaigns/{campaignId}         # кампания, ПОКА закрыто
  campaigns/{campaignId}/members/{uid}    # членство/роль в кампании
  campaigns/{campaignId}/gmNotes/{id}     # только для ведущих
```

Не следует хранить `isGM` в редактируемом пользователем профиле и доверять переключателю в браузере. Один человек может быть игроком в одной кампании и ГМом в другой. Права должны проверяться **Firestore Rules** на основе членства в кампании, а не через скрытие кнопок CSS.

Сейчас игровые персонажи, кампании, права ГМа и связанные коллекции ещё **не созданы и не доступны**; потребуется отдельная реализация интерфейса и правил безопасности.

## 7. Куда добавлять новые арты регионов

Приоритетная папка: **`assets/world/regions/`**.

Название изображения должно совпадать с ID региона в `js/world-data.js`, например:

```
assets/world/regions/omand.webp
assets/world/regions/ermest.webp
assets/world/regions/lajdskanet.webp
assets/world/regions/grenteynr.webp
assets/world/regions/viriif.webp
assets/world/regions/forgotten.webp
```

Допускается JPG/PNG. Подключение выполняется автоматически в `region.html?id=...`. Старый путь `assets/world/kingdoms/{id}.webp` оставлен как резервный. Для красивой шапки подходят изображения 16:9, 1920×1080, с главным объектом в центральной зоне; страница использует `object-fit:cover`.

Изображение карты `assets/world/taos-map.svg` не изменено. Арты локаций в этой сборке не добавлялись, только подготовлены места.

## 8. Перед публичным запуском

- Завершите политику конфиденциальности (сейчас `privacy.html` явно помечен как черновик), информацию об операторе данных и контакт для запросов на удаление данных.
- Добавьте удаление аккаунта / экспорт данных, политику хранения и правила использования сайта; при работе с пользователями в ЕС учитывайте GDPR.
- Проверьте Auth и Firestore Rules с тестовыми аккаунтами, а также лимиты Firebase, защиту от злоупотреблений и бюджетные оповещения.
- Не отключайте Firestore Rules ради теста и не давайте доступ `read, write: if true`.

## Официальная документация

- Firebase Web SDK: https://firebase.google.com/docs/web/alt-setup
- Authentication email/password: https://firebase.google.com/docs/auth/web/password-auth
- Cloud Firestore: https://firebase.google.com/docs/firestore/quickstart
- Firestore Rules: https://firebase.google.com/docs/firestore/security/rules-conditions
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
