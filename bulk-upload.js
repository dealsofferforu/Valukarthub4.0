const bulkStore = window.ValueKartStore;
let bulkRawRows = [];
let bulkValidatedRows = [];
let bulkCurrentFile = null;

const bulkEls = {
  dropzone: document.getElementById('bulkDropzone'),
  fileInput: document.getElementById('bulkFileInput'),
  fileBar: document.getElementById('bulkFileBar'),
  fileName: document.getElementById('bulkFileName'),
  fileMeta: document.getElementById('bulkFileMeta'),
  clearFile: document.getElementById('bulkClearFile'),
  createCategories: document.getElementById('bulkCreateCategories'),
  duplicateMode: document.getElementById('bulkDuplicateMode'),
  statusMode: document.getElementById('bulkStatusMode'),
  importBtn: document.getElementById('bulkImportBtn'),
  totalRows: document.getElementById('bulkTotalRows'),
  readyRows: document.getElementById('bulkReadyRows'),
  updateRows: document.getElementById('bulkUpdateRows'),
  errorRows: document.getElementById('bulkErrorRows'),
  emptyState: document.getElementById('bulkEmptyState'),
  tableWrap: document.getElementById('bulkTableWrap'),
  tableBody: document.getElementById('bulkTableBody'),
  errors: document.getElementById('bulkErrors')
};

function bulkEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function bulkMoney(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function bulkNumber(value, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  const cleaned = String(value ?? '').replace(/[₹,\s]/g, '').trim();
  if (!cleaned) return fallback;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : fallback;
}

function bulkBoolean(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['true', 'yes', 'y', '1', 'live', 'active', 'published'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0', 'draft', 'inactive', 'hidden'].includes(normalized)) return false;
  return fallback;
}

function bulkDiscount(price, mrp) {
  price = Number(price || 0);
  mrp = Number(mrp || 0);
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

function bulkDefaultBadgeText(badge, price, mrp) {
  const discount = bulkDiscount(price, mrp);
  const defaults = {
    discount: discount ? `${discount}% off` : 'Deal',
    limited: 'Limited Time',
    flash: 'Flash Sale',
    handpicked: 'Handpicked',
    popular: 'Popular',
    new: 'New'
  };
  return defaults[badge] || 'Deal';
}

function bulkNormalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const bulkHeaderAliases = {
  title: ['title', 'product_title', 'product_name', 'name'],
  category: ['category', 'category_name'],
  price: ['price', 'deal_price', 'selling_price', 'sale_price'],
  mrp: ['mrp', 'list_price', 'original_price'],
  rating: ['rating', 'deal_score', 'score'],
  badge: ['badge', 'badge_type'],
  badge_text: ['badge_text', 'badge_label'],
  amazon_url: ['amazon_url', 'affiliate_url', 'amazon_link', 'product_url', 'url'],
  image_url: ['image_url', 'image', 'product_image'],
  description: ['description', 'short_description', 'deal_description'],
  views: ['views', 'popularity'],
  active: ['active', 'status', 'live'],
  art: ['art', 'emoji', 'fallback_emoji']
};

function bulkCanonicalKey(header) {
  const normalized = bulkNormalizeHeader(header);
  for (const [canonical, aliases] of Object.entries(bulkHeaderAliases)) {
    if (aliases.includes(normalized)) return canonical;
  }
  return normalized;
}

function bulkParseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = String(text || '').replace(/^\uFEFF/, '');

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  if (!rows.length) return [];

  const headers = rows[0].map(bulkCanonicalKey);
  return rows.slice(1).map(values => {
    const object = {};
    headers.forEach((header, index) => { object[header] = values[index] ?? ''; });
    return object;
  }).filter(object => Object.values(object).some(value => String(value ?? '').trim() !== ''));
}

function bulkLoadSheetJs() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (window.__valueKartSheetJsPromise) return window.__valueKartSheetJsPromise;

  const urls = [
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'
  ];

  window.__valueKartSheetJsPromise = new Promise((resolve, reject) => {
    let index = 0;
    const tryNext = () => {
      if (index >= urls.length) {
        reject(new Error('Excel reader could not load. Use the CSV template instead.'));
        return;
      }
      const script = document.createElement('script');
      script.src = urls[index++];
      script.async = true;
      script.onload = () => window.XLSX ? resolve(window.XLSX) : tryNext();
      script.onerror = () => tryNext();
      document.head.appendChild(script);
    };
    tryNext();
  });
  return window.__valueKartSheetJsPromise;
}

async function bulkReadFile(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  if (extension === 'csv') {
    return bulkParseCsv(await file.text());
  }
  if (extension === 'xlsx' || extension === 'xls') {
    const XLSX = await bulkLoadSheetJs();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    return rows.map(row => {
      const normalized = {};
      Object.entries(row).forEach(([key, value]) => { normalized[bulkCanonicalKey(key)] = value; });
      return normalized;
    }).filter(object => Object.values(object).some(value => String(value ?? '').trim() !== ''));
  }
  throw new Error('Unsupported file type. Upload CSV, XLSX or XLS.');
}

function bulkFindExistingProduct(products, title, category, amazonUrl) {
  const normalizedUrl = String(amazonUrl || '').trim().toLowerCase();
  const normalizedTitle = String(title || '').trim().toLowerCase();
  if (normalizedUrl) {
    const byUrl = products.find(product => String(product.amazonUrl || '').trim().toLowerCase() === normalizedUrl);
    if (byUrl) return byUrl;
  }
  return products.find(product => String(product.title || '').trim().toLowerCase() === normalizedTitle && product.category === category);
}

function bulkResolveCategory(rawCategory, categories, createMissing) {
  const raw = String(rawCategory || '').trim();
  if (!raw) return { error: 'Category is required.' };
  const rawLower = raw.toLowerCase();
  const slugCandidate = bulkStore.slugify(raw);
  const existing = categories.find(category => category.slug === rawLower || category.slug === slugCandidate || category.name.toLowerCase() === rawLower);
  if (existing) return { slug: existing.slug, name: existing.name, existing: true };
  if (!createMissing) return { error: `Category “${raw}” does not exist.` };
  if (!slugCandidate) return { error: 'Category name is invalid.' };
  return { slug: slugCandidate, name: raw, existing: false };
}

function bulkValidateRows() {
  const categories = bulkStore.getCategories();
  const products = bulkStore.getProducts();
  const createMissing = bulkEls.createCategories.checked;
  const duplicateMode = bulkEls.duplicateMode.value;
  const seenImportKeys = new Set();
  const allowedBadges = new Set(['discount', 'limited', 'flash', 'handpicked', 'popular', 'new']);

  bulkValidatedRows = bulkRawRows.slice(0, 1000).map((row, index) => {
    const errors = [];
    const title = String(row.title ?? '').trim();
    const categoryResolution = bulkResolveCategory(row.category, categories, createMissing);
    const price = bulkNumber(row.price, 0);
    const mrp = bulkNumber(row.mrp, 0);
    const amazonUrl = String(row.amazon_url ?? '').trim();
    let rating = bulkNumber(row.rating, 4.5);
    rating = Math.min(5, Math.max(1, rating || 4.5));
    let badge = String(row.badge || 'discount').trim().toLowerCase();
    if (!allowedBadges.has(badge)) badge = 'discount';
    const views = Math.max(0, Math.round(bulkNumber(row.views, 0)));

    if (!title) errors.push('Title is required.');
    if (categoryResolution.error) errors.push(categoryResolution.error);
    if (!(price > 0)) errors.push('Price must be greater than 0.');
    if (mrp && mrp < price) errors.push('MRP cannot be lower than deal price.');
    if (!amazonUrl) errors.push('Amazon URL is required.');
    else if (!/^https?:\/\//i.test(amazonUrl)) errors.push('Amazon URL must start with http:// or https://.');

    const category = categoryResolution.slug || '';
    const importKey = `${amazonUrl.trim().toLowerCase()}|${title.toLowerCase()}|${category}`;
    if (seenImportKeys.has(importKey)) errors.push('Duplicate row inside this upload file.');
    else seenImportKeys.add(importKey);

    const existing = errors.length ? null : bulkFindExistingProduct(products, title, category, amazonUrl);
    let action = 'new';
    if (existing) action = duplicateMode === 'update' ? 'update' : 'skip';

    let active;
    if (bulkEls.statusMode.value === 'live') active = true;
    else if (bulkEls.statusMode.value === 'draft') active = false;
    else active = bulkBoolean(row.active, existing ? existing.active !== false : true);

    return {
      sourceRow: index + 2,
      raw: row,
      title,
      category,
      categoryName: categoryResolution.name || String(row.category || '').trim(),
      categoryNeedsCreate: !categoryResolution.error && categoryResolution.existing === false,
      price,
      mrp,
      rating,
      badge,
      badgeText: String(row.badge_text ?? '').trim() || bulkDefaultBadgeText(badge, price, mrp),
      amazonUrl,
      image: String(row.image_url ?? '').trim(),
      description: String(row.description ?? '').trim(),
      views,
      art: String(row.art ?? '').trim() || '🛍️',
      active,
      existing,
      action,
      errors
    };
  });

  bulkRenderPreview();
}

function bulkRenderPreview() {
  const total = bulkValidatedRows.length;
  const errors = bulkValidatedRows.filter(row => row.errors.length);
  const updates = bulkValidatedRows.filter(row => !row.errors.length && row.action === 'update');
  const ready = bulkValidatedRows.filter(row => !row.errors.length && row.action !== 'skip');
  const skipped = bulkValidatedRows.filter(row => !row.errors.length && row.action === 'skip');

  bulkEls.totalRows.textContent = total;
  bulkEls.readyRows.textContent = ready.length;
  bulkEls.updateRows.textContent = updates.length;
  bulkEls.errorRows.textContent = errors.length;
  bulkEls.importBtn.disabled = ready.length === 0;
  bulkEls.emptyState.hidden = total > 0;
  bulkEls.tableWrap.hidden = total === 0;

  const previewRows = bulkValidatedRows.slice(0, 250);
  bulkEls.tableBody.innerHTML = previewRows.map(row => {
    let statusClass = 'ready';
    let statusText = 'Ready';
    if (row.errors.length) { statusClass = 'error'; statusText = 'Needs fix'; }
    else if (row.action === 'update') { statusClass = 'update'; statusText = 'Update'; }
    else if (row.action === 'skip') { statusClass = 'skip'; statusText = 'Skip'; }
    return `
      <tr>
        <td>${row.sourceRow}</td>
        <td><div class="bulk-row-title"><strong>${bulkEscape(row.title || 'Untitled product')}</strong><small>${bulkEscape(row.amazonUrl || 'No URL')}</small></div></td>
        <td>${bulkEscape(row.categoryName || '—')}</td>
        <td><strong>${bulkMoney(row.price)}</strong>${row.mrp ? `<small class="table-mrp">${bulkMoney(row.mrp)}</small>` : ''}</td>
        <td><span class="bulk-validation ${statusClass}">${statusText}</span></td>
      </tr>`;
  }).join('') + (total > 250 ? `<tr><td colspan="5" style="text-align:center;color:#98a2b3;padding:18px;">Previewing first 250 of ${total} rows.</td></tr>` : '');

  const issueLines = errors.slice(0, 12).map(row => `<li>Row ${row.sourceRow}: ${bulkEscape(row.errors.join(' '))}</li>`);
  if (skipped.length) issueLines.push(`<li>${skipped.length} duplicate row${skipped.length === 1 ? '' : 's'} will be skipped with the current duplicate setting.</li>`);
  if (bulkRawRows.length > 1000) issueLines.push('<li>Only the first 1,000 product rows will be imported.</li>');

  bulkEls.errors.hidden = issueLines.length === 0;
  bulkEls.errors.innerHTML = issueLines.length ? `<strong>Import notes</strong><ul>${issueLines.join('')}</ul>` : '';
}

function bulkClearUpload() {
  bulkRawRows = [];
  bulkValidatedRows = [];
  bulkCurrentFile = null;
  bulkEls.fileInput.value = '';
  bulkEls.fileBar.hidden = true;
  bulkEls.fileName.textContent = 'No file selected';
  bulkEls.fileMeta.textContent = '';
  bulkRenderPreview();
}

async function bulkHandleFile(file) {
  if (!file) return;
  const validExtensions = ['csv', 'xlsx', 'xls'];
  const extension = file.name.split('.').pop().toLowerCase();
  if (!validExtensions.includes(extension)) {
    showToast('Upload a CSV, XLSX or XLS file.');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('Use a file below 10 MB.');
    return;
  }

  bulkCurrentFile = file;
  bulkEls.fileBar.hidden = false;
  bulkEls.fileName.textContent = file.name;
  bulkEls.fileMeta.textContent = `${(file.size / 1024).toFixed(file.size > 1024 * 1024 ? 0 : 1)} KB · Reading file...`;
  bulkEls.importBtn.disabled = true;

  try {
    const rows = await bulkReadFile(file);
    bulkRawRows = rows;
    bulkEls.fileMeta.textContent = `${rows.length} product row${rows.length === 1 ? '' : 's'} detected`;
    if (!rows.length) {
      showToast('No product rows found in this file.');
      bulkClearUpload();
      return;
    }
    bulkValidateRows();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Could not read this upload file.');
    bulkClearUpload();
  }
}

async function bulkImportProducts() {
  const importable = bulkValidatedRows.filter(row => !row.errors.length && row.action !== 'skip');
  if (!importable.length) return;
  if (!confirm(`Import ${importable.length} product${importable.length === 1 ? '' : 's'} into ValueKart?`)) return;

  bulkEls.importBtn.disabled = true;
  bulkEls.importBtn.textContent = 'Importing…';
  try {
    const categories = bulkStore.getCategories();
    const existingSlugs = new Set(categories.map(category => category.slug));
    const missingCategories = [];
    importable.forEach(row => {
      if (row.categoryNeedsCreate && !existingSlugs.has(row.category)) {
        missingCategories.push({ name: row.categoryName, slug: row.category });
        existingSlugs.add(row.category);
      }
    });
    for (const category of missingCategories) await bulkStore.saveCategory(category);

    const payload = importable.map(row => ({
      dbId: row.existing?.dbId || '',
      legacyId: row.existing?.legacyId || bulkStore.uid('product'),
      title: row.title,
      category: row.category,
      secondaryCategories: row.existing?.secondaryCategories || [],
      price: row.price,
      mrp: row.mrp || row.existing?.mrp || 0,
      rating: row.rating || row.existing?.rating || 4.5,
      badge: row.badge || row.existing?.badge || 'discount',
      badgeText: row.badgeText || row.existing?.badgeText || bulkDefaultBadgeText('discount', row.price, row.mrp),
      art: row.art || row.existing?.art || '🛍️',
      image: row.image || row.existing?.image || '',
      amazonUrl: row.amazonUrl,
      views: row.views || row.existing?.views || 0,
      popular: row.views || row.existing?.popular || 0,
      description: row.description || row.existing?.description || '',
      active: row.active
    }));

    // Existing rows are updated individually because the Edge API uses DB UUIDs for updates.
    const updates = payload.filter(p => p.dbId);
    const additions = payload.filter(p => !p.dbId);
    for (const product of updates) await bulkStore.saveProduct(product);
    if (additions.length) await bulkStore.bulkUpsert(additions);

    if (typeof refreshAll === 'function') refreshAll();
    const added = additions.length, updated = updates.length;
    bulkClearUpload();
    showToast(`${added} added${updated ? ` · ${updated} updated` : ''} in Supabase.`);
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Could not import products to Supabase.');
  } finally {
    bulkEls.importBtn.disabled = false;
    bulkEls.importBtn.textContent = 'Import products';
  }
}

bulkEls.dropzone.addEventListener('click', () => bulkEls.fileInput.click());
bulkEls.dropzone.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    bulkEls.fileInput.click();
  }
});
['dragenter', 'dragover'].forEach(type => bulkEls.dropzone.addEventListener(type, event => {
  event.preventDefault();
  bulkEls.dropzone.classList.add('dragover');
}));
['dragleave', 'drop'].forEach(type => bulkEls.dropzone.addEventListener(type, event => {
  event.preventDefault();
  bulkEls.dropzone.classList.remove('dragover');
}));
bulkEls.dropzone.addEventListener('drop', event => bulkHandleFile(event.dataTransfer.files?.[0]));
bulkEls.fileInput.addEventListener('change', event => bulkHandleFile(event.target.files?.[0]));
bulkEls.clearFile.addEventListener('click', bulkClearUpload);
bulkEls.createCategories.addEventListener('change', () => bulkRawRows.length && bulkValidateRows());
bulkEls.duplicateMode.addEventListener('change', () => bulkRawRows.length && bulkValidateRows());
bulkEls.statusMode.addEventListener('change', () => bulkRawRows.length && bulkValidateRows());
bulkEls.importBtn.addEventListener('click', bulkImportProducts);

bulkRenderPreview();
