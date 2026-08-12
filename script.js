const toast = document.getElementById('toast');
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

document.querySelectorAll('[data-toast]').forEach(el => el.addEventListener('click', () => showToast(el.dataset.toast)));

document.querySelectorAll('.favorite').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    btn.classList.toggle('active');
    btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
    showToast(btn.classList.contains('active') ? 'Deal saved to your shortlist.' : 'Deal removed from shortlist.');
  });
});

const grid = document.getElementById('dealGrid');
const search = document.getElementById('dealSearch');
const chips = [...document.querySelectorAll('.category-chip')];
const sort = document.getElementById('sortDeals');
const empty = document.getElementById('emptyState');
let currentCategory = 'all';

function refreshDeals() {
  if (!grid) return;
  const query = (search?.value || '').trim().toLowerCase();
  let cards = [...grid.querySelectorAll('.deal-card')];
  cards.forEach(card => {
    const matchesSearch = !query || card.dataset.title.toLowerCase().includes(query) || card.dataset.category.includes(query);
    const matchesCategory = currentCategory === 'all' || card.dataset.category.split(' ').includes(currentCategory);
    card.style.display = matchesSearch && matchesCategory ? '' : 'none';
  });
  const visible = cards.filter(c => c.style.display !== 'none');
  if (empty) empty.style.display = visible.length ? 'none' : 'block';
}

search?.addEventListener('input', refreshDeals);
chips.forEach(chip => chip.addEventListener('click', () => {
  chips.forEach(c => c.classList.remove('active'));
  chip.classList.add('active');
  currentCategory = chip.dataset.category;
  refreshDeals();
}));

sort?.addEventListener('change', () => {
  const cards = [...grid.querySelectorAll('.deal-card')];
  const value = sort.value;
  cards.sort((a,b) => {
    if (value === 'discount') return +b.dataset.discount - +a.dataset.discount;
    if (value === 'low') return +a.dataset.price - +b.dataset.price;
    return +b.dataset.popular - +a.dataset.popular;
  });
  cards.forEach(card => grid.appendChild(card));
});

const productMap = {
  console: { title: 'Portable Handheld Game Console with 520 Classic Games', art: '🎮', price: '₹1,299', mrp: '₹1,999', discount: '35% off' },
  tumbler: { title: '40 oz Insulated Tumbler with Handle, Lid & Reusable Straw', art: '🥤', price: '₹999', mrp: '₹1,499', discount: '33% off' },
  pottery: { title: 'Kids Pottery Wheel Activity Kit with Clay, Paints & Tools', art: '🏺', price: '₹849', mrp: '₹1,199', discount: '29% off' },
  bag: { title: 'Minimal Travel Duffle Bag for Weekend & Cabin Use', art: '👜', price: '₹699', mrp: '₹999', discount: '30% off' },
  trampoline: { title: 'Compact Mini Trampoline for Indoor Fitness & Active Play', art: '🤸', price: '₹3,999', mrp: '₹4,999', discount: '20% off' },
  lamp: { title: 'Unicorn Kids Study Lamp & Soft Night Light for Bedroom', art: '🦄', price: '₹749', mrp: '₹999', discount: '25% off' },
  baby: { title: 'Silicone Baby Feeding Set with Bowl, Spoon & Sippy Cup', art: '🍼', price: '₹599', mrp: '₹999', discount: '40% off' },
  lamp2: { title: 'Rechargeable LED Desk Lamp with Adjustable Brightness', art: '💡', price: '₹899', mrp: '₹1,099', discount: '18% off' }
};

const params = new URLSearchParams(location.search);
const productKey = params.get('product');
if (productKey && productMap[productKey]) {
  const p = productMap[productKey];
  const byId = id => document.getElementById(id);
  if (byId('detailTitle')) byId('detailTitle').textContent = p.title;
  if (byId('crumbName')) byId('crumbName').textContent = p.title;
  if (byId('detailArt')) byId('detailArt').textContent = p.art;
  if (byId('detailPrice')) byId('detailPrice').textContent = p.price;
  if (byId('detailMrp')) byId('detailMrp').textContent = p.mrp;
  if (byId('detailDiscount')) byId('detailDiscount').textContent = p.discount;
  document.title = p.title + ' — ValueKart';
}

document.getElementById('copyLink')?.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(location.href); showToast('Deal link copied.'); }
  catch { showToast('Copy failed — select the URL from your browser.'); }
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
