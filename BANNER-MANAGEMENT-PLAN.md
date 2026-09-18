# Qikzo — Food & Grocery Banner Management + Customer Flow
### Implementation Plan (PLAN ONLY — is document ke saath koi code change nahi hua)

_Branch: `arena/01a0b329-qikzo-app` · Base commit: `d35606f`_
_Scope: `qikzo-server` (API) · `Qikzo-admin-dashboard` (admin) · `Qikzo-app` (customer)_

> **Status:** Yeh sirf plan hai. Repo ka koi existing file modify nahi kiya gaya.
> Naya file sirf yeh document hai: `BANNER-MANAGEMENT-PLAN.md`.

---

## 0. Current state — maine code mein actually kya verify kiya

Plan likhne se pehle teeno projects padhe. Yeh verified facts hain (file + line ke saath),
kyunki inhi par poora design depend karta hai:

| # | Verified fact | Source |
|---|---|---|
| 1 | Ek **banner system pehle se exist karta hai** — model `PromoBanner` | `qikzo-server/src/models/PromoBanner.ts` |
| 2 | Us banner ka targeting **Category → State → Area polygon** based hai, restaurant based **nahi** | `PromoBanner.ts` (`categoryId/stateId/areaId/polygon/coord`) |
| 3 | Admin banner CRUD pehle se hai: `GET/POST/PATCH/DELETE /admin/banners` | `qikzo-server/src/routes/adminRoutes.ts:82-86` |
| 4 | Admin create banner **bina service-area polygon ke possible hi nahi** — `resolveBannerGeo()` throw karta hai `'Select a service area on the map'` (`AREA_REQUIRED`) | `qikzo-server/src/services/adminService.ts:92` |
| 5 | Public endpoint `GET /banners` **saare active banners** return karta hai (sirf `active: true` filter) | `qikzo-server/src/services/catalogService.ts:16-17` |
| 6 | Home screen par wahi banners **carousel + "Explore"** dono jagah dikhte hain | `Qikzo-app/components/PromoBanners.tsx`, `ExploreBanners.tsx` |
| 7 | Customer app ke "tabs" = Home ke **delivery category tiles** (Groceries, Food, Medicines, Parcel, Other) | `Qikzo-app/app/(tabs)/index.tsx:301` → `openWithCategory(c.id)` |
| 8 | Food/Groceries tile tap → seedha `/book-delivery` khulta hai (koi dedicated screen **nahi**) | `Qikzo-app/app/(tabs)/index.tsx:111-116` |
| 9 | Category list server se aati hai, fallback mock: ids = `groceries, food, medicines, parcel, other` | `Qikzo-app/lib/mockData.ts:13-19`, `qikzo-server/src/seed/seed.ts:26-53` |
| 10 | **`Restaurant` / `Store` / `Vendor` ka koi entity poore repo mein exist nahi karta.** `grep -ri "restaurant"` sirf 6 hits deta hai — sab UI strings / comments / seed hint hain | grep result: `book-delivery.tsx:580,826`, `select-location.tsx:207`, `mockData.ts:14`, `BannersPage.tsx:401`, `PromoBanner.ts` (comment), `seed.ts:35` |
| 11 | Booking model mein `pickup`, `extraPickups` (max 3), `drop`, `notes` (max 500), `noteImages` (max 4) hain — **bannerId ya per-store input nahi** | `qikzo-server/src/models/Booking.ts`, `qikzo-server/src/validators/bookingValidators.ts:18-33` |
| 12 | Review data do jagah hai: `Rating` (rider) aur `OrderReview` (delivered items, `booking` + `categorySlug` keyed) — **store keyed nahi** | `qikzo-server/src/models/OrderReview.ts`, `Review.ts` |
| 13 | Pickup selection screen already hai aur banner params support karta hai (`bannerId` aane par `bannerFlow` = true → `router.replace('/book-delivery')`) | `Qikzo-app/app/select-location.tsx:217`, `:262` |
| 14 | Upload infra ready hai: `POST /uploads` (auth, 8MB, images), admin side `ImageField` + `uploadFile()` | `qikzo-server/src/routes/uploadRoutes.ts`, `Qikzo-admin-dashboard/src/components/ImageField.tsx`, `src/lib/api.ts` |
| 15 | Admin sidebar ek flat `nav[]` array hai | `Qikzo-admin-dashboard/src/components/Layout.tsx:7-22` |
| 16 | Migrations append-only registry hai (`001`–`004`) | `qikzo-server/src/db/migrations/index.ts` |
| 17 | Test infra minimal: sirf `rewardMath.test.ts`, runner `npm run test:rewards` (node --test + tsx) | `qikzo-server/package.json` |
| 18 | `node_modules` teeno projects mein **installed nahi** hain (isliye abhi typecheck/build run nahi ho sakta) | `ls -d */node_modules` → no |

### Iska matlab (sabse important conclusion)

Aapki spec "restaurants/stores select karo" assume karti hai ki restaurants ka master list exist karta hai.
**Woh exist nahi karta.** Isliye plan ke 2 naye master entities banenge:

1. **`Restaurant`** (restaurant / grocery store master) — naam, address, coord, description, menu, offers, rating.
2. **`CategoryBanner`** (Food/Grocery tab ka banner) — image, title, type, selected stores, ALL flag.

Aur existing `PromoBanner` (home carousel) ko **bilkul touch nahi kiya jayega** — neeche §2 mein reason.

---

## 1. Scope summary

```
┌─────────────────────────┬──────────────────────────────────────────────┐
│ Layer                   │ Kya banega                                   │
├─────────────────────────┼──────────────────────────────────────────────┤
│ qikzo-server            │ 2 naye models, 1 migration, 2 naye route     │
│                         │ files, 2 naye services, 2 validators,        │
│                         │ Booking mein 2 optional fields               │
├─────────────────────────┼──────────────────────────────────────────────┤
│ Qikzo-admin-dashboard   │ Sidebar mein "Banner Management" section,    │
│                         │ 3 naye pages (Banners, Stores, + form modal) │
├─────────────────────────┼──────────────────────────────────────────────┤
│ Qikzo-app (customer)    │ 2 naye screens, 1 naya endpoint module,      │
│                         │ 1 naya store, 1 naya component;              │
│                         │ existing files mein sirf 3 chhote edits      │
└─────────────────────────┴──────────────────────────────────────────────┘
```

---

## 2. Architecture decisions (implementation se pehle confirm karein)

### Decision 1 — Naya banner collection, existing `PromoBanner` reuse NAHI karna ✅ (recommended)

**Kyun:**
- `adminService.resolveBannerGeo()` (`adminService.ts:60-96`) polygon/coord ko **mandatory** banata hai.
  Food/Grocery banner ko area ki zaroorat nahi → is function ko change karna padega = existing behavior change.
- `catalogService.listBanners()` (`catalogService.ts:16-17`) sirf `active: true` filter lagata hai.
  Agar naye banners usi collection mein gaye, to **Home carousel aur Explore grid mein apne aap dikhne lagenge**
  → existing screens ka behavior badal jayega, jo spec ke section 20 ke against hai.

**Recommendation:** naya collection `categorybanners` (model `CategoryBanner`).
Existing `/banners`, `/admin/banners`, `BannersPage.tsx`, `PromoBanners.tsx`, `ExploreBanners.tsx` — **zero touch**.

> _Alternative (agar aap insist karein):_ `PromoBanner` mein `placement: 'home' | 'category-tab'` field add
> karke `catalogService.listBanners()` + `adminService.listBanners()` mein filter lagana. Isme 2 existing
> service functions change honge. Main ise recommend nahi karta.

### Decision 2 — Restaurant/Store master naya banega ✅ (only option)

Naya model `Restaurant` (`kind: 'restaurant' | 'store'`) + admin CRUD page.
Banner ke `storeIds` isi ko reference karenge.

### Decision 3 — Booking integration additive-only ✅

`Booking` model + `createBookingSchema` mein sirf **optional** fields add honge
(`bannerId`, `storeInputs[]`). Existing callers inhe bhejte hi nahi → default `[]`/`''` → existing booking
flow byte-for-byte same. **Rider app ko bilkul touch nahi kiya jayega**, kyunki per-store inputs ka
human-readable text `notes` mein bhi compose hoga (rider already `notes` padhta hai).

### ⚠️ Spec ka ek gap — DROP location

Spec mein sirf pickup + per-restaurant input + BOOK likha hai. Lekin server par booking banane ke liye
`drop` **required** hai (`bookingValidators.ts:24` → `drop: PointSchema`), aur `bookingService.create()`
price pickup↔drop distance se calculate karta hai (`bookingService.ts:59-66`).

**Isliye naye flow mein ek "Deliver to" step bhi hoga** (saved places chips + `/select-location?field=drop`
reuse). Bina iske `[BOOK]` hamesha 400 dega. Yeh spec ka addition hai, existing flow ka change nahi.

---

## 3. SERVER PLAN (`qikzo-server`)

### 3.1 Naye models

**`src/models/Restaurant.ts`** (naya)

```ts
RestaurantSchema = {
  slug:        { String, required, unique, index },   // "abc-restaurant"
  name:        { String, required },                  // "ABC Restaurant"
  kind:        { String, enum: ['restaurant','store'], default: 'restaurant', index },
  categorySlug:{ String, default: '' },               // 'food' | 'groceries' — tab affinity
  description: { String, default: '' },
  imageUrl:    { String, default: '' },
  address:     { String, default: '' },
  coord:       { lat: Number, lng: Number },          // pickup pre-fill ke liye
  hours:       [{ day: String, open: String, close: String }],   // "Available information"
  offers:      [{ title: String, detail: String, active: Boolean }],
  menu: {
    imageUrl:  { String, default: '' },               // photographed menu (existing pattern)
    items:     [{ name: String, price: Number, category: String, veg: Boolean }],
  },
  ratingSummary: {                                     // day-1 stars ke liye optional manual entry
    avg:    { Number, default: 0 },
    count:  { Number, default: 0 },
    source: { String, enum: ['manual','computed'], default: 'manual' },
  },
  active: { Boolean, default: true },
  order:  { Number, default: 0 },
}
// indexes: { slug: 1 unique }, { kind: 1, active: 1 }, { 'coord': '2dsphere' } optional
```

**`src/models/CategoryBanner.ts`** (naya)

```ts
CategoryBannerSchema = {
  title:     { String, required },                     // "Weekend Food Festival"
  type:      { String, enum: ['food','grocery'], required, index },   // ← ONLY 2 options
  imageUrl:  { String, required },
  // Empty array = "ALL applicable stores" (spec §4 Important)
  storeIds:     [{ type: ObjectId, ref: 'Restaurant' }],
  storeIdsEmpty:{ Boolean, default: true, index },      // denormalised ALL flag, fast filter
  // Denormalised snapshot so customer list call is 1 query (no populate on list)
  storeNames:   [{ String }],
  description:  { String, default: '' },
  active:  { Boolean, default: true, index },
  order:   { Number, default: 0 },
}
// indexes: { type: 1, active: 1, order: 1 }, { storeIds: 1 }
```

**ALL-flag rule (server enforced, spec §4):**
```
storeIds.length === 0  →  storeIdsEmpty = true   →  banner = ALL applicable stores
storeIds.length  > 0   →  storeIdsEmpty = false  →  banner = only those stores
```
Yeh normalisation `categoryBannerService` mein ek hi jagah hoga (`normaliseStores()`),
taaki admin "kuch select kiya phir hata diya" case mein bhi flag sahi rahe.

### 3.2 Migration

`src/db/migrations/005_init_restaurants_and_category_banners.ts` (naya) +
`src/db/migrations/index.ts` mein append (1 line):

- `restaurants` aur `categorybanners` collections ke indexes `createIndex` karna.
- Optional: 2–3 demo restaurants seed karna (dev only, `NODE_ENV !== 'production'` guard).
- Registry append-only rule follow karna hai (`migrations/index.ts:7-10` comment).

### 3.3 Naye services

**`src/services/restaurantService.ts`**
- `list({ kind, q, active, limit, cursor })` → `{ items, nextCursor }` (cursor pattern `adminService.listBanners` jaisa, `adminService.ts:423-435`)
- `get(id)`, `create(input)`, `update(id, patch)`, `remove(id)`, `toggle(id)`
- `remove()` guard: agar koi `CategoryBanner` is store ko reference karta hai → `409 CONFLICT 'STORE_IN_USE'`
- `reviewsFor(storeId, limit)` → `OrderReview` aggregate (neeche §3.6)

**`src/services/categoryBannerService.ts`**
- `normaliseStores(storeIds)` → validate karta hai ki sab ids exist karte hain + `kind` banner `type` se match karta hai
  (`type: 'grocery'` par `kind: 'restaurant'` select ho to `400 STORE_TYPE_MISMATCH`)
- `create/update/listAdmin/remove/toggle`
- `listForTab({ type, lat, lng })` → public list:
  ```js
  CategoryBanner.find({ type, active: true }).sort({ order: 1, _id: -1 })
  ```
  + optional proximity sort jab `lat/lng` mile (existing `haversineKm` util reuse —
  `qikzo-server/src/utils/distance.ts`, wahi pattern jo `catalogService.listBanners` use karta hai).
- `detail(id)` → banner + resolved `stores[]` (poora restaurant payload incl. menu/offers/rating)
- `applicableStores(banner)` → `storeIdsEmpty ? Restaurant.find({categorySlug matches type, active:true}) : Restaurant.find({_id: {$in: storeIds}, active:true})`

### 3.4 Naye controllers + validators

**`src/validators/bannerAdminValidators.ts`** (naya)
```ts
export const createStoreSchema = z.object({
  slug: z.string().min(2).max(60),
  name: z.string().min(1).max(120),
  kind: z.enum(['restaurant','store']).default('restaurant'),
  categorySlug: z.enum(['food','groceries']).optional(),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().max(500).optional(),
  address: z.string().max(300).optional(),
  coord: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
  hours: z.array(z.object({ day: z.string(), open: z.string(), close: z.string() })).max(14).optional(),
  offers: z.array(z.object({ title: z.string().max(120), detail: z.string().max(300), active: z.boolean().optional() })).max(10).optional(),
  menu: z.object({
    imageUrl: z.string().max(500).optional(),
    items: z.array(z.object({
      name: z.string().min(1).max(120),
      price: z.number().min(0).optional(),
      category: z.string().max(60).optional(),
      veg: z.boolean().optional(),
    })).max(200).optional(),
  }).optional(),
  ratingSummary: z.object({ avg: z.number().min(0).max(5), count: z.number().int().min(0) }).optional(),
  active: z.boolean().optional(),
  order: z.number().optional(),
});

export const createCategoryBannerSchema = z.object({
  title: z.string().min(1).max(140),                 // Banner Title
  type: z.enum(['food','grocery']),                  // ← dropdown ke sirf 2 options
  imageUrl: z.string().min(1).max(500),              // Banner Image (required)
  storeIds: z.array(z.string().length(24)).max(100).default([]),  // [] = ALL
  description: z.string().max(1000).optional(),
  active: z.boolean().optional(),
  order: z.number().optional(),
});
export const updateCategoryBannerSchema = createCategoryBannerSchema.partial();
export const bannerListQuerySchema = z.object({
  type: z.enum(['food','grocery']).optional(),
  active: z.enum(['true','false']).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
}).partial();
```

**`src/controllers/restaurantAdminController.ts`** + **`src/controllers/categoryBannerController.ts`** (naye)
— pattern bilkul `categoryAdminController.ts` / `catalogController.ts` jaisa:
`asyncHandler` + `ok(res, …)` envelope (`src/lib/http.ts:24`), cacheable headers public reads par.

### 3.5 Routes

**Admin (existing file mein 8 lines add — `src/routes/adminRoutes.ts`, end mein naya block):**
```ts
// ---- Banner Management (Food / Grocery) ----
router.get('/stores', validate(listQuerySchema,'query'), restaurantAdminController.list);
router.post('/stores', validate(createStoreSchema), restaurantAdminController.create);
router.get('/stores/:id', restaurantAdminController.get);
router.patch('/stores/:id', validate(updateStoreSchema), restaurantAdminController.update);
router.delete('/stores/:id', restaurantAdminController.remove);
router.post('/stores/:id/toggle', restaurantAdminController.toggle);

router.get('/category-banners', validate(bannerListQuerySchema,'query'), categoryBannerController.listAdmin);
router.post('/category-banners', validate(createCategoryBannerSchema), categoryBannerController.create);
router.get('/category-banners/:id', categoryBannerController.get);
router.patch('/category-banners/:id', validate(updateCategoryBannerSchema), categoryBannerController.update);
router.delete('/category-banners/:id', categoryBannerController.remove);
router.post('/category-banners/:id/toggle', categoryBannerController.toggle);
```
Sab already `router.use(requireAuth, requireAdmin)` ke andar hai (`adminRoutes.ts:23`) — extra auth code nahi.

**Public (naya file `src/routes/categoryBannerRoutes.ts`, `src/routes/index.ts` mein 2 lines add):**
```ts
GET /api/v1/category-banners?type=food|grocery&lat=&lng=   → { items: [...] }      (cacheable 60/300)
GET /api/v1/category-banners/:id                           → { banner, stores[] }   (cacheable 30/120)
GET /api/v1/category-banners/:id/reviews?limit=20          → { summary, items[] }
```
Mount: `router.use('/category-banners', categoryBannerRoutes);`
— existing `/banners` (`catalogRoutes.ts:6`) se koi path collision nahi.

### 3.6 Rating tab ka data (spec §13) — honest reality

- `OrderReview` mein **optional** `storeId` + `storeName` add honge (additive; purane reviews par `null`).
- `GET /category-banners/:id/reviews` = per-store aggregate:
  ```js
  OrderReview.aggregate([
    { $match: { storeId: { $in: storeObjectIds } } },
    { $group: { _id: '$storeId', count: {$sum:1}, avg: {$avg:'$stars'} } }
  ])
  ```
  aur `items[]` = latest reviews (`stars`, `comment`, `tags`, `createdAt`, user name populate).
- Jab computed data na ho (`count === 0`) → `Restaurant.ratingSummary` (admin-entered, `source:'manual'`) use hoga.
- Dono na ho → app **"No reviews yet"** empty state dikhayega. Yeh intentional hai — fake reviews seed nahi karenge.
- App ka existing `RateOrderModal` change nahi hoga; naya banner-flow booking `storeId` bhejega,
  isliye **sirf naye flow se aaye bookings** store ratings mein count honge (cold-start expected).

### 3.7 Booking integration (additive only)

**`src/models/Booking.ts`** — 2 optional fields:
```ts
bannerId:   { type: Schema.Types.ObjectId, ref: 'CategoryBanner', default: null, index: true },
storeInputs:{ type: [{
    storeId:   { type: Schema.Types.ObjectId, ref: 'Restaurant', default: null },
    storeName: { type: String, default: '' },
    note:      { type: String, default: '', maxlength: 300 },
}], default: [] },
```

**`src/validators/bookingValidators.ts`** — `createBookingSchema` mein add:
```ts
bannerId: z.string().length(24).optional(),
storeInputs: z.array(z.object({
    storeId: z.string().length(24),
    storeName: z.string().max(120).optional(),
    note: z.string().min(1).max(300),
})).max(10).optional(),
```

**`src/services/bookingService.ts`** — `CreateBookingInput` type mein 2 optional fields +
`Booking.create({...})` call (`bookingService.ts:123`) mein pass-through. Pricing/dispatch/status logic **untouched**.

**Rider app:** koi change nahi. Client `notes` mein composed text bhejega, example:
```
ABC Restaurant: 2 Margherita pizza, 1 coke
XYZ Restaurant: 1kg basmati rice, 2L Amul milk
```
Isliye rider ko wahi dikhega jo aaj dikhta hai.

### 3.8 Server file-wise change list

| File | Action |
|---|---|
| `src/models/Restaurant.ts` | **NEW** |
| `src/models/CategoryBanner.ts` | **NEW** |
| `src/models/index.ts` | +2 export lines |
| `src/db/migrations/005_init_restaurants_and_category_banners.ts` | **NEW** |
| `src/db/migrations/index.ts` | +2 lines (import + array) |
| `src/services/restaurantService.ts` | **NEW** |
| `src/services/categoryBannerService.ts` | **NEW** |
| `src/controllers/restaurantAdminController.ts` | **NEW** |
| `src/controllers/categoryBannerController.ts` | **NEW** |
| `src/validators/bannerAdminValidators.ts` | **NEW** |
| `src/routes/categoryBannerRoutes.ts` | **NEW** |
| `src/routes/index.ts` | +2 lines |
| `src/routes/adminRoutes.ts` | +12 lines (naya block, end mein) |
| `src/models/Booking.ts` | +8 lines (2 optional fields) |
| `src/validators/bookingValidators.ts` | +7 lines |
| `src/services/bookingService.ts` | +4 lines (type + pass-through) |
| `src/models/OrderReview.ts` | +2 lines (`storeId`, `storeName` optional) |
| `src/__tests__/bannerTargeting.test.ts` | **NEW** (unit test, §8) |
| ❌ `PromoBanner.ts`, `catalogService.ts`, `catalogController.ts`, `adminService.ts` (banner block `:422-485`), `catalogRoutes.ts` | **NO CHANGE** |

---

## 4. ADMIN DASHBOARD PLAN (`Qikzo-admin-dashboard`)

### 4.1 Sidebar — naya section (spec §2)

`src/components/Layout.tsx` — `nav` array (line 7) flat hai; sections support nahi karta.
Do options:

- **Option A (recommended, 2 lines — nav entry + icon import):** `{ to: '/banner-management', label: 'Banner Management', icon: Layers }`
  add karna — existing `Images / Banners` entry waise hi rahegi.
- **Option B (agar visually grouped section chahiye):** `nav` ko `{ label, items[] }` groups mein convert karna
  (~15 lines Layout.tsx change). Isse existing nav render loop badlega → main ise recommend nahi karta,
  kyunki spec §20 "existing UI components जहाँ उनकी जरूरत नहीं है" change mat karo kehta hai.

Icon: `Layout.tsx:2` ke lucide import mein `Layers` **abhi nahi hai** (verified — `Layers` sirf
`BannersPage.tsx:11` mein import hota hai). Isliye `Layout.tsx:2` par `Layers` (ya koi bhi lucide icon)
import list mein add karna hoga — yeh usi line ka 1-word edit hai, koi naya dependency/package nahi.

### 4.2 Routes — `src/App.tsx`

```tsx
const BannerManagementPage = lazy(() => import('@/pages/BannerManagementPage'));
const StoresPage           = lazy(() => import('@/pages/StoresPage'));
...
<Route path="banner-management" element={<BannerManagementPage />} />
<Route path="banner-management/stores" element={<StoresPage />} />
```
Lazy-loading pattern follow karna hai (App.tsx:7-11 comment, lazy imports :12-28: initial bundle chhota rakhna hai).

### 4.3 Page 1 — `src/pages/BannerManagementPage.tsx` (NEW)

Reuse: `usePaginated('/admin/category-banners')`, `useInfiniteScroll`, `DataTable`, `Modal`,
`ImageField`, `Badge`, `Button`, `EmptyState` — sab `src/components/` mein already hain
(`BannersPage.tsx` inhi ko use karta hai, isliye UI consistent rahega).

**Table columns:** Preview (image+title) · Type badge (Food/Grocery) · Stores
(`3 stores` ya `ALL`) · Order · Status · Actions (Edit / Delete).

**"Create Banner" modal fields (spec §3 + §21 ke exact order mein):**

| Field | Control | Validation |
|---|---|---|
| **Banner Image** | `<ImageField>` (upload ya URL) — same component jo `BannersPage.tsx:401` use karta hai | required |
| **Banner Title** | `<Input>` | required, max 140 |
| **Banner Type** | `<Select>` → **sirf** `Food` / `Grocery` | required |
| **Select Restaurants / Stores** | checkbox list + search box, **multi-select** (spec §4) | optional |
| Description | `<Textarea>` | optional |
| Order / Active | `<Input numeric>` / checkbox | default 0 / true |

**Restaurant multi-select behaviour (spec §4 Important):**
```
[ Type = Food ▼ ]
Select Restaurants / Stores          [ search… ]
☑ ABC Restaurant
☑ XYZ Restaurant
☐ Delhi Restaurant
☐ City Restaurant
0 selected → "No selection = banner applies to ALL Food stores"   ← live hint line
```
- List `GET /admin/stores?limit=200` se aayegi, type ke hisaab se filtered
  (Food → `kind=restaurant`/`categorySlug=food`, Grocery → `kind=store`/`categorySlug=groceries`).
- Type change par selected stores reset (mismatch se bachne ke liye).
- **0 selected = ALL** — payload mein `storeIds: []` jayega, aur table/list mein `ALL` badge dikhega.
- Submit: `POST /admin/category-banners` (edit: `PATCH /admin/category-banners/:id`),
  `toast.success('Banner created')` + `refresh()` — bilkul `BannersPage.tsx:187` ka pattern.

### 4.4 Page 2 — `src/pages/StoresPage.tsx` (NEW)

Restaurant/store master CRUD (bina iske banner form mein select karne ke liye list hi nahi hogi).
Fields: Slug · Name · Kind (Restaurant/Store) · Category (Food/Groceries) · Image · Address ·
`PolygonEditor`-free simple lat/lng ya "Pick on map" (optional) · Description · Hours ·
Offers (repeatable rows) · Menu (image upload + item rows) · Rating (avg/count, manual) · Active/Order.

### 4.5 Admin file-wise change list

| File | Action |
|---|---|
| `src/pages/BannerManagementPage.tsx` | **NEW** |
| `src/pages/StoresPage.tsx` | **NEW** |
| `src/components/StoreMultiSelect.tsx` | **NEW** (searchable checkbox list) |
| `src/App.tsx` | +4 lines (2 lazy imports + 2 routes) |
| `src/components/Layout.tsx` | +2 lines (icon import + nav entry) |
| ❌ `src/pages/BannersPage.tsx` (existing promo banners) | **NO CHANGE** |
| ❌ `src/lib/api.ts`, `usePaginated.ts`, `DataTable.tsx`, `ui.tsx`, `ImageField.tsx` | **NO CHANGE** (reuse only) |

---

## 5. CUSTOMER APP PLAN (`Qikzo-app`)

### 5.1 Existing tabs par sirf ek guard (spec §6, §7)

`app/(tabs)/index.tsx:111` — `openWithCategory()` ke andar **3 lines**:

```tsx
const openWithCategory = (categoryId, drop?, dropCoord?) => {
  // NEW: Food / Grocery ab apne dedicated banner screen par jaate hain.
  if (categoryId === 'food' || categoryId === 'groceries') {
    setDraft({ mode, categoryId });
    router.push({ pathname: '/category-banners', params: { type: categoryId === 'food' ? 'food' : 'grocery' } });
    return;
  }
  ...existing code untouched...
};
```

**Verified safe:** `openWithCategory` ke baaki 3 call-sites (`index.tsx:218` saved places → `'parcel'`,
`:245` ride long-press, `:284` ride confirm) kabhi `food`/`groceries` pass nahi karte → un par zero effect.
Medicines / Parcel / Other tiles, ride list, Rides tab, saved places — **sab exactly jaise hain**.

`app/book-delivery.tsx` ke andar wale Food/Groceries category chips **untouched** rahenge
(wahan se user aaj ki tarah seedha form par hi rahega) → existing behavior preserved.

### 5.2 New Screen 1 — `app/category-banners.tsx` (spec §8)

```
ScreenHeader  "Food"  /  "Grocery"
─────────────────────────────
[ Banner 1 ]  ← full-width image card, title + store count chip
[ Banner 2 ]
[ Banner 3 ]
[ Banner 4 ]
        ↓ vertical FlatList scroll
```

- Data: `GET /category-banners?type=food` → **vertical `FlatList`** (horizontal nahi).
- **Type filtering server-side hoti hai** (`type` query) — app dobara filter nahi karta,
  isliye Food tab par kabhi Grocery banner nahi aayega (spec §8, §23).
- Loading: `Skeleton` component reuse (`components/Skeleton.tsx`).
- Empty: "No offers right now" empty state.
- Tap → `router.push({ pathname:'/banner-detail', params:{ id: banner._id } })`.
- `_layout.tsx` mein route registration optional (Expo Router file-based hai;
  `Stack screenOptions={{ headerShown:false }}` already applied). Consistency ke liye 2 `<Stack.Screen>`
  entries add kar sakte hain — required nahi.

### 5.3 New Screen 2 — `app/banner-detail.tsx` (spec §10–§14)

```
ScreenHeader  "Weekend Food Festival"
────────────────────────────────────
| Details          | Rating        |     ← top tab bar (2 tabs)
────────────────────────────────────
```

Tab bar: naya component `components/DetailTabBar.tsx` (2-segment pill —
`components/ServiceToggle.tsx` ka exact visual pattern reuse, kyunki brand-locked design hai).

**Details tab (spec §12 + §14):**
- Banner hero image + title + description
- Per store card: Name · ★ rating summary · Address/Location · Timings ("Available information") ·
  Offers chips · **Menu** section:
  - `menu.imageUrl` ho → thumbnail, tap par full-screen modal
    (same pattern jo `book-delivery.tsx:817-860` `menuPreview` modal use karta hai)
  - `menu.items[]` ho → item rows (name · price · veg dot)
  - **dono na ho → "Menu not available" empty state** (spec §14 ka error/empty handling)
- `[ Select / Continue ]` sticky button

**Rating tab (spec §13):**
```
Rating   ★★★★★ 4.5   (128 reviews)
──────────────────
★★★★★  "Pizza was hot and fresh"   · 2d ago
★★★★☆  "Packaging could be better" · 5d ago
```
- Data: `GET /category-banners/:id/reviews`.
- `count === 0` → "No reviews yet" (fake data nahi).

### 5.4 Pickup location flow (spec §15, §16) — existing screen reuse

`[ Select / Continue ]` press par:

```
draft.pickup.trim() non-empty ?
  ├── YES → seedha next step (store inputs)                ← spec §15 "Already Selected"
  └── NO  → pre-fill first store ka address/coord
            router.push('/select-location?field=pickup&lat=..&lng=..&address=..')
            ↓ user confirms pin
            select-location confirm() → router.back()      ← banner-detail par wapas
            ↓ ab draft.pickup set hai → next step
```

**Critical detail (verified):** `/select-location` ko **`bannerId` param NAHI bhejenge**.
`select-location.tsx:217` par `bannerFlow = !savingPlace && which === 'pickup' && !!bannerId` —
agar `bannerId` gaya to `:262` par `router.replace('/book-delivery')` ho jayega aur naya flow toot jayega.
`bannerId` bhejne se confirm normal `router.back()` karta hai (`select-location.tsx:264`) → hum wapas
banner-detail par aate hain. **Iska matlab `select-location.tsx` mein koi change nahi chahiye.**

**Drop step (spec ka gap, §2 mein explain):** same screen `?field=drop`, ya saved-places chips
(`useSavedPlaces` — `lib/savedPlacesStore.ts`) se one-tap.

### 5.5 Restaurant-wise inputs (spec §17) — naya store

**`lib/bannerFlowStore.ts`** (NEW, zustand — same pattern as `bookingStore.ts`):
```ts
type State = {
  banner: { id, title, type } | null;
  storeInputs: Record<string, { storeId: string; storeName: string; note: string }>;
  setBanner(b): void;
  setStoreNote(storeId, storeName, note): void;
  reset(): void;
};
```

UI (banner-detail ke Details tab ke neeche, ya dedicated step):
```
ABC Restaurant      [ Enter your order… ]     ← alag Input
XYZ Restaurant      [ Enter your order… ]     ← alag Input
City Restaurant     [ Enter your order… ]     ← alag Input
```
- **Har store ka input independently store hota hai** (`storeInputs[storeId]`) —
  ek field mein combine nahi (spec §17 Important).
- Validation: kam se kam 1 store input non-empty; filled inputs individually validate.
- Banner `ALL` par ho to applicable stores list `detail()` se aayegi (server resolve karta hai).

### 5.6 `[ BOOK ]` → existing booking (spec §18)

```
[ BOOK ] enabled when: pickup ✓  drop ✓  ≥1 store input ✓
   ↓
createOnServer({ ...existing fields,
                 bannerId,
                 storeInputs: [{storeId, storeName, note}],
                 notes: composedMultiStoreText })   ← rider app ke liye
   ↓
POST /bookings  (existing endpoint, existing pricing, existing dispatch)
   ↓
router.replace('/booking-details?id=...')   ← existing screen, no change
```
`lib/bookingStore.ts` ke `createOnServer` input type mein 2 **optional** fields add honge
(`bookingStore.ts:75-88`) — existing call-site (`book-delivery.tsx:358-386`) unaffected.
`POST /bookings` ka idempotency-key behaviour waise hi rahega (`bookingStore.ts:226`).

### 5.7 New API module

`lib/api/endpoints/categoryBanners.ts` (NEW) — `catalog.ts` ka exact pattern,
including `absoluteMediaUrl()` helper (RN ko `/uploads/...` relative URL nahi chalta,
`catalog.ts:31` comment) + `lib/api/index.ts` mein 2 lines register.

### 5.8 Complete flow (spec §19 ka as-built version)

```
Customer App → Home → Delivery tab
      ↓
[ Food ] / [ Groceries ] tile            ← index.tsx:301 (sirf yahan 3-line guard)
      ↓
/category-banners?type=food              ← NEW screen, vertical banner list
      ↓
banner tap
      ↓
/banner-detail?id=...                    ← NEW screen
      ↓
| Details | Rating |                     ← NEW tab bar
      ↓
Details: store info + menu + offers
      ↓
Pickup already selected?
   ├─ YES → next step
   └─ NO  → /select-location?field=pickup (existing screen, NO bannerId) → back
      ↓
Deliver to (drop)                        ← existing select-location / saved places
      ↓
Restaurant-wise inputs                   ← NEW (per-store, independent)
      ↓
[ BOOK ]
      ↓
POST /bookings → /booking-details        ← 100% existing
```

### 5.9 App file-wise change list

| File | Action |
|---|---|
| `app/category-banners.tsx` | **NEW** |
| `app/banner-detail.tsx` | **NEW** |
| `components/DetailTabBar.tsx` | **NEW** |
| `components/StoreInputList.tsx` | **NEW** |
| `lib/bannerFlowStore.ts` | **NEW** |
| `lib/api/endpoints/categoryBanners.ts` | **NEW** |
| `lib/api/index.ts` | +2 lines (import + register) |
| `app/(tabs)/index.tsx` | **+3 lines** (food/grocery guard, line 111 ke andar) |
| `lib/bookingStore.ts` | **+4 lines** (2 optional input fields + pass-through) |
| `app/_layout.tsx` | +2 lines (optional `<Stack.Screen>` entries) |
| ❌ `app/book-delivery.tsx` | **NO CHANGE** |
| ❌ `app/select-location.tsx` | **NO CHANGE** |
| ❌ `app/booking-details.tsx` | **NO CHANGE** |
| ❌ `components/PromoBanners.tsx`, `ExploreBanners.tsx`, `lib/bannerPickup.ts` | **NO CHANGE** |
| ❌ `app/(tabs)/activity.tsx`, `profile.tsx`, wallet, notifications, addresses, rider app | **NO CHANGE** |

**Total existing-file edits: 3 files, ~9 lines.** Baaki sab naye files.

---

## 6. Data structures — concrete examples (spec §5, §21, §22)

**Admin creates banner (2 stores selected):**
```json
POST /api/v1/admin/category-banners
{
  "title": "Weekend Food Festival",
  "type": "food",
  "imageUrl": "/uploads/1737000000_ab12.jpg",
  "storeIds": ["665f1a...", "665f1b..."],
  "description": "Flat 20% off on weekend orders"
}
→ 201 { "success": true, "banner": { ..., "storeIdsEmpty": false, "storeNames": ["ABC Restaurant","XYZ Restaurant"] } }
```

**Admin creates banner (nothing selected → ALL):**
```json
{ "title": "Grocery Deals", "type": "grocery", "imageUrl": "/uploads/x.jpg", "storeIds": [] }
→ 201 { "banner": { ..., "storeIds": [], "storeIdsEmpty": true } }   // = ALL Grocery stores
```

**Customer Food tab:**
```json
GET /api/v1/category-banners?type=food
{ "items": [
  { "_id":"...", "title":"Weekend Food Festival", "type":"food",
    "imageUrl":"http://…/uploads/…jpg", "storeNames":["ABC Restaurant","XYZ Restaurant"],
    "storeIdsEmpty":false, "order":1 }
] }
```

**Banner detail (Details tab ka poora data):**
```json
GET /api/v1/category-banners/665f...
{ "banner": {...},
  "stores": [
    { "_id":"665f1a...", "name":"ABC Restaurant", "kind":"restaurant",
      "description":"North Indian · Pizza", "address":"CP, New Delhi",
      "coord":{ "lat":28.63, "lng":77.22 },
      "hours":[{ "day":"Mon-Sun","open":"11:00","close":"23:00" }],
      "offers":[{ "title":"20% off","detail":"Above ₹499","active":true }],
      "menu":{ "imageUrl":"/uploads/menu.jpg",
               "items":[ {"name":"Pizza","price":249,"veg":true},
                         {"name":"Burger","price":149},
                         {"name":"Pasta","price":199} ] },
      "ratingSummary":{ "avg":4.5, "count":128, "source":"computed" } }
  ] }
```

**Rating tab:**
```json
GET /api/v1/category-banners/665f.../reviews?limit=20
{ "summary": { "avg": 4.5, "count": 128 },
  "items": [ { "stars":5, "comment":"Pizza was hot and fresh",
               "userName":"Rahul", "createdAt":"2026-09-12T…" } ] }
```

**Final booking:**
```json
POST /api/v1/bookings
{ "mode":"delivery", "categorySlug":"food",
  "pickup":{ "address":"ABC Restaurant, CP", "lat":28.63, "lng":77.22 },
  "drop":{ "address":"24, Sector 18, Noida", "lat":28.57, "lng":77.32 },
  "bannerId":"665f...",
  "storeInputs":[
    { "storeId":"665f1a...", "storeName":"ABC Restaurant", "note":"2 Margherita pizza, 1 coke" },
    { "storeId":"665f1b...", "storeName":"XYZ Restaurant", "note":"1 paneer tikka" }
  ],
  "notes":"ABC Restaurant: 2 Margherita pizza, 1 coke\nXYZ Restaurant: 1 paneer tikka",
  "payment":"upi" }
```

---

## 7. Non-change guarantee (spec §20) — explicit

**DO NOT TOUCH (verified list):**

| Area | Files |
|---|---|
| Existing promo banner system | `PromoBanner.ts`, `catalogService.ts`, `catalogController.ts`, `catalogRoutes.ts`, `adminService.ts` banner block (`:422-485`), `adminController.ts` banner block (`:79-90`), `BannersPage.tsx` |
| Existing customer screens | `book-delivery.tsx`, `select-location.tsx`, `booking-details.tsx`, `activity.tsx`, `profile.tsx`, `wallet.tsx`, `notifications.tsx`, `addresses.tsx`, `refer-earn.tsx`, `login/otp/onboarding` |
| Existing navigation | `(tabs)/_layout.tsx`, `FloatingTabBar.tsx`, `ServiceToggle.tsx` |
| Existing home components | `PromoBanners.tsx`, `ExploreBanners.tsx`, `bannerPickup.ts` |
| Existing booking logic | pricing (`utils/pricing.ts`), dispatch, sockets, rider controller/service, wallet |
| Rider app | `Qikzo-rider/**` — **zero files** |
| Existing APIs/data | `POST /bookings` semantics unchanged (2 optional fields only), `/banners` unchanged, `/categories` unchanged |

**ONLY ADD/MODIFY** — spec §20 ki 17 items ka mapping:

| Spec item | Kahan implement hoga |
|---|---|
| 1. Admin Sidebar → Banner Management | `Layout.tsx` +2 lines (icon import + nav), `App.tsx` +4 |
| 2. Admin → Create Banner | `BannerManagementPage.tsx` (NEW) |
| 3. Banner title | modal `<Input>` + `createCategoryBannerSchema.title` |
| 4. Banner image | modal `<ImageField>` (existing) + `POST /uploads` |
| 5. Food/Grocery type | `<Select>` 2 options + `z.enum(['food','grocery'])` |
| 6. Restaurant/store multi-select | `StoreMultiSelect.tsx` (NEW) + `GET /admin/stores` |
| 7. Empty selection = All | `normaliseStores()` → `storeIdsEmpty: true` |
| 8. Food tab → banner screen | `index.tsx` +3 lines → `category-banners.tsx` |
| 9. Grocery tab → banner screen | same guard, `type=grocery` |
| 10. Vertical banner listing | `FlatList` (vertical) |
| 11. Banner detail screen | `banner-detail.tsx` (NEW) |
| 12. Details / Rating tabs | `DetailTabBar.tsx` (NEW) |
| 13. Restaurant/store details | `GET /category-banners/:id` → `stores[]` |
| 14. Menu display | `Restaurant.menu.{imageUrl,items}` + empty state |
| 15. Pickup location flow | existing `/select-location` (no `bannerId`) |
| 16. Restaurant-wise inputs | `bannerFlowStore.ts` + `StoreInputList.tsx` |
| 17. Existing Book flow | `createOnServer()` → `POST /bookings` (unchanged endpoint) |

---

## 8. Verification plan (implementation ke baad yahi commands chalenge)

`node_modules` abhi installed nahi hain (verified), isliye har project mein pehle `npm install`.

| Project | Command | Kya check karta hai |
|---|---|---|
| `qikzo-server` | `npm run typecheck` (`tsc -p tsconfig.json --noEmit`) | naye models/services/controllers/routes compile |
| `qikzo-server` | `npm run migrate` | `005_...` migration + indexes |
| `qikzo-server` | `npm run test:rewards` | existing test suite regress nahi hua |
| `qikzo-server` | `npm run test:banners` (naya script: `node --test --import tsx src/__tests__/bannerTargeting.test.ts`) | **`normaliseStores()` / ALL-flag / type-filter logic** — yeh actual changed code path execute karega |
| `Qikzo-app` | `npm run typecheck` (`tsc --noEmit`) | naye screens + store + endpoint types |
| `Qikzo-app` | `npm run lint` | expo lint |
| `Qikzo-admin-dashboard` | `npm run build` (`tsc -b && vite build`) | naye pages + nav + routes compile |

**Manual E2E checklist (koi automated E2E infra is repo mein nahi hai — verified):**
1. Admin → Banner Management → Stores → 3 stores banao (2 restaurant, 1 grocery store).
2. Food banner with 2 stores → save → table mein `2 stores` badge.
3. Grocery banner with 0 stores → save → table mein `ALL` badge.
4. App → Home → Food tile → banner list; **sirf Food banners**, vertical order.
5. App → Grocery tile → **sirf Grocery banners**.
6. Medicines / Parcel / Other tiles → aaj jaisa `/book-delivery` (regression check).
7. Banner tap → Details tab (store info + menu) → Rating tab.
8. Pickup already selected → Next; pickup empty → map → confirm → wapas.
9. Drop select → 2 store inputs → `[BOOK]` → booking-details khule.
10. Rider app par booking mein `notes` mein dono stores ka text dikhe.
11. Home carousel + Explore grid → **pehle jaise hi** (regression).
12. `book-delivery.tsx` ke Food chip se booking → aaj jaisa (regression).

**Naya unit test (`src/__tests__/bannerTargeting.test.ts`) kya cover karega:**
- `storeIds: []` → `storeIdsEmpty === true`
- `storeIds: [3 ids]` → `storeIdsEmpty === false`, names snapshot sahi
- `type: 'food'` + `kind: 'store'` mismatch → `STORE_TYPE_MISMATCH`
- `listForTab({type:'food'})` grocery banner return na kare
- `applicableStores()` ALL case mein category-matched active stores de

---

## 9. Acceptance criteria → implementation mapping (spec §23)

| # | Criterion | Implementation | Verify by |
|---|---|---|---|
| 1 | Sidebar mein Banner Management | `Layout.tsx` nav + icon import (+2) | manual step 1 |
| 2 | Admin naya banner create kar sake | `POST /admin/category-banners` | manual step 2 |
| 3 | Image upload | `ImageField` → `POST /uploads` (8MB, existing) | manual step 2 |
| 4 | Title add | `title` required, max 140 | manual step 2 |
| 5 | Type sirf Food/Grocery | `z.enum(['food','grocery'])` — server-enforced | unit test + manual |
| 6 | Multiple stores select | `StoreMultiSelect` + `storeIds[]` max 100 | manual step 2 |
| 7 | No selection = All | `storeIdsEmpty: true` + `applicableStores()` | unit test + manual step 3 |
| 8 | Food tab par sirf Food | server `type` filter | unit test + manual step 4 |
| 9 | Grocery tab par sirf Grocery | same | unit test + manual step 5 |
| 10 | Baaki tabs unchanged | 3-line guard, baaki call-sites verified unaffected | manual step 6 |
| 11 | Banners vertical | `FlatList` | manual step 4 |
| 12 | Banner click → detail screen | `router.push('/banner-detail')` | manual step 7 |
| 13 | Details + Rating tabs | `DetailTabBar` | manual step 7 |
| 14 | Store info dikhe | `stores[]` payload | manual step 7 |
| 15 | Menu dikhe | `menu.imageUrl` / `menu.items` + empty state | manual step 7 |
| 16 | Rating/reviews dikhe | `/reviews` aggregate + empty state | manual step 7 |
| 17 | Pickup flow kaam kare | existing `/select-location` (no bannerId) | manual step 8 |
| 18 | Already-selected pickup handle | `draft.pickup.trim()` check | manual step 8 |
| 19 | Multi-store alag inputs | `storeInputs[storeId]` | manual step 9 |
| 20 | Existing Book kaam kare | `POST /bookings` unchanged | manual step 9-10 |
| 21 | Unrelated app unaffected | §7 non-change table | manual step 11-12 |

---

## 10. Delivery phases

| Phase | Kaam | Files | Depends on |
|---|---|---|---|
| **P1** | Server: models + migration + store CRUD API | 6 new, 3 edits | — |
| **P2** | Server: banner CRUD + public tab/detail/reviews API + unit test | 5 new, 3 edits | P1 |
| **P3** | Server: booking additive fields | 3 edits (additive) | P1 |
| **P4** | Admin: Stores page | 1 new, 2 edits | P1 |
| **P5** | Admin: Banner Management page + multi-select | 2 new, 2 edits | P2, P4 |
| **P6** | App: endpoint module + `category-banners` screen + tile guard | 2 new, 2 edits | P2 |
| **P7** | App: `banner-detail` + tabs + menu + rating | 3 new | P2, P6 |
| **P8** | App: pickup/drop + store inputs + BOOK | 2 new, 2 edits | P3, P7 |
| **P9** | Regression pass (§8 checklist) + typecheck/build | — | all |

---

## 11. Open questions — implementation shuru karne se pehle jawab chahiye

1. **Store master kaun bharega?** Naya `StoresPage` admin se manually, ya import/seed chahiye?
2. **Menu format:** photographed image (`menuImageUrl` — existing Food banner pattern) ya structured items
   (name/price) ya dono? Plan dono support karta hai; confirm karein ki admin form mein kaunsa primary hai.
3. **"ALL" ka matlab exactly kya:** sabhi active stores us `type` ke (recommended), ya sirf wahi stores
   jo us city/area mein hain (geo filter — existing `Coverage` polygons reuse karke)?
4. **Ratings day-1 par:** computed-only (naye stores 0 reviews se start honge) acceptable hai, ya admin
   manual `ratingSummary` enter kare (plan mein optional field hai)?
5. **Ek booking mein kitne stores max?** Plan 10 rakhta hai (`storeInputs.max(10)`); existing extra-pickup
   limit 3 hai (`MAX_EXTRA_PICKUPS`, `bannerPickup.ts:4`) — par hum stores ko pickup stops nahi bana rahe,
   isliye 3 wali limit apply nahi hoti. Confirm karein.
6. **Per-store input mein kya collect karna hai:** sirf free-text order note (plan ka default), ya
   quantity/items structured form?
7. **Grocery store ka `type` value:** spec "Grocery" kehta hai, existing category slug `groceries` hai
   (`seed.ts:27`). Banner `type` = `'grocery'` (spec ke mutabik) aur category mapping internal rakhi gayi hai —
   agar aap `'groceries'` chahen to bata dein.

---

### Ek line mein

Do naye master entities (`Restaurant`, `CategoryBanner`) server par, ek naya admin section
(Banner Management + Stores), aur customer app mein 2 naye screens — existing code mein
**sirf 3 files / ~9 lines** change, taaki Food/Grocery ke alawa kuch bhi na hile.
