import { firebaseIsConfigured } from './firebase-config.js';
import { getFirebaseClient } from './firebase-client.js';

const accountLink = document.querySelector('a.account');
if (accountLink && firebaseIsConfigured) {
  getFirebaseClient().then(({ auth, authSdk, db, firestoreSdk }) => {
    let authRevision = 0;
    authSdk.onAuthStateChanged(auth, user => {
      const revision = ++authRevision;
      document.querySelector('.admin-shortcut')?.remove();
      accountLink.textContent = user ? 'Мой профиль' : 'Вход / Регистрация';
      accountLink.href = user ? './account.html' : './auth.html';
      accountLink.classList.toggle('account--signed', Boolean(user));
      // Only a Firebase Console-appointed Master can see the CMS shortcut.
      // Firestore and Storage rules independently enforce write permissions.
      const existingAdminLink=document.querySelector('.admin-shortcut');
      if(!user && existingAdminLink)existingAdminLink.remove();
      if(user){
        
        firestoreSdk.getDoc(firestoreSdk.doc(db,'siteAdmins',user.uid)).then(snap=>{
          if (revision !== authRevision || !snap.exists() || snap.data()?.enabled!==true) return;
          if(document.querySelector('.admin-shortcut'))return;
          const link=document.createElement('a');link.className='admin-shortcut';link.href='./admin.html';link.textContent='Редактор';
          (document.querySelector('.site-header .nav')||document.querySelector('.site-header')).append(link);
        }).catch(()=>{});
      }
      const nav = document.querySelector('.site-header .nav');
      if (nav) {
        let playerLink = nav.querySelector('.nav-player');
        if (user && !playerLink) {
          playerLink = document.createElement('a');
          playerLink.className = 'nav-player';
          playerLink.href = './player.html#dashboard';
          playerLink.textContent = 'Игрок';
          nav.appendChild(playerLink);
        } else if (!user && playerLink) {
          playerLink.remove();
        }
      }
    });
  }).catch(() => { /* Preserve normal navigation if temporarily offline. */ });
}
