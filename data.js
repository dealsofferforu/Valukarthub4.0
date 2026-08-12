(function () {
  const CATEGORY_KEY = 'valuekart.categories.v1';
  const PRODUCT_KEY = 'valuekart.products.v1';

  const defaultCategories = [
    { id: 'cat-toys', name: 'Toys & Games', slug: 'toys' },
    { id: 'cat-electronics', name: 'Electronics', slug: 'electronics' },
    { id: 'cat-home', name: 'Home & Kitchen', slug: 'home' },
    { id: 'cat-gifts', name: 'Gifts', slug: 'gifts' },
    { id: 'cat-beauty', name: 'Beauty', slug: 'beauty' },
    { id: 'cat-bags', name: 'Bags & Luggage', slug: 'bags' },
    { id: 'cat-baby', name: 'Baby', slug: 'baby' },
    { id: 'cat-fitness', name: 'Fitness', slug: 'fitness' }
  ];

  const defaultProducts = [
    {
      id: 'console',
      title: 'Portable Handheld Game Console with 520 Classic Games',
      category: 'electronics',
      secondaryCategories: ['toys'],
      price: 1299,
      mrp: 1999,
      rating: 4.7,
      badge: 'discount',
      badgeText: '35% off',
      art: '🎮',
      image: '',
      amazonUrl: 'https://www.amazon.in/',
      views: 1200,
      popular: 99,
      description: 'A compact handheld gaming deal with a clear price comparison and direct Amazon checkout link.',
      active: true,
      createdAt: '2026-08-12T10:00:00.000Z'
    },
    {
      id: 'tumbler',
      title: '40 oz Insulated Tumbler with Handle, Lid & Reusable Straw',
      category: 'home',
      secondaryCategories: ['gifts'],
      price: 999,
      mrp: 1499,
      rating: 4.8,
      badge: 'limited',
      badgeText: 'Limited Time',
      art: '🥤',
      image: '',
      amazonUrl: 'https://www.amazon.in/',
      views: 864,
      popular: 92,
      description: 'Large insulated tumbler deal with reusable straw, handle and direct Amazon purchase link.',
      active: true,
      createdAt: '2026-08-12T09:30:00.000Z'
    },
    {
      id: 'pottery',
      title: 'Kids Pottery Wheel Activity Kit with Clay, Paints & Tools',
      category: 'toys',
      secondaryCategories: ['gifts'],
      price: 849,
      mrp: 1199,
      rating: 4.5,
      badge: 'handpicked',
      badgeText: 'Handpicked',
      art: '🏺',
      image: '',
      amazonUrl: 'https://www.amazon.in/',
      views: 642,
      popular: 88,
      description: 'Creative activity kit deal for children, including pottery tools, clay and painting supplies.',
      active: true,
      createdAt: '2026-08-12T09:00:00.000Z'
    },
    {
      id: 'bag',
      title: 'Minimal Travel Duffle Bag for Weekend & Cabin Use',
      category: 'bags',
      secondaryCategories: ['gifts'],
      price: 699,
      mrp: 999,
      rating: 4.6,
      badge: 'discount',
      badgeText: '30% off',
      art: '👜',
      image: '',
      amazonUrl: 'https://www.amazon.in/',
      views: 505,
      popular: 81,
      description: 'Compact travel bag deal suitable for weekend trips and cabin use.',
      active: true,
      createdAt: '2026-08-12T08:30:00.000Z'
    },
    {
      id: 'trampoline',
      title: 'Compact Mini Trampoline for Indoor Fitness & Active Play',
      category: 'fitness',
      secondaryCategories: ['toys'],
      price: 3999,
      mrp: 4999,
      rating: 4.4,
      badge: 'popular',
      badgeText: 'Popular',
      art: '🤸',
      image: '',
      amazonUrl: 'https://www.amazon.in/',
      views: 312,
      popular: 75,
      description: 'Mini trampoline deal for indoor exercise and active play.',
      active: true,
      createdAt: '2026-08-12T08:00:00.000Z'
    },
    {
      id: 'lamp',
      title: 'Unicorn Kids Study Lamp & Soft Night Light for Bedroom',
      category: 'gifts',
      secondaryCategories: ['toys', 'home'],
      price: 749,
      mrp: 999,
      rating: 4.7,
      badge: 'discount',
      badgeText: '25% off',
      art: '🦄',
      image: '',
      amazonUrl: 'https://www.amazon.in/',
      views: 721,
      popular: 87,
      description: 'Kids study lamp and soft night light deal with a unicorn theme.',
      active: true,
      createdAt: '2026-08-12T07:30:00.000Z'
    },
    {
      id: 'baby',
      title: 'Silicone Baby Feeding Set with Bowl, Spoon & Sippy Cup',
      category: 'baby',
      secondaryCategories: ['home'],
      price: 599,
      mrp: 999,
      rating: 4.8,
      badge: 'flash',
      badgeText: 'Flash Sale',
      art: '🍼',
      image: '',
      amazonUrl: 'https://www.amazon.in/',
      views: 488,
      popular: 84,
      description: 'Baby feeding set deal with coordinated silicone essentials.',
      active: true,
      createdAt: '2026-08-12T07:00:00.000Z'
    },
    {
      id: 'lamp2',
      title: 'Rechargeable LED Desk Lamp with Adjustable Brightness',
      category: 'electronics',
      secondaryCategories: ['home'],
      price: 899,
      mrp: 1099,
      rating: 4.4,
      badge: 'new',
      badgeText: 'New',
      art: '💡',
      image: '',
      amazonUrl: 'https://www.amazon.in/',
      views: 275,
      popular: 69,
      description: 'Rechargeable desk lamp deal with adjustable brightness for study or work.',
      active: true,
      createdAt: '2026-08-12T06:30:00.000Z'
    }
  ];

  function parse(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn('ValueKart storage read failed', error);
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function ensureSeeded() {
    if (!localStorage.getItem(CATEGORY_KEY)) write(CATEGORY_KEY, defaultCategories);
    if (!localStorage.getItem(PRODUCT_KEY)) write(PRODUCT_KEY, defaultProducts);
  }

  function slugify(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function getCategories() {
    ensureSeeded();
    return parse(CATEGORY_KEY, defaultCategories);
  }

  function saveCategories(categories) {
    return write(CATEGORY_KEY, categories);
  }

  function getProducts() {
    ensureSeeded();
    return parse(PRODUCT_KEY, defaultProducts);
  }

  function saveProducts(products) {
    return write(PRODUCT_KEY, products);
  }

  function reset() {
    write(CATEGORY_KEY, defaultCategories);
    write(PRODUCT_KEY, defaultProducts);
  }

  window.ValueKartStore = {
    getCategories,
    saveCategories,
    getProducts,
    saveProducts,
    reset,
    slugify,
    uid,
    defaultCategories,
    defaultProducts
  };
})();
