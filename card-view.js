(() => {
  'use strict';
  const status = document.querySelector('#status');
  const rawId = new URLSearchParams(location.search).get('id');
  const id = Number(rawId);
  const card = rawId !== null && rawId.trim() !== '' && Number.isInteger(id)
    ? window.CARDS?.find(item => item.id === id)
    : null;
  if (!card) {
    status.textContent = '找不到這張牌，請回到 78種暖流選擇牌卡。';
    return;
  }
  const image = document.querySelector('#card-image');
  const tools = document.querySelector('#card-tools');
  const zoom = document.querySelector('#zoom');
  const download = document.querySelector('#download');
  document.title = `${card.name}｜洋流牌卡放大與列印`;
  document.querySelector('#card-name').textContent = card.name;
  image.alt = `${card.name}完整牌面`;
  image.addEventListener('load', () => {
    image.hidden = false;
    tools.hidden = false;
    status.textContent = `圖片尺寸 ${image.naturalWidth} × ${image.naturalHeight} 像素。列印時會依紙張比例完整呈現牌面。`;
  });
  image.addEventListener('error', () => {
    status.textContent = '圖片載入失敗，請重新整理後再試一次。';
  });
  image.src = card.image;
  zoom.addEventListener('click', () => {
    const expanded = document.querySelector('#card-art').classList.toggle('expanded');
    zoom.setAttribute('aria-pressed', String(expanded));
    zoom.textContent = expanded ? '縮回適合畫面大小' : '再放大牌卡';
    status.textContent = expanded
      ? '牌卡已放大，可在牌面區域左右、上下滑動查看細節。'
      : `圖片尺寸 ${image.naturalWidth} × ${image.naturalHeight} 像素。列印時會依紙張比例完整呈現牌面。`;
  });
  download.addEventListener('click', async () => {
    download.disabled = true;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('無法建立圖片');
      context.drawImage(image, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('無法匯出圖片');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `洋流-${String(id).padStart(2, '0')}-${card.name}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status.textContent = '牌卡 PNG 已準備下載，可用圖片檢視器開啟列印。';
    } catch {
      status.textContent = '暫時無法下載，請重試或使用列印牌卡。';
    } finally {
      download.disabled = false;
    }
  });
  document.querySelector('#print').addEventListener('click', () => window.print());
})();
