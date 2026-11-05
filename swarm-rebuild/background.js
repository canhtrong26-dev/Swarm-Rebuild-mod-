// Bấm icon trên thanh công cụ (hoặc Alt+Shift+S) sẽ inject đàn con trỏ vào tab đang mở.
// Inject lần nữa khi nó đang chạy sẽ tắt nó.

// Trong một khung hình chụp, chỉ hiện những điểm ảnh DOM không trả lại được
// (canvas WebGL, video đang phát, iframe khác nguồn) để đàn con trỏ cắt ra cho gọn.
const MEDIA_ONLY_CSS = `
html body *:not(canvas):not(video):not(iframe):not(embed):not(object) { visibility: hidden !important; }
html body canvas, html body video, html body iframe, html body embed, html body object { visibility: visible !important; }
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rebuild(tab) {
  if (!tab || tab.id == null) return;
  const target = { tabId: tab.id };
  let hidden = false;
  try {
    const [probe] = await chrome.scripting.executeScript({
      target,
      func: () => {
        const running = !!(window.__swarmRebuild && window.__swarmRebuild.app);
        let media = false;
        if (!running) {
          for (const el of document.querySelectorAll("canvas, video, iframe, embed, object")) {
            const r = el.getBoundingClientRect();
            if (r.width > 8 && r.height > 8 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth) {
              media = true;
              break;
            }
          }
        }
        return { running, media };
      },
    });
    const { running, media } = probe.result || {};
    if (!running && media) {
      try {
        await chrome.scripting.insertCSS({ target, css: MEDIA_ONLY_CSS });
        hidden = true;
        await sleep(90);
        const shot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
        await chrome.scripting.executeScript({
          target,
          func: (s) => {
            window.__swarmShot = s;
            window.__swarmHidden = true;
          },
          args: [shot],
        });
      } catch (_) {
        // không chụp được: các vùng đó dùng ô giữ chỗ
        if (hidden) {
          await chrome.scripting.removeCSS({ target, css: MEDIA_ONLY_CSS }).catch(() => {});
          hidden = false;
        }
      }
    }
    await chrome.scripting.executeScript({ target, files: ["swarm.js"] });
  } catch (err) {
    if (hidden) await chrome.scripting.removeCSS({ target, css: MEDIA_ONLY_CSS }).catch(() => {});
    // chrome://, Web Store, PDF và các trang được bảo vệ khác không chạy script được.
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#F24822" });
    await chrome.action.setBadgeText({ tabId: tab.id, text: "×" });
    await chrome.action.setTitle({ tabId: tab.id, title: "Swarm Rebuild can't run on this page" });
    setTimeout(() => {
      chrome.action.setBadgeText({ tabId: tab.id, text: "" });
      chrome.action.setTitle({ tabId: tab.id, title: "Swarm Rebuild (Alt+Shift+S)" });
    }, 2500);
  }
}

chrome.action.onClicked.addListener(rebuild);

// Đàn con trỏ yêu cầu khôi phục trang khi canvas của nó đã phủ kín.
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg && msg.type === "swarm:unhide" && sender.tab) {
    chrome.scripting
      .removeCSS({ target: { tabId: sender.tab.id }, css: MEDIA_ONLY_CSS })
      .catch(() => {})
      .then(() => reply(true));
    return true;
  }
});
