// app.js — после инициализации Firebase
const auth = firebase.auth();

auth.signInAnonymously().catch(console.error);

auth.onAuthStateChanged(user => {
  if (user) {
    console.log('Текущий UID:', user.uid);
    // Показываем UID в интерфейсе
    const uidElement = document.createElement('div');
    uidElement.textContent = `UID: ${user.uid}`;
    uidElement.style.cssText = 'margin-top: 20px; padding: 10px; background: #ffecb3; border-radius: 8px; word-break: break-all;';
    document.getElementById('greetingScreen').appendChild(uidElement);
  }
});