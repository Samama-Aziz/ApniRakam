import { Platform, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;
export const MAX_CONTENT_WIDTH = 640;
