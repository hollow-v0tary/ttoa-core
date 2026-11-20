import { firebaseIsConfigured } from './firebase-config.js';
import { getFirebaseClient } from './firebase-client.js';

const $ = id => document.getElementById(id);
const status = $('accountStatus');
const detail = $('accountPrivate');
const showNotice = (message, kind = 'info') => {
  status.hidden = !message;
  status.textContent = message;
  status.dataset.kind = kind;
};
let client;
let currentUser;
if (!firebaseIsConfigured) {
  showNotice('Firebase пока не настроен. Заполни js/firebase-config.js по инструкции FIREBASE_SETUP.md.', 'warning');
  $('accountLoading').hidden = false;
  $('accountLoading').textContent = 'Вход будет доступен после подключения Firebase.';
} else {
  getFirebaseClient().then(result => {
    client = result;
    result.authSdk.onAuthStateChanged(result.auth, async user => {
      if (!user) { location.replace('./auth.html'); return; }
      currentUser = user;
      $('accountLoading').hidden = true;
      detail.hidden = false;
      $('profileName').textContent = user.displayName || 'Путешественник';
      $('profileEmail').textContent = user.email || '—';
      $('profileUid').textContent = user.uid;
      $('profileVerify').textContent = user.emailVerified ? 'Подтверждена' : 'Не подтверждена';
      $('resendVerification').hidden = Boolean(user.emailVerified);
      $('editNickname').value = user.displayName || '';
      const notice = sessionStorage.getItem('thaos_profile_notice');
      if (notice) { showNotice(notice, 'warning'); sessionStorage.removeItem('thaos_profile_notice'); }
      try {
        const snap = await result.firestoreSdk.getDoc(result.firestoreSdk.doc(result.db, 'users', user.uid));
        if (!snap.exists()) {
          await result.firestoreSdk.setDoc(result.firestoreSdk.doc(result.db, 'users', user.uid), {
            uid: user.uid,
            displayName: user.displayName || 'Путешественник',
            createdAt: result.firestoreSdk.serverTimestamp()
          });
          showNotice('Профиль Firestore успешно создан.', 'success');
        }
      } catch (error) {
        showNotice('Вы вошли, но профиль Firestore пока недоступен. Проверь правила безопасности.', 'warning');
      }
    });
  }).catch(error => showNotice(`Ошибка подключения Firebase: ${error.message}`, 'error'));
}

$('profileEditForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!client || !currentUser) return;
  const newName = $('editNickname').value.trim();
  if (newName.length < 2 || newName.length > 32) { showNotice('Имя должно содержать от 2 до 32 символов.', 'error'); return; }
  const btn = $('profileSave');
  btn.disabled = true;
  try {
    await client.authSdk.updateProfile(currentUser, { displayName: newName });
    const ref = client.firestoreSdk.doc(client.db, 'users', currentUser.uid);
    await client.firestoreSdk.updateDoc(ref, { displayName: newName });
    $('profileName').textContent = newName;
    showNotice('Имя обновлено.', 'success');
  } catch (error) {
    showNotice('Имя в Firebase Authentication обновлено, но Firestore мог не сохранить изменения. Проверь правила и подключение.', 'warning');
  } finally { btn.disabled = false; }
});

$('resendVerification').addEventListener('click', async () => {
  if (!client || !currentUser) return;
  const btn=$('resendVerification'); btn.disabled=true;
  try {
    await client.authSdk.sendEmailVerification(currentUser);
    showNotice('Письмо с подтверждением отправлено. Проверь входящие и спам.', 'success');
  } catch (error) { showNotice('Не удалось отправить письмо. Попробуй позже.', 'error'); }
  finally { btn.disabled=false; }
});

$('signOut').addEventListener('click', async () => {
  if(!client)return;
  $('signOut').disabled = true;
  try { await client.authSdk.signOut(client.auth); location.replace('./index.html'); }
  catch { showNotice('Не удалось выйти из аккаунта.', 'error'); $('signOut').disabled = false; }
});
