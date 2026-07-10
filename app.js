// app.js — сразу после объявления database
const auth = firebase.auth();

auth.signInAnonymously().catch(error => {
  console.error('Ошибка анонимной аутентификации:', error);
});

auth.onAuthStateChanged(user => {
  if (user) {
    console.log('UID:', user.uid);
    // Показываем UID на главном экране
    const uidElement = document.createElement('div');
    uidElement.id = 'adminUidDisplay';
    uidElement.textContent = `Ваш UID: ${user.uid}`;
    uidElement.style.cssText = 'margin-top: 10px; padding: 10px; background: #ffecb3; border-radius: 8px; word-break: break-all; font-size: 12px;';
    const greetingScreen = document.getElementById('greetingScreen');
    if (greetingScreen) {
      greetingScreen.appendChild(uidElement);
    }
  }
});