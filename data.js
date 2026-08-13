(() => {
  const config = window.ValueKartConfig;
  let categories = [];
  let products = [];

  function slugify(value) {
    return String(value || '').trim().toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  }
  function uid(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
  function mapCategory(row) { return { id: row.id, name: row.name, slug: row.slug, createdAt: row.created_at, updatedAt: row.updated_at }; }
  function mapProduct(row) {
    return {
      id: row.id,
      dbId: row.id,
      legacyId: row.legacy_id || '',
      title: row.title || '',
      category: row.category_slug || '',
      secondaryCategories: row.secondary_categories || [],
      price: Number(row.price || 0), mrp: Number(row.mrp || 0), rating: Number(row.rating || 4.5),
      badge: row.badge || 'handpicked', badgeText: row.badge_text || '', art: row.art || '🛍️', image: row.image || '',
      amazonUrl: row.amazon_url || '', views: Number(row.views || 0), popular: Number(row.popular || 0),
      description: row.description || '', active: row.active !== false, createdAt: row.created_at, updatedAt: row.updated_at
    };
  }
  async function publicFetch(path) {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
      headers: { apikey: config.supabasePublishableKey, Authorization: `Bearer ${config.supabasePublishableKey}` }
    });
    if (!response.ok) throw new Error(`Supabase read failed (${response.status})`);
    return response.json();
  }
  async function loadPublic() {
    const [categoryRows, productRows] = await Promise.all([
      publicFetch('categories?select=*&order=name.asc'),
      publicFetch('products?select=*&active=eq.true&order=created_at.desc')
    ]);
    categories = categoryRows.map(mapCategory);
    products = productRows.map(mapProduct);
    return { categories, products };
  }
  async function loadAdmin() {
    const [categoryData, productData] = await Promise.all([
      window.ValueKartAuth.api('list_categories'),
      window.ValueKartAuth.api('list_products')
    ]);
    categories = (categoryData.categories || []).map(mapCategory);
    products = (productData.products || []).map(mapProduct);
    return { categories, products };
  }
  function getCategories() { return categories; }
  function getProducts() { return products; }
  async function saveProduct(item) {
    const payload = { ...item };
    if (item.dbId) { payload.db_id = item.dbId; delete payload.id; }
    else { delete payload.id; delete payload.dbId; payload.legacyId = item.legacyId || uid('product'); }
    await window.ValueKartAuth.api('save_product', { product: payload });
    return loadAdmin();
  }
  async function deleteProduct(id) { await window.ValueKartAuth.api('delete_product', { id }); return loadAdmin(); }
  async function saveCategory(category) { await window.ValueKartAuth.api('save_category', { category }); return loadAdmin(); }
  async function deleteCategory(slug) { await window.ValueKartAuth.api('delete_category', { slug }); return loadAdmin(); }
  async function bulkUpsert(items) { const result = await window.ValueKartAuth.api('bulk_upsert', { products: items }); await loadAdmin(); return result; }

  window.ValueKartStore = { loadPublic, loadAdmin, getCategories, getProducts, saveProduct, deleteProduct, saveCategory, deleteCategory, bulkUpsert, slugify, uid };
})();
