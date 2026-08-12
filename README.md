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
Open `admin.html` to manage the demo catalog.

The admin panel can:
- Add, edit and delete products
- Add and delete categories
- Upload a small product image or use an image URL
- Set deal price, MRP, discount badge, rating, status and Amazon affiliate link
- Publish/unpublish products
- Update the homepage category filters and deal cards automatically

### Important
This static prototype stores data in the browser's Local Storage. It is suitable for UI testing only. A production admin should use authentication, a backend API/database, server-side validation, secure image storage, and role-based access.
