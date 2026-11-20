import { firebaseIsConfigured } from './firebase-config.js';
import { getFirebaseClient } from './firebase-client.js';

const $ = id => document.getElementById(id);
const form = $('authForm');
const submit = $('authSubmit');
const message = $('authMessage');
const nameField = $('authNameWrap');
const passRepeatWrap = $('authConfirmWrap');
const passRepeat = $('authConfirm');
const nickname = $('authNickname');
const password = $('authPassword');
const reset = $('resetPassword');
const modeTabs = [...document.querySelectorAll('[data-auth-mode]')];
let mode = new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login';
let client = null;
let authSubmitting = false;

function notice(text, kind = 'info') {
  message.textContent = text;
  message.dataset.kind = kind;
  message.hidden = !text;
}
function setMode(nextMode) {
  mode = nextMode;
  modeTabs.forEach(tab => {
    const selected = tab.dataset.authMode === mode;
    tab.setAttribute('aria-selected', String(selected));
    tab.classList.toggle('is-selected', selected);
  });
  const registration = mode === 'register';
  nameField.hidden = !registration;
  passRepeatWrap.hidden = !registration;
  nickname.required = registration;
  passRepeat.required = registration;
  password.autocomplete = registration ? 'new-password' : 'current-password';
  submit.textContent = registration ? 'Создать аккаунт →' : 'Войти в THAOS →';
  reset.hidden = registration;
  notice('');
  history.replaceState({}, '', `${location.pathname}${registration ? '?mode=register' : ''}`);
}
modeTabs.forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.authMode)));
setMode(mode);

if (!firebaseIsConfigured) {
  notice('Регистрация подготовлена, но Firebase ещё не подключён. Добавь параметры проекта в js/firebase-config.js (см. FIREBASE_SETUP.md).', 'warning');
  form.querySelectorAll('input, button').forEach(el => { el.disabled = true; });
  reset.disabled = true;
} else {
  getFirebaseClient().then(result => {
    client = result;
    result.authSdk.onAuthStateChanged(result.auth, user => {
      if (user && !authSubmitting) location.replace('./player.html#characters');
    });
  }).catch(error => notice(`Ошибка подключения: ${error.message}`, 'error'));
}

function authError(error) {
  const map = {
    'auth/email-already-in-use': 'Такой адрес уже зарегистрирован. Попробуй войти.',
    'auth/invalid-email': 'Проверь правильность адреса электронной почты.',
    'auth/weak-password': 'Пароль слишком слабый. Используй не меньше 8 символов.',
    'auth/invalid-credential': 'Неверный адрес или пароль.',
    'auth/user-disabled': 'Этот аккаунт отключён.',
    'auth/too-many-requests': 'Слишком много попыток. Попробуй позже.',
    'auth/network-request-failed': 'Нет соединения с Firebase. Проверь интернет.',
    'permission-denied': 'Доступ к профилю запрещён правилами Firestore. Проверь firestore.rules.'
  };
  return map[error.code] || 'Не удалось выполнить действие. Проверь настройки Firebase и подключение. ' + (error.code || '');
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!client) { notice('Firebase пока не готов. Проверь конфигурацию.', 'warning'); return; }
  const email = $('authEmail').value.trim();
  const pw = password.value;
  const displayName = nickname.value.trim();
  if (mode === 'register') {
    if (displayName.length < 2 || displayName.length > 32) { notice('Имя должно быть длиной от 2 до 32 символов.', 'error'); return; }
    if (pw.length < 8) { notice('Пароль должен содержать минимум 8 символов.', 'error'); return; }
    if (pw !== passRepeat.value) { notice('Пароли не совпадают.', 'error'); return; }
  }
  authSubmitting = true;
  submit.disabled = true;
  submit.textContent = 'Подключаемся к Системе…';
  notice('');
  try {
    const {auth, db, authSdk, firestoreSdk} = client;
    try { await authSdk.setPersistence(auth, authSdk.browserLocalPersistence); }
    catch (persistenceError) { console.warn('THAOS: не удалось задать постоянную сессию', persistenceError.code); }
    if (mode === 'register') {
      const {user} = await authSdk.createUserWithEmailAndPassword(auth, email, pw);
      await authSdk.updateProfile(user, { displayName });
      try {
        await firestoreSdk.setDoc(firestoreSdk.doc(db, 'users', user.uid), {
          uid: user.uid,
          displayName,
          createdAt: firestoreSdk.serverTimestamp()
        });
      } catch (profileError) {
        // Account is already created in Authentication. Do not claim registration failed.
        console.warn('THAOS: account created, profile write pending', profileError.code);
        sessionStorage.setItem('thaos_profile_notice', 'Аккаунт создан, но запись профиля в Firestore не удалась. Проверь правила Firestore.');
      }
      try { await authSdk.sendEmailVerification(user); }
      catch (verifyError) { console.warn('THAOS: verification email not sent', verifyError.code); }
      location.replace('./player.html#characters');
      return;
    }
    await authSdk.signInWithEmailAndPassword(auth, email, pw);
    location.replace('./player.html#characters');
  } catch (error) {
    notice(authError(error), 'error');
    authSubmitting = false;
    submit.disabled = false;
    submit.textContent = mode === 'register' ? 'Создать аккаунт →' : 'Войти в THAOS →';
  }
});

reset.addEventListener('click', async () => {
  if (!client) return;
  const email = $('authEmail').value.trim();
  if (!email) { notice('Сначала введи электронную почту, затем нажми «Восстановить пароль».', 'warning'); $('authEmail').focus(); return; }
  reset.disabled = true;
  try {
    await client.authSdk.sendPasswordResetEmail(client.auth, email);
    notice('Если аккаунт с таким адресом существует, на почту придёт письмо для восстановления.', 'success');
  } catch (error) { notice(authError(error), 'error'); }
  reset.disabled = false;
});
