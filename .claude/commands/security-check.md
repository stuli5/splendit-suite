# Security Check

Vykonaj bezpečnostný audit kódu SplenditSuite. Prehľadaj codebase a skontroluj nasledovné:

## 1. Autentifikácia
- Overí každá stránka v `app/(platform)/` či je používateľ prihlásený?
- Je `auth-context.tsx` správne zapojený v layoute?
- Môže neprihlásený používateľ pristupovať k akémukoľvek `/platform` route?

## 2. Firestore Security Rules
- Sú v `firestore.rules` (alebo v Firebase Console) nastavené produkčné pravidlá?
- Je `allow read, write: if true` použité len v dev mode?
- Sú pravidlá dostatočne granulárne (per-collection)?

## 3. Vstupná validácia
- Sú všetky formulárové vstupy validované pred zápisom do Firestore?
- Sú číselné polia pretypované (nie uložené ako string)?
- Existuje validácia maximálnej dĺžky?

## 4. XSS
- Je niekde použité `dangerouslySetInnerHTML`? Ak áno, je vstup sanitizovaný?
- Sú externé URL validované pred zobrazením?

## 5. Environmentálne premenné
- Sú serverové secrets uložené BEZ `NEXT_PUBLIC_` prefixu?
- Je `.env.local` v `.gitignore`?

## 6. Závislosti
- Spusti `npm audit` a reportuj high/critical zraniteľnosti

## Výstup
Pre každý bod uveď: ✅ OK / ⚠️ Varovanie / ❌ Kritické — a konkrétny súbor + riadok kde je problém.
