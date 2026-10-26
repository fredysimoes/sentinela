const fs = require('fs');
const path = require('path');

const filesToPatch = [
  path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'build', 'TopicSubscriptionModule.android.js'),
  path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'src', 'TopicSubscriptionModule.android.ts'),
];

const patchContentJs = `import { requireOptionalNativeModule } from 'expo';

let TopicSubscriptionModule = null;
try {
  TopicSubscriptionModule = requireOptionalNativeModule('ExpoTopicSubscriptionModule');
} catch (e) {
  TopicSubscriptionModule = null;
}

export default TopicSubscriptionModule || {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: () => Promise.resolve(null),
  unsubscribeFromTopicAsync: () => Promise.resolve(null),
};
`;

for (const f of filesToPatch) {
  if (fs.existsSync(f)) {
    fs.writeFileSync(f, patchContentJs, 'utf8');
    console.log('[patch] Patched for Expo Go compatibility:', f);
  }
}
