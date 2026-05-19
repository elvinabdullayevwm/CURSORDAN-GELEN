# Yolasal (Ebeke) — Loqistika Platforması

Frontend: GitHub Pages · Backend: Google Apps Script · Baza: Google Sheets

## ID formatları

| Tip | Nümunə | İzah |
|-----|--------|------|
| Müştəri | `650001` | 6=2026, 5=May, 0001=sıra |
| Sifariş | `650001/O0001` | Müştəri ID + /O + sıra |
| Reys | `650001/R0001` | Müştəri ID + /R + sıra |

## Quraşdırma

### 1. Google Sheet

1. Yeni Google Spreadsheet yaradın.
2. **Extensions → Apps Script** açın.
3. `backend/` qovluğundakı bütün `.gs` fayllarını layihəyə əlavə edin (`Config`, `Database`, `LogisticsEngine`, `Auth`, `Orders`, `Routes`, `Main`).
4. Redaktoruda `setupSheets` funksiyasını bir dəfə **Run** edin (icazə verin).
5. **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. URL-i kopyalayın.

### 2. Frontend

`js/config.js` faylında `SCRIPT_URL`-i deploy URL ilə əvəz edin.

```js
const YOLASAL_CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/XXXX/exec'
};
```

### 3. GitHub Pages

Repozitoriyanı GitHub-a push edin → **Settings → Pages** → Source: main branch.

## API əmrləri

| action | Metod | Təsvir |
|--------|-------|--------|
| checkUser | GET | email/telefon təkrarı |
| sendOtp | POST | Mail OTP |
| registerUser | POST | OTP + qeydiyyat |
| login | POST | Giriş |
| createNewOrder | POST | Sifariş |
| createNewRoute | POST | Reys |
| getPublicOrders | POST | Bazar sifarişləri |
| getPublicRoutes | POST | Bazar reysləri |
| getMyOrders | POST | Şəxsi sifarişlər |
| getMyRoutes | POST | Şəxsi reyslər |
| getStats | POST | Statistika |
| track | POST | İzləmə |

## Qeydiyyat axını

1. İstifadəçi formu doldurur → `checkUser`
2. Server OTP göndərir → `sendOtp`
3. OTP təsdiqi → `registerUser` → **65000x** ID
4. Eyni email və ya telefon ilə ikinci qeydiyyat mümkün deyil.

## Vərəqlər

- **Users** — istifadəçilər
- **Orders** — 19 sütunlu sifarişlər
- **Routes** — reyslər
