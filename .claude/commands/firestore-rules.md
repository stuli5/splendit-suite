# Firestore Rules Generator

Vygeneruj produkčné Firestore Security Rules pre SplenditSuite na základe aktuálnych kolekcií v codebase.

Prehľadaj `lib/` priečinok a nájdi všetky Firestore kolekcie ktoré sa používajú. Potom vygeneruj `firestore.rules` súbor s nasledovnými zásadami:

- Len autentifikovaný používateľ (`request.auth != null`) má prístup k čemukoľvek
- Read prístup: všetci prihlásení používatelia
- Write prístup: všetci prihlásení používatelia (interná app)
- Validácia typov polí kde je to možné
- Žiadne `allow read, write: if true`

Vytvor súbor `firestore.rules` v root priečinku projektu.
