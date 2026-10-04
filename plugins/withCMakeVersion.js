/**
 * Expo config plugin: pins CMake to 3.22.1 (SDK-installed) in android/app/build.gradle.
 * Fixes: [CXX5304] "This version only understands SDK XML versions up to 3 but an SDK XML
 * file of version 4 was encountered" — caused by react-native-worklets + newer Android SDK tools.
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const withCMakeVersion = (config) => {
  return withAppBuildGradle(config, (gradleConfig) => {
    let contents = gradleConfig.modResults.contents;

    // Only inject if not already present
    if (contents.includes('cmake {') && contents.includes('version "3.22.1"')) {
      return gradleConfig;
    }

    // Insert after `compileSdk rootProject.ext.compileSdkVersion`
    const anchor = 'compileSdk rootProject.ext.compileSdkVersion';
    if (!contents.includes(anchor)) {
      console.warn('[withCMakeVersion] Could not find anchor line in build.gradle. Skipping.');
      return gradleConfig;
    }

    const injection = `\n    // Pin CMake to SDK-installed version to fix CXX5304 SDK XML version mismatch\n    externalNativeBuild {\n        cmake {\n            version "3.22.1"\n        }\n    }\n`;

    contents = contents.replace(anchor, `${anchor}${injection}`);
    gradleConfig.modResults.contents = contents;
    return gradleConfig;
  });
};

module.exports = withCMakeVersion;
