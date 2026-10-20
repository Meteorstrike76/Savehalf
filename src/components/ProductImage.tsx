import {useState} from 'react';
import ProductIllustration from './ProductIllustration';
export default function ProductImage({title,imageUrl,sample=false}:{title:string;imageUrl:string|null;sample?:boolean}){
 const source=imageUrl&&/^https:\/\//i.test(imageUrl)?imageUrl:null;
 return <ImageState key={source??'missing'} title={title} source={source} sample={sample}/>;
}
function ImageState({title,source,sample}:{title:string;source:string|null;sample:boolean}){
 const [failed,setFailed]=useState(false);const [loaded,setLoaded]=useState(false);const fallback=!source||failed;
 return <div className="product-photo">
 {(!loaded||fallback)&&<div className="product-photo-fallback"><ProductIllustration title={title}/>{fallback&&!sample&&<span className="product-photo-label">Image unavailable</span>}</div>}
 {source&&!failed&&<img src={source} alt={title} loading="lazy" decoding="async" referrerPolicy="no-referrer" style={{opacity:loaded?1:0}} onLoad={()=>setLoaded(true)} onError={()=>setFailed(true)}/>}
 </div>;
}
