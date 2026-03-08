# 🍔 FoodDash — Customer App

Mobile-first food ordering web app. Runs without Firebase (Demo Mode).

## 🚀 Quick Start
```bash
npm install
npm run dev
```
Open **http://localhost:5173** — or load in React Native WebView.

## 🔐 Test Account
| Email | Password |
|-------|----------|
| customer@test.com | test123 |

## 📱 Features
- Browse restaurants with search & category filter
- View menus and add to cart
- Apply promo codes: **WELCOME10**, **FREEDEL**, **SAVE2**
- Place orders with delivery address
- Track order status
- View order history
- Edit profile

## 🔥 Connect Firebase
1. Fill in `src/services/firebase.js`
2. Set `DEMO_MODE = false` in `src/context/AuthContext.jsx`

## 📁 Structure
```
src/
├── context/AuthContext.jsx   ← Auth + Demo login
├── context/CartContext.jsx   ← Cart state
├── components/UI.jsx         ← Button, Input, BottomSheet, Toast...
├── components/BottomNav.jsx  ← Bottom navigation
├── pages/AuthPage.jsx        ← Login + Register
├── pages/HomePage.jsx        ← Restaurant list + Menu sheet
├── pages/CartPage.jsx        ← Cart + Checkout
├── pages/OrdersPage.jsx      ← Order tracking
├── pages/ProfilePage.jsx     ← Profile + Settings
├── utils/mockData.js         ← Demo data
└── services/firebase.js      ← Firebase config (fill when ready)
```