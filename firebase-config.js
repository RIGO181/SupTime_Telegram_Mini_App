const firebaseConfig = {
  apiKey: "AIzaSyCvbhVmnVZ2gpYJ4DYJN2nLK1j6fIknCEQ",
  authDomain: "suptimeadmin.firebaseapp.com",
  databaseURL: "https://suptimeadmin-default-rtdb.firebaseio.com",
  projectId: "suptimeadmin",
  storageBucket: "suptimeadmin.firebasestorage.app",
  messagingSenderId: "673812450955",
  appId: "1:673812450955:web:45baefaa5038a167938e8e",
  measurementId: "G-TDJJ5NE7KP"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();