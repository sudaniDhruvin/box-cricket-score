import { RFValue } from 'react-native-responsive-fontsize';
import {
  widthPercentageToDP,
  heightPercentageToDP,
} from 'react-native-responsive-screen';
import { Dimensions, Platform } from 'react-native';

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get('window');

export const isIOS = Platform.OS === 'ios';

export const wp = (val: number) => widthPercentageToDP(val);
export const hp = (val: number) => heightPercentageToDP(val);
export const fontSize = (val: number) => RFValue(val, 812);
