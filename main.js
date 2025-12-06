const fileInput=document.getElementById('file');
const sliceRange=document.getElementById('slice');
const sliceVal=document.getElementById('sliceVal');
const textsBox=document.getElementById('texts');
const addTextBtn=document.getElementById('addText');
const canvas=document.getElementById('canvas');
const hint=document.getElementById('hint');
const fontSizeInput=document.getElementById('fontSize');
const fontWeightSelect=document.getElementById('fontWeight');
const fontFamilySelect=document.getElementById('fontFamily');
const letterSpacingInput=document.getElementById('letterSpacing');
const lineHeightInput=document.getElementById('lineHeight');
const strokeWidthInput=document.getElementById('strokeWidth');
const fillInput=document.getElementById('fill');
const strokeInput=document.getElementById('stroke');
const bottomOffsetInput=document.getElementById('bottomOffset');
// 文字阴影设置
const shadowEnable=document.getElementById('shadowEnable');
const shadowColor=document.getElementById('shadowColor');
const shadowBlur=document.getElementById('shadowBlur');
const shadowOffsetX=document.getElementById('shadowOffsetX');
const shadowOffsetY=document.getElementById('shadowOffsetY');

const wmText=document.getElementById('wmText');
const wmPos=document.getElementById('wmPos');
const wmOpacity=document.getElementById('wmOpacity');
// 水印图片设置
const watermarkImageInput = document.getElementById('watermarkImageInput');
const watermarkImageBtn = document.getElementById('watermarkImageBtn');
const watermarkImageName = document.getElementById('watermarkImageName');
const watermarkImageOpacity = document.getElementById('watermarkImageOpacity');
const watermarkImageOpacityVal = document.getElementById('watermarkImageOpacityVal');
const watermarkImageSize = document.getElementById('watermarkImageSize');
const watermarkImagePosition = document.getElementById('watermarkImagePosition');
const removeWatermarkImageBtn = document.getElementById('removeWatermarkImageBtn');
const downloadBtn=document.getElementById('download');
const copyBtn=document.getElementById('copy');
// 导出格式设置
const exportFormat=document.getElementById('exportFormat');
const jpgQuality=document.getElementById('jpgQuality');
const jpgQualityVal=document.getElementById('jpgQualityVal');
// 错误提示容器
const errorContainer=document.getElementById('errorContainer');

// 错误提示函数
function showError(message){
  errorContainer.innerHTML=`<div class="error-icon">⚠️</div><div class="error-message">${message}</div><button class="error-close" onclick="hideError()">×</button>`;
  errorContainer.className='error-container';
  errorContainer.style.display='flex';
}

// 成功提示函数
function showSuccess(message){
  errorContainer.innerHTML=`<div class="success-icon">✅</div><div class="success-message">${message}</div><button class="success-close" onclick="hideError()">×</button>`;
  errorContainer.className='success-container';
  errorContainer.style.display='flex';
}

// 隐藏提示函数
function hideError(){
  errorContainer.style.display='none';
}

let img=null;
let debounceTimer=null;
// 水印图片变量
let watermarkImage = null;
let watermarkImageFile = null;

function initTexts(){
  textsBox.innerHTML='';
  addTextRow('说吧，你还想要啥？');
  addTextRow('都是小 CASE，');
  addTextRow('分分钟变给你');
}

function addTextRow(val='', index=null){
  const row=document.createElement('div');
  row.className='text-row';
  row.draggable=true;
  
  // 添加拖拽图标
  const dragHandle=document.createElement('span');
  dragHandle.className='drag-handle';
  dragHandle.innerHTML='☰';
  dragHandle.style.cursor='move';
  dragHandle.style.marginRight='8px';
  dragHandle.style.color='#6e6e73';
  row.appendChild(dragHandle);
  
  const input=document.createElement('input');
  input.type='text';
  input.value=val;
  input.addEventListener('input',scheduleRender);
  // 添加粘贴事件监听
  input.addEventListener('paste',handlePaste);
  row.appendChild(input);
  
  const del=document.createElement('button');
  del.className='btn';
  del.textContent='删除';
  del.onclick=()=>{row.remove();scheduleRender();};
  row.appendChild(del);
  
  // 添加拖拽事件监听
  row.addEventListener('dragstart',dragStart);
  row.addEventListener('dragover',dragOver);
  row.addEventListener('drop',drop);
  
  // 插入到指定位置或末尾
  if(index!==null&&index<textsBox.children.length){
    textsBox.insertBefore(row,textsBox.children[index]);
  }else{
    textsBox.appendChild(row);
  }
}

// 处理批量粘贴功能
function handlePaste(e){
  const clipboardData=e.clipboardData||window.clipboardData;
  const pastedText=clipboardData.getData('text');
  
  // 如果粘贴的文本包含换行符，则进行批量添加
  if(pastedText&&pastedText.includes('\n')){
    e.preventDefault(); // 阻止默认粘贴行为
    
    // 分割文本为多行
    const lines=pastedText.split('\n').filter(line=>line.trim().length>0);
    if(lines.length===0)return;
    
    // 获取当前输入框所在的行
    const currentRow=e.target.closest('.text-row');
    const currentIndex=Array.from(textsBox.children).indexOf(currentRow);
    
    // 替换当前行为第一行
    if(lines.length>0){
      e.target.value=lines[0];
    }
    
    // 添加剩余行
    for(let i=1;i<lines.length;i++){
      addTextRow(lines[i],currentIndex+i);
    }
    
    scheduleRender();
  }
}

// 拖拽排序相关变量和函数
let draggedElement=null;

function dragStart(e){
  draggedElement=this;
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/html',this.innerHTML);
}

function dragOver(e){
  if(e.preventDefault)e.preventDefault();
  e.dataTransfer.dropEffect='move';
  return false;
}

function drop(e){
  if(e.stopPropagation)e.stopPropagation();
  if(draggedElement!=this){
    // 交换位置
    const parent=textsBox;
    const children=Array.from(parent.children);
    const draggedIndex=children.indexOf(draggedElement);
    const dropIndex=children.indexOf(this);
    
    if(draggedIndex<dropIndex){
      parent.insertBefore(draggedElement,this.nextSibling);
    }else{
      parent.insertBefore(draggedElement,this);
    }
    
    scheduleRender();
  }
  return false;
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
    
    // 设置文本样式
    ctx.lineWidth=options.strokeWidth;
    ctx.strokeStyle=options.stroke;
    ctx.fillStyle=options.fill;
    ctx.textAlign='center';
    ctx.textBaseline='bottom';
    ctx.font=`${options.fontWeight} ${Math.max(12,Math.round(options.fontSize))}px "${options.fontFamily}"`;
    ctx.letterSpacing=`${options.letterSpacing}px`;
    
    // 应用文字阴影
    if(options.shadowEnable){
      ctx.shadowColor=options.shadowColor;
      ctx.shadowBlur=options.shadowBlur;
      ctx.shadowOffsetX=options.shadowOffsetX;
      ctx.shadowOffsetY=options.shadowOffsetY;
    }else{
      // 重置阴影
      ctx.shadowColor='transparent';
      ctx.shadowBlur=0;
      ctx.shadowOffsetX=0;
      ctx.shadowOffsetY=0;
    }
    
    // 绘制文本
    ctx.strokeText(line,x,ly);
    ctx.fillText(line,x,ly);
  });
}

function wrapText(ctx,txt,maxWidth){
  const res=[];
  if(!txt||txt.length===0)return res;
  
  // 去除首尾空格
  txt=txt.trim();
  if(txt.length===0)return res;
  
  let start=0;
  const length=txt.length;
  
  while(start<length){
    // 使用二分查找找到当前行最大可能的字符数
    let end=findMaxLineLength(ctx,txt,start,length,maxWidth);
    
    // 如果找到的位置不是字符串末尾，尝试在空白字符或标点处换行
    if(end<length){
      const lastSpace=txt.lastIndexOf(' ',end);
      const lastPunctuation=findLastPunctuation(txt,start,end);
      
      // 优先在空格处换行，如果没有空格则考虑标点符号
      if(lastSpace>start){
        end=lastSpace;
      }else if(lastPunctuation>start){
        end=lastPunctuation+1; // 包含标点符号
      }
    }
    
    // 添加当前行（去除行尾空格）
    let line=txt.substring(start,end).trimRight();
    res.push(line);
    
    // 如果下一个字符是空格，跳过它
    if(end<length&&txt[end]===' '){end++;}
    
    start=end;
  }
  
  return res;
}

// 使用二分查找找到最大行长度
function findMaxLineLength(ctx,txt,start,end,maxWidth){
  let low=start;
  let high=end;
  let result=start;
  
  while(low<=high){
    const mid=Math.floor((low+high)/2);
    const line=txt.substring(start,mid);
    const width=ctx.measureText(line).width;
    
    if(width<=maxWidth){
      result=mid;
      low=mid+1;
    }else{
      high=mid-1;
    }
  }
  
  return result;
}

// 查找最后一个标点符号的位置
function findLastPunctuation(txt,start,end){
  const punctuations=['，',',','。','.','！','!','？','?','；',';','：',':','、'];
  let lastPos=start;
  
  for(let i=start;i<end;i++){
    if(punctuations.includes(txt[i])){
      lastPos=i;
    }
  }
  
  return lastPos;
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
  const lineHeight=parseFloat(lineHeightInput.value);
  const letterSpacing=parseInt(letterSpacingInput.value,10)*scale;
  
  // 设置文本样式参数
  const textOptions={
    strokeWidth:Math.max(1,Math.round(parseInt(strokeWidthInput.value,10)*scale)),
    stroke:strokeInput.value,
    fill:fillInput.value,
    fontSize:fontPx,
    fontWeight:fontWeightSelect.value,
    fontFamily:fontFamilySelect.value,
    letterSpacing:letterSpacing,
    lineHeight:Math.max(12,Math.round(fontPx*lineHeight)),
    maxWidth:maxTextWidth,
    shadowEnable:shadowEnable.checked,
    shadowColor:shadowColor.value,
    shadowBlur:parseFloat(shadowBlur.value)*scale,
    shadowOffsetX:parseFloat(shadowOffsetX.value)*scale,
    shadowOffsetY:parseFloat(shadowOffsetY.value)*scale
  };
  
  drawText(ctx,texts[0]||'',W/2,targetImgH-bottomOffset,textOptions);
  // 切片模板：直接用原图底部区域缩放绘制
  let y=targetImgH;
  for(let i=1;i<texts.length;i++){
    ctx.drawImage(
      img,
      0, img.naturalHeight-Hslice, img.naturalWidth, Hslice,
      0, y, W, targetSliceH
    );

    drawText(ctx,texts[i],W/2,y+targetSliceH-bottomOffset,textOptions);
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
  
  // 水印图片
  if(watermarkImage){
    const op=parseFloat(watermarkImageOpacity.value);
    ctx.globalAlpha=op;
    
    const watermarkSize=parseInt(watermarkImageSize.value);
    let x,y;
    
    // 计算水印图片位置
    switch(watermarkImagePosition.value){
      case 'bottom-right':
        x=W-watermarkSize-16;
        y=H-watermarkSize-16;
        break;
      case 'bottom-left':
        x=16;
        y=H-watermarkSize-16;
        break;
      case 'top-right':
        x=W-watermarkSize-16;
        y=16;
        break;
      case 'top-left':
        x=16;
        y=16;
        break;
      case 'center':
        x=(W-watermarkSize)/2;
        y=(H-watermarkSize)/2;
        break;
      default:
        x=W-watermarkSize-16;
        y=H-watermarkSize-16;
    }
    
    ctx.drawImage(watermarkImage,x,y,watermarkSize,watermarkSize);
    ctx.globalAlpha=1;
  }
}

function download(){
  if(!img){showError('请先上传图片');return;}
  const texts=getTexts();
  if(texts.length===0){showError('请至少添加一行字幕');return;}
  const Hslice=parseInt(sliceRange.value,10);
  const off=document.createElement('canvas');
  drawIntoCanvas(off, img.naturalWidth, Hslice, texts, false); // 导出按原始宽度渲染
  
  // 获取导出格式和质量设置
  const format=exportFormat.value;
  const quality=format==='jpg'?parseFloat(jpgQuality.value):1;
  const mimeType=format==='jpg'?'image/jpeg':'image/png';
  const extension=format;
  
  off.toBlob(b=>{
    if(b){
      const a=document.createElement('a');
      a.href=URL.createObjectURL(b);
      a.download=`${Date.now()}.${extension}`;
      a.click();
      URL.revokeObjectURL(a.href);
      showSuccess('图片导出成功');
    }else{
      showError('图片导出失败，请重试');
    }
  },mimeType,quality);
}

// JPG质量滑块事件监听
jpgQuality.addEventListener('input',e=>{
  jpgQualityVal.textContent=e.target.value;
  scheduleRender();
});

async function copyToClipboard(){
  if(!img){showError('请先上传图片');return;}
  const texts=getTexts();
  if(texts.length===0){showError('请至少添加一行字幕');return;}
  if(!navigator.clipboard||!window.ClipboardItem){showError('浏览器不支持剪贴板功能');return;}
  
  const Hslice=parseInt(sliceRange.value,10);
  const off=document.createElement('canvas');
  drawIntoCanvas(off, img.naturalWidth, Hslice, texts, false);
  
  return new Promise(resolve=>{
    off.toBlob(async b=>{
      try{
        await navigator.clipboard.write([new ClipboardItem({'image/png':b})]);
        showSuccess('图片已复制到剪贴板');
        resolve();
      }catch(e){
        console.error('Copy to clipboard error:',e);
        showError('复制到剪贴板失败，请重试');
        resolve();
      }
    },'image/png');
  });
}

// 文件上传限制常量
const MAX_FILE_SIZE=10*1024*1024; // 10MB
const MAX_IMAGE_WIDTH=5000;
const ALLOWED_TYPES=['image/jpeg','image/png','image/webp','image/gif'];
const ALLOWED_EXTENSIONS=['jpg','jpeg','png','webp','gif'];

// 文件上传
try{
fileInput.addEventListener('change',e=>{
  const f=e.target.files[0];
  if(!f)return;
  
  // 1. 检查文件大小
  if(f.size>MAX_FILE_SIZE){
    showError(`文件大小超过限制（最大10MB），当前大小：${(f.size/1024/1024).toFixed(2)}MB`);
    fileInput.value='';
    return;
  }
  
  // 2. 检查文件类型
  const fileType=f.type;
  const fileName=f.name.toLowerCase();
  const fileExt=fileName.split('.').pop();
  
  if(!ALLOWED_TYPES.includes(fileType)&&!ALLOWED_EXTENSIONS.includes(fileExt)){
    showError('不支持的文件格式，请上传JPG/PNG/WEBP/GIF图片');
    fileInput.value='';
    return;
  }
  
  // 3. 检查图片尺寸
  const url=URL.createObjectURL(f);
  const image=new Image();
  
  image.onload=()=>{
    // 释放URL对象
    URL.revokeObjectURL(url);
    
    // 如果图片宽度超过限制，进行压缩
    if(image.width>MAX_IMAGE_WIDTH){
      showError(`图片宽度过大，最大支持${MAX_IMAGE_WIDTH}像素，正在自动压缩...`);
      const scaleFactor=MAX_IMAGE_WIDTH/image.width;
      const newWidth=MAX_IMAGE_WIDTH;
      const newHeight=Math.round(image.height*scaleFactor);
      
      // 创建临时画布进行压缩
      const canvas=document.createElement('canvas');
      canvas.width=newWidth;
      canvas.height=newHeight;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(image,0,0,newWidth,newHeight);
      
      // 将压缩后的图片转换为Image对象
      canvas.toBlob(blob=>{
        if(blob){          
          const compressedUrl=URL.createObjectURL(blob);
          const compressedImage=new Image();
          compressedImage.onload=()=>{
            img=compressedImage;
            autoCalculateSliceHeight();
            scheduleRender();
            showSuccess('图片已自动压缩并上传成功');
            URL.revokeObjectURL(compressedUrl);
          };
          compressedImage.src=compressedUrl;
        }
      },'image/png');
      return;
    }
    // 图片尺寸符合要求
    img=image;
    autoCalculateSliceHeight();
    scheduleRender();
    showSuccess('图片上传成功');
  };
  
  image.onerror=()=>{
    URL.revokeObjectURL(url);
    showError('图片加载失败，请重试');
    fileInput.value='';
  };
  
  image.src=url;
});}catch(e){console.error('File upload error:',e);showError('文件上传失败，请重试');}

sliceRange.addEventListener('input',scheduleRender);
fontSizeInput.addEventListener('input',scheduleRender);
fontWeightSelect.addEventListener('change',scheduleRender);
fontFamilySelect.addEventListener('change',scheduleRender);
letterSpacingInput.addEventListener('input',scheduleRender);
lineHeightInput.addEventListener('input',scheduleRender);
strokeWidthInput.addEventListener('input',scheduleRender);
fillInput.addEventListener('input',scheduleRender);
strokeInput.addEventListener('input',scheduleRender);
bottomOffsetInput.addEventListener('input',scheduleRender);
// 文字阴影事件监听
shadowEnable.addEventListener('change',scheduleRender);
shadowColor.addEventListener('input',scheduleRender);
shadowBlur.addEventListener('input',scheduleRender);
shadowOffsetX.addEventListener('input',scheduleRender);
shadowOffsetY.addEventListener('input',scheduleRender);

// 水印事件监听
wmText.addEventListener('input',scheduleRender);
wmPos.addEventListener('change',scheduleRender);
wmOpacity.addEventListener('input',scheduleRender);

// 水印图片事件监听
watermarkImageBtn.addEventListener('click',()=>watermarkImageInput.click());
watermarkImageInput.addEventListener('change',handleWatermarkImageUpload);
watermarkImageOpacity.addEventListener('input',(e)=>{
  watermarkImageOpacityVal.textContent=e.target.value;
  scheduleRender();
});
watermarkImageSize.addEventListener('change',scheduleRender);
watermarkImagePosition.addEventListener('change',scheduleRender);
removeWatermarkImageBtn.addEventListener('click',removeWatermarkImage);

// 处理水印图片上传
function handleWatermarkImageUpload(e){
  const file=e.target.files[0];
  if(!file)return;
  
  // 检查文件类型
  const validTypes=['image/png','image/jpeg','image/webp'];
  if(!validTypes.includes(file.type)){
    showError('仅支持PNG、JPG、WEBP格式的水印图片');
    return;
  }
  
  // 检查文件大小（最大1MB）
  if(file.size>1*1024*1024){
    showError('水印图片大小不能超过1MB');
    return;
  }
  
  const reader=new FileReader();
  reader.onload=(event)=>{
    watermarkImage=new Image();
    watermarkImage.onload=()=>{
      watermarkImageFile=file;
      watermarkImageName.textContent=file.name;
      removeWatermarkImageBtn.style.display='inline-block';
      scheduleRender();
      showSuccess('水印图片上传成功');
    };
    watermarkImage.src=event.target.result;
  };
  reader.readAsDataURL(file);
}

// 移除水印图片
function removeWatermarkImage(){
  watermarkImage=null;
  watermarkImageFile=null;
  watermarkImageName.textContent='';
  watermarkImageInput.value='';
  removeWatermarkImageBtn.style.display='none';
  scheduleRender();
  showSuccess('水印图片已移除');
}

// 自动计算切片高度初始值
function autoCalculateSliceHeight() {
  if (!img) return;
  
  // 获取当前的字体大小和行高设置
  const fontSize = parseInt(fontSizeInput.value, 10);
  const lineHeight = parseFloat(lineHeightInput.value);
  
  // 计算单倍行高的像素值
  const lineHeightPx = fontSize * lineHeight;
  
  // 假设每行文本需要的最小高度是行高的1.5倍（预留上下边距）
  const minSliceHeight = Math.ceil(lineHeightPx * 1.5);
  
  // 也考虑图片的整体高度，避免切片过高或过低
  // 目标是让整个图片有一个合理的切片数量（比如5-10个切片）
  const targetSlices = 7;
  const imageHeight = img.naturalHeight;
  const suggestedHeight = Math.ceil(imageHeight / targetSlices);
  
  // 取两者的最大值，但不超过图片高度的1/3
  const maxSliceHeight = Math.ceil(imageHeight / 3);
  const autoHeight = Math.min(maxSliceHeight, Math.max(minSliceHeight, suggestedHeight));
  
  // 设置到input控件
  sliceRange.value = autoHeight;
  
  // 更新显示值
  sliceVal.textContent = `${autoHeight}px`;
}

addTextBtn.onclick=()=>addTextRow('');
downloadBtn.onclick=download;
copyBtn.onclick=copyToClipboard;

initTexts();
scheduleRender();

window.addEventListener('resize',scheduleRender);
