export default function ProductIllustration({title}:{title:string}) {
 let shape;
 if (/headphone/i.test(title)) shape=<><path d="M30 62V48a30 30 0 0160 0v14"/><rect x="22" y="53" width="18" height="35" rx="6"/><rect x="80" y="53" width="18" height="35" rx="6"/></>;
 else if (/oil|laundry|milk|yoghurt/i.test(title)) shape=<><rect x="48" y="16" width="24" height="10" rx="2"/><path d="M48 26v14L35 55v48h50V55L72 40V26"/><rect x="43" y="62" width="34" height="24" rx="2"/><path d="M52 74h16"/></>;
 else if (/tee|shirt/i.test(title)) shape=<><path d="M44 24L20 38l12 24 12-7v47h32V55l12 7 12-24-24-14c-6 15-26 15-32 0z"/></>;
 else if (/towel|throw/i.test(title)) shape=<><path d="M26 28h68v62H26z"/><path d="M34 36v46M44 36v46M54 36v46M64 36v46M74 36v46M84 36v46M26 92v9m12-9v9m12-9v9m12-9v9m12-9v9m12-9v9"/></>;
 else if (/coffee|oats|chocolate/i.test(title)) shape=<><path d="M36 18h48l-5 12 9 70H32l9-70z"/><path d="M40 30h40M43 50h34M43 56h34"/><circle cx="60" cy="76" r="12"/></>;
 else if (/lamp/i.test(title)) shape=<><path d="M41 23h38l15 39H26zM60 62v37M40 101h40"/></>;
 else if (/speaker/i.test(title)) shape=<><rect x="26" y="30" width="68" height="61" rx="12"/><circle cx="49" cy="61" r="15"/><circle cx="78" cy="60" r="6"/><path d="M41 24h38"/></>;
 else if (/fryer/i.test(title)) shape=<><rect x="30" y="23" width="60" height="79" rx="15"/><path d="M32 58h56M56 66h8v19h-8zM41 42h38"/></>;
 else shape=<><path d="M23 41h74l-9 51H32z"/><path d="M29 35h62M40 26h40M40 59h40"/></>;
 return <svg className="product-drawing" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shape}</svg>;
}
