let selectedData = null;

const selectBtn    = document.getElementById('selectBtn');
const autoBtn      = document.getElementById('autoBtn');
const selectorInput= document.getElementById('selectorInput');
const saveBtn      = document.getElementById('saveBtn');
const preview      = document.getElementById('preview');
const msg          = document.getElementById('msg');
const openOptions  = document.getElementById('openOptions');

function setMessage(text, type = 'info') {
  msg.textContent = text;
  msg.style.color =
    type === 'error' ? 'red' :
    type === 'success' ? 'green' :
    'black';
}

// Load selector đã lưu (nếu có)
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['autoSelector'], (data) => {
    if (data.autoSelector && selectorInput) {
      selectorInput.value = data.autoSelector;
    }
  });
});

// Nút chọn thủ công
selectBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) {
      setMessage('Không tìm được tab đang mở.', 'error');
      return;
    }

    chrome.tabs.sendMessage(
      tabs[0].id,
      { type: 'START_SELECTION' },
      () => {
        if (chrome.runtime.lastError) {
          console.warn('START_SELECTION error:', chrome.runtime.lastError.message);
          setMessage(
            'Không thể chọn dữ liệu trên trang này (vd: chrome://, Web Store...). Hãy thử trên 1 website bình thường.',
            'error'
          );
          return;
        }
        setMessage('Di chuột và click vào vùng cần lấy dữ liệu...', 'info');
      }
    );
  });
});

// Nút lấy tự động theo CSS selector
autoBtn.addEventListener('click', () => {
  const selector = (selectorInput.value || 'article.meteredContent').trim();
  if (!selector) {
    setMessage('CSS selector đang trống.', 'error');
    saveBtn.disabled = true;
    return;
  }

  // Lưu selector vào storage cho lần sau
  chrome.storage.sync.set({ autoSelector: selector });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) {
      setMessage('Không tìm được tab đang mở.', 'error');
      return;
    }

    chrome.tabs.sendMessage(
      tabs[0].id,
      {
        type: 'AUTO_GRAB',
        selector
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn('AUTO_GRAB send error:', chrome.runtime.lastError.message);
          setMessage(
            'Không thể lấy dữ liệu trên trang này. Hãy thử trên 1 website http/https bình thường.',
            'error'
          );
          saveBtn.disabled = true;
          return;
        }

        if (!response || !response.ok) {
          setMessage(
            `Không tìm thấy phần tử với selector: ${selector}`,
            'error'
          );
          saveBtn.disabled = true;
          return;
        }

        setMessage('Đã yêu cầu lấy dữ liệu tự động, chờ hiển thị...', 'info');
      }
    );
  });
});

// Nhận dữ liệu từ contentScript (cả chọn tay & auto)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ELEMENT_SELECTED') {
    selectedData = {
      html: message.html,
      text: message.text,
      url: message.url,
      title: message.title || ''
    };

    const titleLine = selectedData.title ? `[${selectedData.title}]\n\n` : '';
    preview.textContent =
      titleLine + (selectedData.text?.slice(0, 1000) || '[Empty]');

    saveBtn.disabled = false;
    setMessage('Đã có dữ liệu, bấm "Lưu vào DB".', 'success');
  }
});

// Lưu về backend
saveBtn.addEventListener('click', () => {
  if (!selectedData) {
    setMessage('Chưa có dữ liệu để lưu.', 'error');
    return;
  }

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
          title: selectedData.title,
          html: selectedData.html,
          text: selectedData.text,
          createdAt: new Date().toISOString()
        })
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('API error:', res.status, text);
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

// Mở trang Settings
openOptions.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
