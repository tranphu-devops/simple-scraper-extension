let selectedData = null; // { html, text, url }

document.getElementById('selectBtn').addEventListener('click', () => {
  // Gửi message tới contentScript để bật chế độ chọn element
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'START_SELECTION' });
  });

  setMessage('Di chuột và click vào vùng cần lấy dữ liệu trên trang...', 'info');
});

// Lắng nghe message từ contentScript khi user đã chọn xong
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ELEMENT_SELECTED') {
    selectedData = {
      html: message.html,
      text: message.text,
      url: message.url
    };

    document.getElementById('preview').textContent =
      selectedData.text.slice(0, 500) || '[Empty]';

    document.getElementById('saveBtn').disabled = false;
    setMessage('Đã chọn xong phần tử, bấm "Lưu vào DB".', 'success');
  }
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  if (!selectedData) {
    setMessage('Chưa có dữ liệu để lưu.', 'error');
    return;
  }

  // Lấy config API từ storage
  chrome.storage.sync.get(['apiUrl', 'apiKey'], async (config) => {
    if (!config.apiUrl) {
      setMessage('Chưa cấu hình API URL trong Settings.', 'error');
      return;
    }

    try {
      setMessage('Đang gửi dữ liệu...', 'info');

      const res = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
        },
        body: JSON.stringify({
          url: selectedData.url,
          html: selectedData.html,
          text: selectedData.text,
          createdAt: new Date().toISOString()
        })
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('API error:', text);
        setMessage('Lưu thất bại: ' + res.status, 'error');
        return;
      }

      setMessage('Đã lưu dữ liệu thành công ✅', 'success');
    } catch (err) {
      console.error(err);
      setMessage('Lỗi kết nối API: ' + err.message, 'error');
    }
  });
});

function setMessage(msg, type) {
  const el = document.getElementById('msg');
  el.textContent = msg;
  el.style.color =
    type === 'error' ? 'red' :
    type === 'success' ? 'green' :
    'black';
}
