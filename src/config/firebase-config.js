// Firebase web config. These values are public by design: access is
// enforced by Firestore security rules (see firestore.rules), not by secrecy.
export const firebaseConfig = {
  apiKey: "AIzaSyDw-UZYEA6nRjy_V_dYz9hCZaAWWDiU4vc",
  authDomain: "tukta-blog.firebaseapp.com",
  projectId: "tukta-blog",
  storageBucket: "tukta-blog.firebasestorage.app",
  messagingSenderId: "702021113420",
  appId: "1:702021113420:web:6903a81e9a12915b6946e9",
};

// Defaults; the admin can override name/tagline/description/about/socials in Site settings.
export const SITE = {
  name: "ตุ๊กตา",
  tagline: "สมุดบันทึก",
  description: "บล็อกส่วนตัวของตุ๊กตา บันทึกเรื่องเล็ก ๆ ในแต่ละวัน",
  author: "ตุ๊กตา",
  url: "https://tukta.peemcn25.dev",
  image: "assets/img/og-cover.png",
  locale: "th-TH",
  pageSize: 8,
};
