import type { Deal } from './supabase';
const entries: [string, Deal['store'], Deal['category'], number, number, string][] = [
 ['Extra virgin olive oil · 750ml', 'Coles', 'Groceries', 9,18,'oil'],
 ['Rolled oats · 1kg', 'Woolworths', 'Groceries', 2.5,5,'oats'],
 ['Wireless over-ear headphones', 'Big W', 'Electronics', 39,79,'headphones'],
 ['Cotton waffle throw · sage', 'Target', 'Home & Living', 25,50,'throw'],
 ['Compact air fryer · 5L', 'Kmart', 'Electronics', 49,79,'fryer'],
 ['Greek style yoghurt · 1kg', 'Aldi', 'Groceries', 4.49,5.99,'yoghurt'],
 ['Everyday cotton bath towel', 'Target', 'Home & Living', 10,20,'towel'],
 ['Dark chocolate block · 180g', 'Coles', 'Groceries', 3,6,'chocolate'],
 ['Everyday cotton bath towel', 'Kmart', 'Home & Living', 8,12,'towel'],
 ['Extra virgin olive oil · 750ml', 'Woolworths', 'Groceries', 10,18,'oil'],
 ['Relaxed cotton crew tee', 'Target', 'Fashion', 12,20,'shirt'],
 ['Glass food storage · 3 pack', 'Big W', 'Home & Living', 15,30,'storage'],
 ['Roasted coffee beans · 1kg', 'Aldi', 'Groceries', 14,18,'coffee'],
 ['Ceramic table lamp', 'Kmart', 'Home & Living', 19,29,'lamp'],
 ['Bluetooth portable speaker', 'Big W', 'Electronics', 29,59,'speaker'],
 ['Laundry liquid · 2L', 'Woolworths', 'Groceries', 8,16,'laundry'],
 ['Relaxed cotton crew tee', 'Kmart', 'Fashion', 9,15,'shirt'],
 ['Roasted coffee beans · 1kg', 'Coles', 'Groceries', 16,24,'coffee'],
];
export const demoDeals: Deal[] = entries.map(([title,store,category,discountPrice,originalPrice], i) => ({
 id: `demo-${i}`, title, store, category, discountPrice, originalPrice,
 discountPct: Math.round((1-discountPrice/originalPrice)*100), imageUrl: null,
 dealUrl: '', publishedAt: '2026-10-08T00:00:00Z', couponCode: null, isActive:true, source:'sample'
}));
export const illustration = (title: string) => {
 if (/oil/i.test(title)) return '🫒'; if (/oats/i.test(title)) return '🌾';
 if (/headphone/i.test(title)) return '🎧'; if (/throw|towel/i.test(title)) return '🧶';
 if (/fryer/i.test(title)) return '🍲'; if (/yoghurt/i.test(title)) return '🥛';
 if (/chocolate/i.test(title)) return '🍫'; if (/tee/i.test(title)) return '👕';
 if (/storage/i.test(title)) return '🥣'; if (/coffee/i.test(title)) return '☕';
 if (/lamp/i.test(title)) return '💡'; if (/speaker/i.test(title)) return '🔊';
 if (/laundry/i.test(title)) return '🧴'; return '🛍️';
};
