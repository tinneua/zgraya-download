import { detectStore } from "./device-routing.mjs";
import { STORE_LINKS } from "./store-links.mjs";

const storeAnchors = document.querySelectorAll("[data-store-link]");

for (const anchor of storeAnchors) {
  const store = anchor.dataset.storeLink;
  const destination = STORE_LINKS[store];

  if (destination) {
    anchor.href = destination;
    anchor.removeAttribute("aria-disabled");
  }
}

const detectedStore = detectStore({
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  maxTouchPoints: navigator.maxTouchPoints,
});

if (detectedStore) {
  const status = document.querySelector("#redirect-status");

  if (status) {
    status.textContent =
      detectedStore === "apple"
        ? "Відкриваємо App Store. Opening App Store."
        : "Відкриваємо Google Play. Opening Google Play.";
  }

  window.location.replace(STORE_LINKS[detectedStore]);
}
