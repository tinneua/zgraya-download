const ANDROID_USER_AGENT = /android/i;
const APPLE_MOBILE_USER_AGENT = /iphone|ipad|ipod/i;

export function detectStore({
  userAgent = "",
  platform = "",
  maxTouchPoints = 0,
} = {}) {
  if (ANDROID_USER_AGENT.test(userAgent)) {
    return "google";
  }

  if (APPLE_MOBILE_USER_AGENT.test(userAgent)) {
    return "apple";
  }

  const isIPadDesktopMode =
    /^Mac/i.test(platform) && Number(maxTouchPoints) > 1;

  return isIPadDesktopMode ? "apple" : null;
}
