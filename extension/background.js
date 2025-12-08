// background.js (service_worker)

chrome.runtime.onInstalled.addListener(() => {
  // đặt file mặc định cho side panel
  chrome.sidePanel
    .setOptions({ path: 'sidepanel.html' })
    .catch((err) => console.error('setOptions error:', err));

  // cho phép bấm icon extension là mở side panel
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.error('setPanelBehavior error:', err));
});
