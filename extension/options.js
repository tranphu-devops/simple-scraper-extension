// Load config khi mở options
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['apiUrl', 'apiKey'], (data) => {
    if (data.apiUrl) document.getElementById('apiUrl').value = data.apiUrl;
    if (data.apiKey) document.getElementById('apiKey').value = data.apiKey;
  });
});

// Lưu config
document.getElementById('saveBtn').addEventListener('click', () => {
  const apiUrl = document.getElementById('apiUrl').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();

  chrome.storage.sync.set({ apiUrl, apiKey }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Đã lưu ✅';
    setTimeout(() => status.textContent = '', 2000);
  });
});
