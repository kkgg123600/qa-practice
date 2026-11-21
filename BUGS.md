# Bug reports — Toolshop v5.0 "with bugs" build

- Target: https://with-bugs.practicesoftwaretesting.com (training site with defects seeded on purpose)
- Oracle: https://practicesoftwaretesting.com (same shop, correct build). Every "expected" below is
  the behaviour observed on that build in the same test run, not an assumption.
- Environment: Google Chrome 157 (headless), 1280x720, Linux/WSL2, Playwright 1.65.0
- Date: 2026-11-10
- Run log: `evidence/test-run-2026-11-10-v3.txt` (reference 20/20 passed; with-bugs 10 passed, 8 failed, 2 skipped)

Severity = impact on the user. Priority = how soon it should be fixed. They are separate fields.

| ID | Title | Severity | Priority | Caught by |
|----|-------|----------|----------|-----------|
| BUG-01 | "Price (Low - High)" sorts high to low | Medium | Medium | TC-02 |
| BUG-02 | "+" quantity button does nothing | Medium | High | TC-05 |
| BUG-03 | Add to cart shows an error although the item is added | High | High | TC-06 |
| BUG-04 | Cart line total shows $00.00 | High | High | TC-07 |
| BUG-05 | Navigation label misspelled "Contakt" | Low | Low | TC-04 |
| BUG-06 | Categories menu shows an item labelled "UNDEFINED" | Medium | Medium | TC-04 |
| BUG-07 | API returns all customers' invoices without authentication | Critical | High | API-06, API-08 |
| BUG-08 | Profile and registration responses expose the password hash | High | High | API-08 |
| BUG-09 | After login the user menu reads "User Data not found" | Medium | High | E2E-01 |

---

## BUG-01 — "Price (Low - High)" sorts high to low

**Steps**
1. Open the home page.
2. In the Sort dropdown choose "Price (Low - High)".

**Expected:** prices ascend. Reference build shows $3.55, $3.95, $4.65, ...
**Actual:** prices descend: $125.23, $119.24, $100.79, $80.19, $73.59, $66.54, $58.48, $48.41, $46.50
**Evidence:** `evidence/BUG-01-sort-order.png`

## BUG-02 — "+" quantity button does nothing

**Steps**
1. Open the home page and click the first product (Combination Pliers).
2. Click the "+" button next to the quantity field.

**Expected:** quantity changes from 1 to 2 (reference build).
**Actual:** quantity stays 1. Typing a number into the field still works, so there is a workaround.

## BUG-03 — Add to cart shows an error although the item is added

**Steps**
1. Open the first product.
2. Click "Add to cart".

**Expected:** green message "Product added to shopping cart."
**Actual:** red message "Oeps, something went wrong." The cart badge still increases and the item is
in the cart, so the user is told the action failed when it succeeded — likely to cause duplicate adds.
**Evidence:** `evidence/BUG-03-add-to-cart-toast.png`

## BUG-04 — Cart line total shows $00.00

**Steps**
1. Open the first product (unit price $14.15), set quantity to 3, click "Add to cart".
2. Click the cart icon.

**Expected:** line total $42.45 (14.15 x 3), equal to the cart total.
**Actual:** line total "$00.00"; the cart total below it correctly shows $42.45.
**Evidence:** `evidence/BUG-04-cart-line-total.png`

## BUG-05 — Navigation label misspelled "Contakt"

**Steps:** open any page and read the top navigation.
**Expected:** "Contact". **Actual:** "Contakt".

## BUG-06 — Categories menu shows an item labelled "UNDEFINED"

**Steps**
1. Open the home page.
2. Click "Categories" in the top navigation.

**Expected:** every item has a readable name. Reference build: Hand Tools, Power Tools, Other, Special Tools, Rentals.
**Actual:** Hand Tools, Power Tools, UNDEFINED, Chainsaws, Rentals — the third item's label is a leaked
placeholder where the reference build shows "Other".

## BUG-07 — API returns all customers' invoices without authentication

**Request:** `GET https://api-with-bugs.practicesoftwaretesting.com/invoices` with no `Authorization` header.

**Expected:** `401 {"message":"Unauthorized"}` (reference build). With a valid token, only the caller's own invoices.
**Actual:** `200` with a page of invoices belonging to other users (`user_id` 2 and 3 in the captured
response): billing address, total, payment method, account name and account number. A user registered
seconds earlier, with no orders, receives the same list.
**Impact:** any anonymous visitor can read every customer's order and payment details. Broken access
control, not a display defect — hence Critical.
**Evidence:** failure output of API-06 and API-08 in the run log.

## BUG-08 — Profile and registration responses expose the password hash

**Request:** `GET /users/me` with a valid token (also the body returned by `POST /users/register`).

**Expected:** profile fields only. Reference build returns id, name, phone, dob, email, address.
**Actual:** the response additionally contains `password` (a 64-hex-character hash), `role`, `enabled`
and `failed_login_attempts`.
**Impact:** credential material and internal account state leave the server on every profile load.

## BUG-09 — After login the user menu reads "User Data not found"

**Steps**
1. Sign in with a valid account.
2. Look at the top-right navigation item.

**Expected:** the user's name ("Test Runner" for the test user; reference build).
**Actual:** "User Data not found". During manual exploration the browser's `GET /users/me` call made
right after login was answered 401.
**Evidence:** `evidence/BUG-09-user-menu-after-login.png`
**Note:** E2E-01 stops at this step on the with-bugs build, so the rest of the purchase journey is not
covered by automation there. What lies beyond it is listed below as manual observations.

---

## Observations not yet turned into reports

Seen during exploration, not yet reproduced step by step — each needs its own check before filing:

- The fourth Categories item reads "Chainsaws" where the reference build reads "Special Tools"; may be a seeded defect or a content difference between builds.
- The cart table has two columns both titled "Total" (visible in the BUG-04 screenshot).
- The site logo fails to load (broken image, same screenshot).
- Reference build: opening `/checkout` by typing the URL after adding an item returned HTTP 500 from
  `GET /carts/{id}` once. Seen a single time in a scripted probe; the normal click path works.
- With-bugs, logged in: clicking "Home" in the navigation opens the Contact page (seen in two separate sessions).
- With-bugs, checkout step 3: the Postcode field is pre-filled with the literal text "missing value".
- With-bugs, checkout step 4: the payment method list contains an option "Errror 304 - Missing Payment Gateway".
- With-bugs, checkout step 4: with "Cash on Delivery" selected the Confirm button stayed disabled and
  account name / account number fields were shown. Not yet checked whether filling them enables it.
- Test environment, both builds: the API host fails to accept roughly one in three new TCP connections
  (curl: connect never completes; the next attempt answers in ~0.4s). Not an application defect; the API
  tests retry on transport errors only (`tests/support/http.ts`).
