const toast = document.getElementById('toast');
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function discountPercent(product) {
  const price = Number(product.price || 0);
  const mrp = Number(product.mrp || 0);
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

function categoryName(slug) {
  const categories = window.ValueKartStore?.getCategories?.() || [];
  return categories.find(category => category.slug === slug)?.name || slug || 'Other';
}

function badgeClass(type) {
  return ['discount', 'flash', 'limited'].includes(type) ? 'badge-accent' : 'badge-green';
}

function renderProductMedia(product, detail = false) {
  if (product.image) {
    return `<img class="${detail ? 'detail-product-image' : 'product-image'}" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" loading="lazy" />`;
  }
  return `<div class="${detail ? 'detail-art-inner' : 'product-art-inner'}">${escapeHtml(product.art || '🛍️')}</div>`;
}

function renderCategories() {
  const strip = document.getElementById('categoryStrip');
  if (!strip || !window.ValueKartStore) return;
  const categories = ValueKartStore.getCategories();
  strip.innerHTML = `
    <button class="category-chip active" data-category="all">All Deals</button>
    ${categories.map(category => `<button class="category-chip" data-category="${escapeHtml(category.slug)}">${escapeHtml(category.name)}</button>`).join('')}
  `;
}

function renderDeals() {
  const grid = document.getElementById('dealGrid');
  if (!grid || !window.ValueKartStore) return;
  const products = ValueKartStore.getProducts().filter(product => product.active !== false);
  grid.innerHTML = products.map(product => {
    const allCategories = [product.category, ...(product.secondaryCategories || [])].filter(Boolean);
    const discount = discountPercent(product);
    const badgeText = product.badgeText || (discount ? `${discount}% off` : 'Handpicked');
    const views = Number(product.views || 0) >= 1000 ? `${(Number(product.views) / 1000).toFixed(1)}k` : Number(product.views || 0);
    return `
      <article class="deal-card" data-title="${escapeHtml(product.title)}" data-category="${escapeHtml(allCategories.join(' '))}" data-price="${Number(product.price || 0)}" data-discount="${discount}" data-popular="${Number(product.popular || product.views || 0)}">
        <div class="card-media">
          <div class="product-art">${renderProductMedia(product)}</div>
          <div class="card-badges"><span class="badge ${badgeClass(product.badge)}">${escapeHtml(badgeText)}</span></div>
          <button class="favorite" aria-label="Save deal">♡</button>
        </div>
        <div class="card-body">
          <span class="card-category">${escapeHtml(categoryName(product.category))}</span>
          <div class="card-title">${escapeHtml(product.title)}</div>
          <div class="rating"><span class="stars">★★★★★</span><strong>${Number(product.rating || 4.5).toFixed(1)}</strong><span>ValueKart score</span></div>
          <div class="price-row"><span class="price">${formatMoney(product.price)}</span>${product.mrp ? `<span class="mrp">${formatMoney(product.mrp)}</span>` : ''}${discount ? `<span class="discount">Save ${discount}%</span>` : ''}</div>
          <div class="meta-row"><span>👁 ${views} views</span><span>Recently updated</span></div>
          <a class="btn btn-accent" href="deal.html?product=${encodeURIComponent(product.id)}">Grab Deal</a>
        </div>
      </article>
    `;
  }).join('');
}

renderCategories();
renderDeals();

document.querySelectorAll('[data-toast]').forEach(el => el.addEventListener('click', () => showToast(el.dataset.toast)));

document.addEventListener('click', event => {
  const btn = event.target.closest('.favorite');
  if (!btn) return;
  event.preventDefault();
  btn.classList.toggle('active');
  btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
  showToast(btn.classList.contains('active') ? 'Deal saved to your shortlist.' : 'Deal removed from shortlist.');
});

const grid = document.getElementById('dealGrid');
const search = document.getElementById('dealSearch');
const sort = document.getElementById('sortDeals');
const empty = document.getElementById('emptyState');
let currentCategory = 'all';

function refreshDeals() {
  if (!grid) return;
  const query = (search?.value || '').trim().toLowerCase();
  const cards = [...grid.querySelectorAll('.deal-card')];
  cards.forEach(card => {
    const matchesSearch = !query || card.dataset.title.toLowerCase().includes(query) || card.dataset.category.includes(query);
    const matchesCategory = currentCategory === 'all' || card.dataset.category.split(' ').includes(currentCategory);
    card.style.display = matchesSearch && matchesCategory ? '' : 'none';
  });
  const visible = cards.filter(card => card.style.display !== 'none');
  if (empty) empty.style.display = visible.length ? 'none' : 'block';
}

search?.addEventListener('input', refreshDeals);
document.getElementById('categoryStrip')?.addEventListener('click', event => {
  const chip = event.target.closest('.category-chip');
  if (!chip) return;
  document.querySelectorAll('.category-chip').forEach(item => item.classList.remove('active'));
  chip.classList.add('active');
  currentCategory = chip.dataset.category;
  refreshDeals();
});

sort?.addEventListener('change', () => {
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.deal-card')];
  const value = sort.value;
  cards.sort((a, b) => {
    if (value === 'discount') return +b.dataset.discount - +a.dataset.discount;
    if (value === 'low') return +a.dataset.price - +b.dataset.price;
    return +b.dataset.popular - +a.dataset.popular;
  });
  cards.forEach(card => grid.appendChild(card));
  refreshDeals();
});

const params = new URLSearchParams(location.search);
const productKey = params.get('product');
if (productKey && window.ValueKartStore) {
  const product = ValueKartStore.getProducts().find(item => item.id === productKey);
  if (product) {
    const byId = id => document.getElementById(id);
    const discount = discountPercent(product);
    if (byId('detailTitle')) byId('detailTitle').textContent = product.title;
    if (byId('crumbName')) byId('crumbName').textContent = product.title;
    if (byId('detailArt')) byId('detailArt').innerHTML = renderProductMedia(product, true);
    if (byId('detailPrice')) byId('detailPrice').textContent = formatMoney(product.price);
    if (byId('detailMrp')) byId('detailMrp').textContent = product.mrp ? formatMoney(product.mrp) : '';
    if (byId('detailDiscount')) byId('detailDiscount').textContent = product.badgeText || (discount ? `${discount}% off` : 'Handpicked');
    if (byId('detailScore')) byId('detailScore').textContent = Number(product.rating || 4.5).toFixed(1);
    if (byId('amazonBtn')) byId('amazonBtn').href = product.amazonUrl || 'https://www.amazon.in/';
    if (byId('detailDescriptionText')) byId('detailDescriptionText').textContent = product.description || 'Handpicked ValueKart deal with direct Amazon checkout.';
    if (byId('detailCategory')) byId('detailCategory').textContent = categoryName(product.category);
    document.title = `${product.title} — ValueKart`;
  }
}

document.getElementById('copyLink')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    showToast('Deal link copied.');
  } catch {
    showToast('Copy failed — select the URL from your browser.');
  }
});

document.querySelectorAll('[data-share]').forEach(btn => btn.addEventListener('click', () => {
  const url = encodeURIComponent(location.href);
  const title = encodeURIComponent(document.title);
  const routes = {
    whatsapp: `https://wa.me/?text=${title}%20${url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    x: `https://twitter.com/intent/tweet?text=${title}&url=${url}`
  };
  window.open(routes[btn.dataset.share], '_blank', 'noopener,noreferrer,width=640,height=560');
}));
