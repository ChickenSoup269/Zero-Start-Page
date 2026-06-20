// redirect.js
const mainPageUrl = chrome.runtime.getURL("index.html")
document.getElementById("startpage-frame").src = mainPageUrl
