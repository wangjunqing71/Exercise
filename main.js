const fileInput=document.getElementById('file');
const sliceRange=document.getElementById('slice');
const sliceVal=document.getElementById('sliceVal');
const textsBox=document.getElementById('texts');
const addTextBtn=document.getElementById('addText');
const canvas=document.getElementById('canvas');
const hint=document.getElementById('hint');
const fontSizeInput=document.getElementById('fontSize');
const strokeWidthInput=document.getElementById('strokeWidth');
const fillInput=document.getElementById('fill');
const strokeInput=document.getElementById('stroke');
const bottomOffsetInput=document.getElementById('bottomOffset');
const sepEnable=document.getElementById('sepEnable');
const sepColor=document.getElementById('sepColor');
const sepWidth=document.getElementById('sepWidth');
const sepMargin=document.getElementById('sepMargin');
const wmText=document.getElementById('wmText');
const wmPos=document.getElementById('wmPos');
const wmOpacity=document.getElementById('wmOpacity');
const downloadBtn=document.getElementById('download');
const copyBtn=document.getElementById('copy');

let img=null;
let debounceTimer=null;

function initTexts(){
  textsBox.innerHTML='';
  addTextRow('说吧，你还想要啥？');
  addTextRow('都是小 CASE，');
  addTextRow('分分钟变给你');
}

function addTextRow(val=''){
  const row=document.createElement('div');
  row.className='text-row';
  const input=document.createElement('input');
  input.type='text';
  input.value=val;
  input.addEventListener('input',scheduleRender);
  const del=document.createElement('button');
  del.className='btn';
  del.textContent='删除';
  del.onclick=()=>{row.remove();scheduleRender();};
  row.appendChild(input);
  row.appendChild(del);
  textsBox.appendChild(row);
}

function getTexts(){
  return Array.from(textsBox.querySelectorAll('input')).map(i=>i.value).filter(s=>s.trim().length>0);
}

function scheduleRender(){
  if(debounceTimer)clearTimeout(debounceTimer);
  debounceTimer=setTimeout(render,200);
}

function drawText(ctx,txt,x,y,options){
  const lines=wrapText(ctx,txt,options.maxWidth);
  lines.forEach((line,idx)=>{
    const ly=y+idx*options.lineHeight;
    ctx.lineWidth=options.strokeWidth;
    ctx.strokeStyle=options.stroke;
    ctx.fillStyle=options.fill;
    ctx.textAlign='center';
    ctx.textBaseline='bottom';
    ctx.strokeText(line,x,ly);
    ctx.fillText(line,x,ly);
  });
}

function wrapText(ctx,txt,maxWidth){
  const res=[];
  let line='';
  for(let i=0;i<txt.length;i++){
    const test=line+txt[i];
    const w=ctx.measureText(test).width;
    if(w>maxWidth&&line.length>0){
      res.push(line);
      line=txt[i];
    }else{
      line=test;
    }
  }
  if(line.length>0)res.push(line);
  return res;
}

function render(){
  const texts=getTexts();
  const Hslice=parseInt(sliceRange.value,10);
  sliceVal.textContent=`${Hslice}px`;
  if(!img){
    const dpr=window.devicePixelRatio||1;
    canvas.width=800*dpr;canvas.height=450*dpr;canvas.style.width='100%';canvas.style.height='auto';
    const ctx=canvas.getContext('2d');
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#0b0e12';
    ctx.fillRect(0,0,800,450);
    hint.textContent='请上传图片';
    return;
  }
  const card=document.querySelector('.preview-card');
  const availW=Math.max(300, Math.floor(card.clientWidth-32));
  const availH=Math.max(300, Math.floor(card.clientHeight-32));
  const totalRawH=img.naturalHeight + Math.max(texts.length-1,0)*Hslice;
  const scaleByW=availW / img.naturalWidth;
  const scaleByH=availH / totalRawH;
  const scale=Math.min(1, Math.max(0.1, Math.min(scaleByW, scaleByH))); // 0.1~1 范围，确保不变形
  const targetW=Math.round(img.naturalWidth * scale);
  drawIntoCanvas(canvas, targetW, Hslice, texts, true);
  hint.textContent=`原始 ${img.naturalWidth}x${img.naturalHeight} · 预览 ${canvas.width/window.devicePixelRatio}x${canvas.height/window.devicePixelRatio}`;
}

function drawIntoCanvas(outCanvas, targetW, Hslice, texts, useDpr){
  const dpr=useDpr?(window.devicePixelRatio||1):1;
  const scale=targetW/img.naturalWidth;
  const targetImgH=Math.round(img.naturalHeight*scale);
  const targetSliceH=Math.round(Hslice*scale);
  const W=targetW; const H=targetImgH + Math.max(texts.length-1,0)*targetSliceH;
  outCanvas.width=W*dpr; outCanvas.height=H*dpr; outCanvas.style.width=`${W}px`; outCanvas.style.height=`${H}px`;
  const ctx=outCanvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,W,H);
  // 主图按等宽缩放绘制
  ctx.drawImage(img,0,0,img.naturalWidth,img.naturalHeight,0,0,W,targetImgH);
  const maxTextWidth=W-48;
  const fontPx=parseInt(fontSizeInput.value,10)*scale;
  const bottomOffset=parseInt(bottomOffsetInput.value,10)*scale;
  ctx.font=`bold ${Math.max(12,Math.round(fontPx))}px "PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif`;
  drawText(ctx,texts[0]||'',W/2,targetImgH-bottomOffset,{
    strokeWidth:Math.max(1,Math.round(parseInt(strokeWidthInput.value,10)*scale)),
    stroke:strokeInput.value,
    fill:fillInput.value,
    lineHeight:Math.max(12,Math.round(fontPx*1.2)),
    maxWidth:maxTextWidth
  });
  // 切片模板：直接用原图底部区域缩放绘制
  let y=targetImgH;
  for(let i=1;i<texts.length;i++){
    ctx.drawImage(
      img,
      0, img.naturalHeight-Hslice, img.naturalWidth, Hslice,
      0, y, W, targetSliceH
    );
    if(sepEnable.checked){
      const m=Math.round(parseInt(sepMargin.value,10)*scale);
      ctx.fillStyle=sepColor.value;
      const sw=Math.max(1,Math.round(parseInt(sepWidth.value,10)*scale));
      ctx.fillRect(0,y+m,W,sw);
      ctx.fillRect(0,y+targetSliceH-m-sw,W,sw);
    }
    ctx.font=`bold ${Math.max(12,Math.round(fontPx))}px "PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif`;
    drawText(ctx,texts[i],W/2,y+targetSliceH-bottomOffset,{
      strokeWidth:Math.max(1,Math.round(parseInt(strokeWidthInput.value,10)*scale)),
      stroke:strokeInput.value,
      fill:fillInput.value,
      lineHeight:Math.max(12,Math.round(fontPx*1.2)),
      maxWidth:maxTextWidth
    });
    y+=targetSliceH;
  }
  // 水印
  if(wmPos.value!=='none'&&wmText.value.trim().length>0){
    const op=parseFloat(wmOpacity.value);
    ctx.globalAlpha=op;
    ctx.font=`${Math.max(12,Math.round(fontPx*0.6))}px "PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif`;
    ctx.fillStyle='#111';
    ctx.textAlign='right';
    ctx.textBaseline='bottom';
    let wx=W-16,wy=H-16;
    if(wmPos.value==='ru'){wy=targetImgH-16;}
    ctx.fillText(wmText.value,wx,wy);
    ctx.globalAlpha=1;
  }
}

function download(){
  if(!img){return;}
  const texts=getTexts();
  const Hslice=parseInt(sliceRange.value,10);
  const off=document.createElement('canvas');
  drawIntoCanvas(off, img.naturalWidth, Hslice, texts, false); // 导出按原始宽度渲染
  off.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`${Date.now()}.png`;a.click();URL.revokeObjectURL(a.href);});
}

async function copyToClipboard(){
  if(!navigator.clipboard||!window.ClipboardItem||!img){return;}
  const texts=getTexts();
  const Hslice=parseInt(sliceRange.value,10);
  const off=document.createElement('canvas');
  drawIntoCanvas(off, img.naturalWidth, Hslice, texts, false);
  return new Promise(resolve=>{off.toBlob(async b=>{try{await navigator.clipboard.write([new ClipboardItem({'image/png':b})]);resolve();}catch(e){resolve();}},'image/png');});
}

fileInput.addEventListener('change',e=>{
  const f=e.target.files[0];
  if(!f)return;
  const url=URL.createObjectURL(f);
  const image=new Image();
  image.onload=()=>{img=image;scheduleRender();};
  image.src=url;
});

sliceRange.addEventListener('input',scheduleRender);
fontSizeInput.addEventListener('input',scheduleRender);
strokeWidthInput.addEventListener('input',scheduleRender);
fillInput.addEventListener('input',scheduleRender);
strokeInput.addEventListener('input',scheduleRender);
bottomOffsetInput.addEventListener('input',scheduleRender);
sepEnable.addEventListener('change',scheduleRender);
sepColor.addEventListener('input',scheduleRender);
sepWidth.addEventListener('input',scheduleRender);
sepMargin.addEventListener('input',scheduleRender);
wmText.addEventListener('input',scheduleRender);
wmPos.addEventListener('change',scheduleRender);
wmOpacity.addEventListener('input',scheduleRender);

addTextBtn.onclick=()=>addTextRow('');
downloadBtn.onclick=download;
copyBtn.onclick=copyToClipboard;

initTexts();
scheduleRender();

window.addEventListener('resize',scheduleRender);
