Public Gold Live Website (Vercel)

FILES
- index.html = your website
- api/prices.js = auto fetch live Public Gold prices
- package.json = Vercel config

SUPER SIMPLE STEPS
1. Create a GitHub account
2. Create a new repository
3. Upload all files in this folder
4. Go to Vercel
5. Sign in with GitHub
6. Import the repo
7. Click Deploy

AFTER DEPLOY
- Your site will be live
- Your prices endpoint will be /api/prices
- The page will try to load live prices automatically
- If live fetch fails, it uses fallback numbers already inside index.html

WHAT YOU STILL EDIT MANUALLY
- remittance rate
- remittance charge
- e-wallet rate
- shipping fee
- premium fee

The RM live prices and GAP price come from Public Gold.


FIX IN THIS VERSION
- api/prices.js now fetches from the Public Gold live price page, not the homepage.
- Full Public Gold update text is passed through to Dikemaskini when available.


This package keeps the clean GAP section (1g / RM100 / RM300 / RM500), clickable disclaimer, and Public Gold update text display.
