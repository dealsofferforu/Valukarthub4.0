# ValueKart static website prototype

Open `index.html` in a browser. The prototype includes:

- Responsive home page
- Sticky header + search
- Category filters
- Hero section
- Affiliate disclosure
- Handpicked / honest score / genuine-link trust cards
- Deal cards with limited yellow usage
- Search + filter + sort interactions
- Wishlist heart interaction
- Deal detail page
- Share buttons
- Amazon outbound CTA placeholder
- Responsive footer

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

## Production next steps
1. Replace sample cards with your deal database/API.
2. Replace generic emoji art with real product image URLs.
3. Insert your Amazon Associate tracking tag into outbound links.
4. Add user authentication only if wishlists/account features are needed.
5. Connect an admin panel/CMS for posting deals.
6. Add price-history data if you want a true live tracker.
7. Create real Privacy, Terms, Contact and Affiliate Disclosure pages.

## Admin panel
Open `admin.html` to manage ValueKart products and categories.

The Bulk Upload tab supports:
- CSV imports directly in the browser
- XLSX/XLS imports using SheetJS loaded on demand from a public CDN
- Downloadable CSV and Excel templates
- Row validation before import
- Auto-create missing categories
- Duplicate handling: update existing or skip
- Force Live / Draft or use the file status
- Up to 1,000 product rows per import

Required bulk columns: `title`, `category`, `price`, `amazon_url`.
Optional columns: `mrp`, `rating`, `badge`, `badge_text`, `image_url`, `description`, `views`, `active`, `art`.

Note: the current prototype stores data in browser Local Storage. For production, connect the admin to a database/backend so bulk imports are shared across all users and devices.
