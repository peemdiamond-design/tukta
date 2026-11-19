// Firebase web config. These values are public by design: access is
// enforced by Firestore security rules (see firestore.rules), not by secrecy.
export const firebaseConfig = {
  apiKey: "AIzaSyCrNb7onQZD1VeW8KfZqdSBiYtLZ7GBvWI",
  authDomain: "tukta-blog-81d9d.firebaseapp.com",
  projectId: "tukta-blog-81d9d",
  storageBucket: "tukta-blog-81d9d.firebasestorage.app",
  messagingSenderId: "970738567866",
  appId: "1:970738567866:web:ee1a5fd0e78cc56238d083",
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
