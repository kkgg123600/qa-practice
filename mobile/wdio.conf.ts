import path from 'node:path';

// WebdriverIO + Appium (UiAutomator2) on an Android emulator.
// App under test: Sauce Labs "My Demo App" (React Native), public test app, release v1.3.0:
// https://github.com/saucelabs/my-demo-app-rn/releases/tag/v1.3.0
const root = path.resolve(__dirname, '..');
const APK = process.env.APK_PATH ?? path.join(__dirname, 'apps', 'Android-MyDemoAppRN.1.3.0.build-244.apk');

// Drivers come from this project's own devDependencies, not a global ~/.appium.
process.env.APPIUM_HOME = root;

export const config: WebdriverIO.Config = {
  runner: 'local',
  specs: ['./specs/**/*.spec.ts'],
  maxInstances: 1,
  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': process.env.ANDROID_DEVICE ?? 'Android Emulator',
      'appium:app': APK,
      'appium:appPackage': 'com.saucelabs.mydemoapp.rn',
      'appium:appWaitActivity': '*',
      'appium:autoGrantPermissions': true,
      // Every session starts from a fresh install state: no cart or login left over from a previous spec.
      'appium:fullReset': false,
      'appium:noReset': false,
      'appium:newCommandTimeout': 120,
      'appium:uiautomator2ServerInstallTimeout': 120_000,
      'appium:adbExecTimeout': 60_000,
    },
  ],
  logLevel: 'warn',
  outputDir: path.join(root, 'mobile-results'),
  waitforTimeout: 15_000,
  connectionRetryTimeout: 180_000,
  connectionRetryCount: 1,
  services: [['appium', { args: { relaxedSecurity: false }, logPath: path.join(root, 'mobile-results') }]],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: { ui: 'bdd', timeout: 180_000 },
  afterTest: async (test, _ctx, { passed }) => {
    if (!passed) {
      const safe = test.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 60);
      await browser.saveScreenshot(path.join(root, 'mobile-results', `FAIL-${safe}.png`));
    }
  },
};
