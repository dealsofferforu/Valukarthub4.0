const store = window.ValueKartStore;
const toast = document.getElementById('toast');
let uploadedImageData = '';

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(window.__adminToast);
  window.__adminToast = setTimeout(() => toast.classList.remove('show'), 2300);
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

function getDiscount(price, mrp) {
  price = Number(price || 0);
  mrp = Number(mrp || 0);
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

function categoryName(slug) {
  return store.getCategories().find(c => c.slug === slug)?.name || 'Uncategorized';
}

function renderStats() {
  const products = store.getProducts();
  const live = products.filter(p => p.active !== false);
  const discounts = live.map(p => getDiscount(p.price, p.mrp)).filter(Boolean);
  const avg = discounts.length ? Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length) : 0;
  document.getElementById('statProducts').textContent = products.length;
  document.getElementById('statLive').textContent = live.length;
  document.getElementById('statCategories').textContent = store.getCategories().length;
  document.getElementById('statDiscount').textContent = `${avg}%`;
}

function renderCategorySelect(selected = '') {
  const select = document.getElementById('productCategory');
  const categories = store.getCategories();
  select.innerHTML = `<option value="">Select category</option>${categories.map(c => `<option value="${escapeHtml(c.slug)}">${escapeHtml(c.name)}</option>`).join('')}`;
  if (selected) select.value = selected;
}

function renderProducts() {
  const tbody = document.getElementById('productTableBody');
  const query = document.getElementById('adminProductSearch').value.trim().toLowerCase();
  const products = store.getProducts().filter(p => !query || p.title.toLowerCase().includes(query) || categoryName(p.category).toLowerCase().includes(query));
  document.getElementById('productAdminEmpty').hidden = products.length > 0;
  tbody.innerHTML = products.map(product => {
    const image = product.image
      ? `<img src="${escapeHtml(product.image)}" alt="" />`
      : `<span>${escapeHtml(product.art || '🛍️')}</span>`;
    return `
      <tr>
        <td>
          <div class="admin-product-cell">
            <div class="admin-product-thumb">${image}</div>
            <div><strong>${escapeHtml(product.title)}</strong><small>${escapeHtml(categoryName(product.category))}</small></div>
          </div>
        </td>
        <td><strong>${formatMoney(product.price)}</strong><small class="table-mrp">${product.mrp ? formatMoney(product.mrp) : ''}</small></td>
        <td><span class="status-pill ${product.active !== false ? 'live' : 'draft'}">${product.active !== false ? 'Live' : 'Draft'}</span></td>
        <td><div class="row-actions"><button type="button" class="icon-action" data-edit-product="${escapeHtml(product.id)}" title="Edit">Edit</button><button type="button" class="icon-action danger" data-delete-product="${escapeHtml(product.id)}" title="Delete">Delete</button></div></td>
      </tr>
    `;
  }).join('');
}

function renderCategories() {
  const list = document.getElementById('categoryAdminList');
  const categories = store.getCategories();
  const products = store.getProducts();
  list.innerHTML = categories.map(category => {
    const count = products.filter(p => p.category === category.slug || (p.secondaryCategories || []).includes(category.slug)).length;
    return `
      <div class="category-admin-row">
        <div><strong>${escapeHtml(category.name)}</strong><small>${escapeHtml(category.slug)} · ${count} product${count === 1 ? '' : 's'}</small></div>
        <button class="icon-action danger" type="button" data-delete-category="${escapeHtml(category.id)}">Delete</button>
      </div>
    `;
  }).join('');
}

function refreshAll() {
  renderStats();
  renderProducts();
  renderCategories();
  const selected = document.getElementById('productCategory').value;
  renderCategorySelect(selected);
  updatePreview();
}

function clearProductForm() {
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('productRating').value = '4.5';
  document.getElementById('productArt').value = '🛍️';
  document.getElementById('productViews').value = '0';
  document.getElementById('productActive').checked = true;
  document.getElementById('productFormTitle').textContent = 'Add product';
  document.getElementById('saveProductBtn').textContent = 'Add product';
  document.getElementById('cancelEdit').hidden = true;
  uploadedImageData = '';
  renderCategorySelect();
  updatePreview();
}

function updatePreview() {
  const title = document.getElementById('productTitle').value.trim() || 'Product preview';
  const category = categoryName(document.getElementById('productCategory').value) || 'Category';
  const price = Number(document.getElementById('productPrice').value || 0);
  const mrp = Number(document.getElementById('productMrp').value || 0);
  const discount = getDiscount(price, mrp);
  const imageUrl = uploadedImageData || document.getElementById('productImageUrl').value.trim();
  const art = document.getElementById('productArt').value.trim() || '🛍️';

  document.getElementById('previewTitle').textContent = title;
  document.getElementById('previewCategory').textContent = category;
  document.getElementById('previewPrice').textContent = formatMoney(price);
  document.getElementById('previewDiscount').textContent = discount ? `${discount}% off` : 'No discount';
  document.getElementById('previewMedia').innerHTML = imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" />` : escapeHtml(art);
}

function editProduct(id) {
  const product = store.getProducts().find(p => p.id === id);
  if (!product) return;
  document.getElementById('productId').value = product.id;
  document.getElementById('productTitle').value = product.title || '';
  renderCategorySelect(product.category || '');
  document.getElementById('productRating').value = product.rating ?? 4.5;
  document.getElementById('productPrice').value = product.price ?? '';
  document.getElementById('productMrp').value = product.mrp ?? '';
  document.getElementById('productBadge').value = product.badge || 'discount';
  document.getElementById('productBadgeText').value = product.badgeText || '';
  document.getElementById('productAmazonUrl').value = product.amazonUrl || '';
  document.getElementById('productImageUrl').value = product.image && !product.image.startsWith('data:') ? product.image : '';
  uploadedImageData = product.image?.startsWith('data:') ? product.image : '';
  document.getElementById('productArt').value = product.art || '🛍️';
  document.getElementById('productDescription').value = product.description || '';
  document.getElementById('productViews').value = product.views ?? 0;
  document.getElementById('productActive').checked = product.active !== false;
  document.getElementById('productFormTitle').textContent = 'Edit product';
  document.getElementById('saveProductBtn').textContent = 'Save changes';
  document.getElementById('cancelEdit').hidden = false;
  updatePreview();
  window.scrollTo({ top: 220, behavior: 'smooth' });
}

function deleteProduct(id) {
  const product = store.getProducts().find(p => p.id === id);
  if (!product) return;
  if (!confirm(`Delete “${product.title}”?`)) return;
  store.saveProducts(store.getProducts().filter(p => p.id !== id));
  if (document.getElementById('productId').value === id) clearProductForm();
  refreshAll();
  showToast('Product deleted.');
}

function deleteCategory(id) {
  const category = store.getCategories().find(c => c.id === id);
  if (!category) return;
  const inUse = store.getProducts().some(p => p.category === category.slug || (p.secondaryCategories || []).includes(category.slug));
  if (inUse) {
    showToast('Move or delete products in this category first.');
    return;
  }
  if (!confirm(`Delete category “${category.name}”?`)) return;
  store.saveCategories(store.getCategories().filter(c => c.id !== id));
  refreshAll();
  showToast('Category deleted.');
}

document.getElementById('productForm').addEventListener('submit', event => {
  event.preventDefault();
  const id = document.getElementById('productId').value || store.uid('product');
  const title = document.getElementById('productTitle').value.trim();
  const category = document.getElementById('productCategory').value;
  const price = Number(document.getElementById('productPrice').value || 0);
  const mrp = Number(document.getElementById('productMrp').value || 0);
  const badge = document.getElementById('productBadge').value;
  const discount = getDiscount(price, mrp);
  let badgeText = document.getElementById('productBadgeText').value.trim();
  if (!badgeText) {
    const defaults = { discount: discount ? `${discount}% off` : 'Deal', limited: 'Limited Time', flash: 'Flash Sale', handpicked: 'Handpicked', popular: 'Popular', new: 'New' };
    badgeText = defaults[badge] || 'Deal';
  }

  if (!category) return showToast('Select a category.');
  if (mrp && mrp < price) return showToast('MRP should not be lower than deal price.');

  const products = store.getProducts();
  const existing = products.find(p => p.id === id);
  const product = {
    id,
    title,
    category,
    secondaryCategories: existing?.secondaryCategories || [],
    price,
    mrp,
    rating: Math.min(5, Math.max(1, Number(document.getElementById('productRating').value || 4.5))),
    badge,
    badgeText,
    art: document.getElementById('productArt').value.trim() || '🛍️',
    image: uploadedImageData || document.getElementById('productImageUrl').value.trim() || existing?.image || '',
    amazonUrl: document.getElementById('productAmazonUrl').value.trim(),
    views: Number(document.getElementById('productViews').value || 0),
    popular: Number(document.getElementById('productViews').value || 0),
    description: document.getElementById('productDescription').value.trim(),
    active: document.getElementById('productActive').checked,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const next = existing ? products.map(p => p.id === id ? product : p) : [product, ...products];
  try {
    store.saveProducts(next);
  } catch (error) {
    console.error(error);
    showToast('Storage is full. Use a smaller image or image URL.');
    return;
  }
  clearProductForm();
  refreshAll();
  showToast(existing ? 'Product updated.' : 'Product added to ValueKart.');
});

document.getElementById('categoryForm').addEventListener('submit', event => {
  event.preventDefault();
  const name = document.getElementById('categoryName').value.trim();
  const slug = store.slugify(document.getElementById('categorySlug').value.trim() || name);
  if (!name || !slug) return showToast('Enter a valid category name.');
  const categories = store.getCategories();
  if (categories.some(c => c.slug === slug || c.name.toLowerCase() === name.toLowerCase())) return showToast('Category already exists.');
  categories.push({ id: store.uid('cat'), name, slug });
  store.saveCategories(categories);
  event.target.reset();
  refreshAll();
  showToast('Category added.');
});

document.getElementById('categoryName').addEventListener('input', event => {
  const slug = document.getElementById('categorySlug');
  if (!slug.dataset.manual) slug.value = store.slugify(event.target.value);
});

document.getElementById('categorySlug').addEventListener('input', event => {
  event.target.dataset.manual = event.target.value ? '1' : '';
});

document.getElementById('productImageFile').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 900 * 1024) {
    event.target.value = '';
    showToast('Use an image below 900 KB for this browser prototype.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    uploadedImageData = String(reader.result || '');
    updatePreview();
  };
  reader.readAsDataURL(file);
});

['productTitle','productCategory','productPrice','productMrp','productImageUrl','productArt'].forEach(id => {
  document.getElementById(id).addEventListener('input', updatePreview);
  document.getElementById(id).addEventListener('change', updatePreview);
});

document.getElementById('adminProductSearch').addEventListener('input', renderProducts);
document.getElementById('clearProductForm').addEventListener('click', clearProductForm);
document.getElementById('cancelEdit').addEventListener('click', clearProductForm);

document.getElementById('productTableBody').addEventListener('click', event => {
  const edit = event.target.closest('[data-edit-product]');
  const del = event.target.closest('[data-delete-product]');
  if (edit) editProduct(edit.dataset.editProduct);
  if (del) deleteProduct(del.dataset.deleteProduct);
});

document.getElementById('categoryAdminList').addEventListener('click', event => {
  const del = event.target.closest('[data-delete-category]');
  if (del) deleteCategory(del.dataset.deleteCategory);
});

document.querySelectorAll('.admin-tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.admin-tab').forEach(item => item.classList.remove('active'));
  document.querySelectorAll('.admin-panel').forEach(panel => panel.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById(`${tab.dataset.adminTab}Panel`).classList.add('active');
}));

document.getElementById('resetDemo').addEventListener('click', () => {
  if (!confirm('Reset all products and categories to the original ValueKart demo data?')) return;
  store.reset();
  clearProductForm();
  refreshAll();
  showToast('Demo data restored.');
});

renderCategorySelect();
refreshAll();
