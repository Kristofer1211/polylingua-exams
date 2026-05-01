const firebaseConfig = {
  apiKey: "AIzaSyCvvkKkLECt3hUvRRZKrGt9aNkzWl76R5A",
  authDomain: "polylinguaexams-916c3.firebaseapp.com",
  projectId: "polylinguaexams-916c3",
  storageBucket: "polylinguaexams-916c3.appspot.com",
  messagingSenderId: "624401477048",
  appId: "1:624401477048:web:93fa97858b4086b27ff34d",
  measurementId: "G-CN730L9GE4"
};

window.firebaseReady = (async function initFirebase(){
  try {
    console.log('initFirebase: loading compat SDKs');
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

    if(!window.firebase) throw new Error('firebase global missing after SDK load');

    window.firebaseApp = firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized');

    // Try to initialize Firestore and verify it works
    try {
      window.db = firebase.firestore();
      // quick read to ensure permissions and connection are OK
      await window.db.collection('__init_test__').limit(1).get().catch(()=>{});
      console.log('Firestore initialized');
    } catch (e) {
      console.warn('Firestore init warning', e);
      window.db = null;
    }
  } catch (err) {
    console.error('initFirebase failed', err);
    window.firebaseApp = null;
    window.db = null;
  }
})();

