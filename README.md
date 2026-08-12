# ValueKart website prototype

## Pages
- `index.html` — customer-facing deals homepage
- `deal.html` — deal detail page
- `admin-login.html` — administrator sign-in / first-time setup
- `admin.html` — protected product, category, bulk-upload and security control panel

## Admin login
Open `admin.html`. On the first visit, ValueKart redirects to `admin-login.html` and asks you to create an admin username and password.

Prototype protections included:
- PBKDF2-SHA256 password hashing with a random salt
- 210,000 PBKDF2 iterations
- 5 failed attempts trigger a 60-second lockout
- Session stored in Session Storage
- 30-minute idle timeout
- 8-hour maximum session
- Sign out control
- Change-password screen
- Admin pages marked `noindex,nofollow`

**Production warning:** This is still a static front-end prototype. Client-side JavaScript cannot provide true server-enforced access control, and product data is stored in browser Local Storage. Before deploying the admin publicly, connect ValueKart to server-side authentication (for example Supabase Auth) and a database/API with authorization rules.

## Bulk upload
Admin → **Bulk Upload** supports CSV / XLSX / XLS preview, validation, duplicate handling and category creation. Templates are included in the project folder.

## Brand tokens
- Primary: #0C3B2E
- Secondary: #6D9773
- Accent: #FFBA00
- Support: #BB8A52
- Background: #F8F8F3
- Cards: #FFFFFF
- Text: #1F2937
- Border: #E5E7EB
- Headings: Poppins
- Body: Inter

## Recommended local preview
For the most reliable browser security APIs, serve the folder over localhost instead of opening files directly. Example:

`python -m http.server 8000`

Then open `http://localhost:8000/index.html`.
