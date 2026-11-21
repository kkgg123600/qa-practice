// Helpers for the Sauce Labs My Demo App (React Native). Locators are the app's
// accessibility ids (content-desc), read from a uiautomator dump of the real app.
export const APP_ID = 'com.saucelabs.mydemoapp.rn';

export const el = (accessibilityId: string) => $(`~${accessibilityId}`);

// Text of a TextView placed inside a labelled container (the app puts error and price
// text in a child of the element that carries the accessibility id).
export async function childText(accessibilityId: string): Promise<string> {
  const child = el(accessibilityId).$('android.widget.TextView');
  return (await child.isExisting()) ? child.getText() : '';
}

const FOREGROUND = 4; // queryAppState: 4 = running in foreground

// Wipes app data and starts it again, so each test begins with an empty cart and no login.
//
// Race seen in logcat (2026-11-21): `pm clear` finishes asynchronously, and its final
// "Killing ... remove task" can land ~5 ms AFTER activateApp's START, killing the launch that
// just began. The app then stays down for ~20 s and the next element lookup times out.
// So the launch is confirmed by state, not assumed: if the app has not reached the foreground,
// it is activated again (max 3 attempts). Retries are logged, never silent. This is setup only;
// no test assertion is retried.
export async function freshStart() {
  await driver.terminateApp(APP_ID);
  await driver.execute('mobile: clearApp', { appId: APP_ID });
  for (let attempt = 1; attempt <= 3; attempt++) {
    await driver.activateApp(APP_ID);
    const up = await driver
      .waitUntil(async () => (await driver.queryAppState(APP_ID)) === FOREGROUND, { timeout: 8_000, interval: 500 })
      .then(() => true, () => false);
    if (up) {
      await el('products screen').waitForDisplayed({ timeout: 20_000 });
      return;
    }
    console.warn(`[freshStart] app not in foreground after launch attempt ${attempt}; activating again`);
  }
  throw new Error('freshStart: app did not reach the foreground after 3 launch attempts');
}

export const money = (s: string) => Math.round(Number(s.replace(/[^0-9.]/g, '')) * 100); // cents
