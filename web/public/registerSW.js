// Register cleanup SW to unregister old service worker and clear caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/schriftinzicht/sw.js');
}
