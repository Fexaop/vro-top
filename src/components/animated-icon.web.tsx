import { Image } from 'expo-image';
import { View } from 'react-native';
import Animated, { Keyframe, Easing } from 'react-native-reanimated';

import classes from './animated-icon.module.css';
const DURATION = 300;

export function AnimatedSplashOverlay() {
  return null;
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: 0 }],
  },
  60: {
    transform: [{ scale: 1.2 }],
    easing: Easing.elastic(1.2),
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(1.2),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    opacity: 0,
  },
  60: {
    transform: [{ scale: 1.2 }],
    opacity: 0,
    easing: Easing.elastic(1.2),
  },
  100: {
    transform: [{ scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(1.2),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '-180deg' }, { scale: 0.8 }],
    opacity: 0,
  },
  [DURATION / 1000]: {
    transform: [{ rotateZ: '0deg' }, { scale: 1 }],
    opacity: 1,
    easing: Easing.elastic(0.7),
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View className="justify-center items-center" style={{ width: 128, height: 128 }}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={{ width: 201, height: 201, position: 'absolute' }}>
        <Image style={{ width: 201, height: 201 }} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View style={{ width: 128, height: 128, position: 'absolute' }} entering={keyframe.duration(DURATION)}>
        <div className={classes.expoLogoBackground} />
      </Animated.View>

      <Animated.View style={{ justifyContent: 'center', alignItems: 'center' }} entering={logoKeyframe.duration(DURATION)}>
        <Image style={{ position: 'absolute', width: 76, height: 71 }} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}
