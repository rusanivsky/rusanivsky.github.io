/* Native-aspect gallery geometry, shared by the builder and the browser.
   Every group consumes adjacent inputs. Nothing is cropped or reordered. */
function compose(photos,width,gap=10,options={}) {
  if (!photos.length) return {height:0,tiles:[],breaks:[]};
  const editorial=options.mode==='series';
  if (!(width > 0) || !Number.isFinite(width)) throw new RangeError('Gallery width must be positive');
  gap = Number.isFinite(gap) ? Math.max(0, gap) : 10;
  photos = photos.map(p => ({...p, w: p.w > 0 && Number.isFinite(p.w) ? p.w : 3, h: p.h > 0 && Number.isFinite(p.h) ? p.h : 2}));
  const heroes=new Set(editorial ? options.heroIds||[] : []);
  // One photograph is a complete composition, not an oversized grid cell.
  if (photos.length === 1) heroes.add(photos[0].n);
  const target=editorial ? Math.min(330,width/3.1) : Math.min(230,width/4.9);
  const maxCount=width<500 ? 3 : editorial ? 4 : 7;
  const r=p=>p.w/p.h;
  const dp=Array(photos.length+1).fill(null);dp[photos.length]={cost:0};
  for(let i=photos.length-1;i>=0;i--) {
    const candidates=[];
    if(heroes.has(photos[i].n)) {
      const h=Math.min(620,width*.83/r(photos[i]));const w=h*r(photos[i]);
      candidates.push({n:1,h,cost:0,kind:'hero',tiles:[{n:photos[i].n,x:(width-w)/2,y:0,w,h}]});
    } else {
      for(let n=1;n<=Math.min(maxCount,photos.length-i);n++) {
        const ps=photos.slice(i,i+n);
        if(ps.some(p=>heroes.has(p.n))) break;
        const sum=ps.reduce((s,p)=>s+r(p),0);
        let h=(width-gap*(n-1))/sum;
        if(h<=0)continue;
        let cost=n*Math.pow(Math.log(h/target),2);
        // A sparse final row may end short, instead of magnifying its last image.
        if(i+n===photos.length && h>target*1.5 && photos.length>1) {
          h=target*1.25;cost=n*.65;
        }
        let x=0;const tiles=ps.map(p=>{const w=r(p)*h;const tile={n:p.n,x,y:0,w,h};x+=w+gap;return tile});
        candidates.push({n,h,cost,kind:'row',tiles});
      }
      // Only adjacent landscape/landscape/portrait or portrait/landscape/landscape.
      // A common-height rectangle is solved from native aspect ratios, including gap.
      if(editorial && (width>=300 || options.compactTetris) && i+3<=photos.length) {
        const ps=photos.slice(i,i+3);const rs=ps.map(r);
        const portraitFirst=rs[0]<.95&&rs[1]>1.15&&rs[2]>1.15;
        const portraitLast=rs[2]<.95&&rs[0]>1.15&&rs[1]>1.15;
        if((portraitFirst||portraitLast)&&!ps.some(p=>heroes.has(p.n))) {
          const k=portraitFirst?0:2;const a=portraitFirst?1:0;const b=a+1;
          const stackRatio=1/(1/rs[a]+1/rs[b]);
          const h=(width-gap+stackRatio*gap)/(rs[k]+stackRatio);
          const pw=rs[k]*h;const sw=stackRatio*(h-gap);
          const px=portraitFirst?0:sw+gap;const sx=portraitFirst?pw+gap:0;
          const tiles=ps.map((p,j)=>j===k?{n:p.n,x:px,y:0,w:pw,h}:{n:p.n,x:sx,y:j===a?0:sw/rs[a]+gap,w:sw,h:sw/rs[j]});
          candidates.push({n:3,h,cost:3*Math.pow(Math.log((h/2)/target),2)-1.25,kind:'tetris',tiles});
        }
      }
    }
    for(const c of candidates){const cost=c.cost+dp[i+c.n].cost;if(!dp[i]||cost<dp[i].cost)dp[i]={...c,cost};}
  }
  const tiles=[],breaks=[];let y=0;
  for(let i=0;i<photos.length;){const c=dp[i];breaks.push({start:i,y,height:c.h,kind:c.kind,count:c.n});tiles.push(...c.tiles.map(t=>({...t,y:t.y+y})));i+=c.n;y+=c.h+(i<photos.length?(editorial?(c.kind==='hero'?48:width<500?24:32):gap):0);}
  return {height:y,tiles,breaks};
}

/* The homepage is a deliberately small selection. A portrait at either end
   becomes the single frame; three horizontal images give the cover the lead.
   The remaining two frames stack in their source order beside it. */
function composeStage(photos, width, gap = 14) {
  const ps = photos.slice(0, 3);
  if (!ps.length) return { height: 0, tiles: [] };
  const ratios = ps.map(p => p.w / p.h);
  if (ps.length < 3) {
    const h = (width - gap * (ps.length - 1)) / ratios.reduce((a,b) => a+b, 0);
    let x = 0;
    return { height: h, tiles: ps.map((p,i) => {
      const w = ratios[i] * h;const tile = { n:p.n, x, y:0, w, h };x += w + gap;return tile;
    }) };
  }
  const single = ratios[2] < 1 && ratios[0] >= 1 && ratios[1] >= 1 ? 2 : 0;
  const a = single === 0 ? 1 : 0; const b = a + 1;
  const stackRatio = 1 / (1 / ratios[a] + 1 / ratios[b]);
  const height = (width - gap + stackRatio * gap) / (ratios[single] + stackRatio);
  const singleWidth = ratios[single] * height;
  const stackWidth = stackRatio * (height - gap);
  const singleX = single === 0 ? 0 : stackWidth + gap;
  const stackX = single === 0 ? singleWidth + gap : 0;
  return { height, tiles: ps.map((p,i) => i === single
    ? { n:p.n, x:singleX, y:0, w:singleWidth, h:height }
    : { n:p.n, x:stackX, y:i === a ? 0 : stackWidth / ratios[a] + gap, w:stackWidth, h:stackWidth / ratios[i] }) };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { compose, composeStage };
if (typeof window !== 'undefined') window.KRGallery = { compose, composeStage };
