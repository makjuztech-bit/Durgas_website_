// DURGAS — Firebase Web SDK & Google Analytics
(function() {
  const firebaseConfig = {
    apiKey: "AIzaSyCjhHTYFYKR5CSeCM2roJGEGjz2v9QefWk",
    authDomain: "durgasecommerce-7015a.firebaseapp.com",
    projectId: "durgasecommerce-7015a",
    storageBucket: "durgasecommerce-7015a.firebasestorage.app",
    messagingSenderId: "546980283593",
    appId: "1:546980283593:web:e43420092ae9227d033918",
    measurementId: "G-YGQ52TNWX1"
  };

  window.FIREBASE_CONFIG = firebaseConfig;

  // Initialize Google Analytics for Firebase
  if (firebaseConfig.measurementId) {
    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + firebaseConfig.measurementId;
    document.head.appendChild(gaScript);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', firebaseConfig.measurementId, {
      send_page_view: true
    });
  }
})();
