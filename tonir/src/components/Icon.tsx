import React from 'react';
import Svg, { Circle, Path, Rect, Line } from 'react-native-svg';

export type IconName =
  | 'search' | 'sliders' | 'heart' | 'heartFill' | 'home' | 'calendar'
  | 'user' | 'chevR' | 'chevL' | 'chevD' | 'arrow' | 'arrowUR' | 'star'
  | 'pin' | 'clock' | 'users' | 'sparkle' | 'gift' | 'map' | 'plus' | 'minus'
  | 'check' | 'x' | 'flame' | 'spark' | 'chat' | 'dot3' | 'share'
  | 'split' | 'tonir' | 'lock' | 'mail';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.75 }: IconProps) {
  const s = strokeWidth;
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: s,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'search':
      return <Svg {...props}><Circle cx="11" cy="11" r="7" /><Path d="m20 20-3.5-3.5" /></Svg>;
    case 'sliders':
      return <Svg {...props}><Path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0" /><Circle cx="16" cy="6" r="2" /><Circle cx="8" cy="12" r="2" /><Circle cx="18" cy="18" r="2" /></Svg>;
    case 'heart':
      return <Svg {...props}><Path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z" /></Svg>;
    case 'heartFill':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z" /></Svg>;
    case 'home':
      return <Svg {...props}><Path d="M4 11 12 4l8 7" /><Path d="M6 10v10h12V10" /></Svg>;
    case 'calendar':
      return <Svg {...props}><Rect x="3.5" y="5" width="17" height="15" rx="2" /><Path d="M8 3v4M16 3v4M3.5 10h17" /></Svg>;
    case 'user':
      return <Svg {...props}><Circle cx="12" cy="8" r="4" /><Path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" /></Svg>;
    case 'chevR':
      return <Svg {...props}><Path d="m9 6 6 6-6 6" /></Svg>;
    case 'chevL':
      return <Svg {...props}><Path d="m15 6-6 6 6 6" /></Svg>;
    case 'chevD':
      return <Svg {...props}><Path d="m6 9 6 6 6-6" /></Svg>;
    case 'arrow':
      return <Svg {...props}><Path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
    case 'arrowUR':
      return <Svg {...props}><Path d="M7 17 17 7M9 7h8v8" /></Svg>;
    case 'star':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Path d="M12 2.5l2.95 6.45 7.05.65-5.3 4.8 1.55 6.95L12 17.85 5.75 21.35 7.3 14.4 2 9.6l7.05-.65z" /></Svg>;
    case 'pin':
      return <Svg {...props}><Path d="M12 22s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12z" /><Circle cx="12" cy="10" r="2.5" /></Svg>;
    case 'clock':
      return <Svg {...props}><Circle cx="12" cy="12" r="9" /><Path d="M12 7v5l3 2" /></Svg>;
    case 'users':
      return <Svg {...props}><Circle cx="9" cy="8" r="3.5" /><Path d="M3 20c.8-3 3.3-4.5 6-4.5s5.2 1.5 6 4.5" /><Circle cx="17" cy="9" r="2.8" /><Path d="M16 14.5c2.4.3 4.4 1.7 5 4.5" /></Svg>;
    case 'sparkle':
      return <Svg {...props}><Path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></Svg>;
    case 'gift':
      return <Svg {...props}><Rect x="3.5" y="9" width="17" height="11" rx="2" /><Path d="M3.5 14h17M12 9v11M12 9c-2 0-4-1-4-3s2-2 3 0 1 3 1 3M12 9c2 0 4-1 4-3s-2-2-3 0-1 3-1 3" /></Svg>;
    case 'map':
      return <Svg {...props}><Path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" /><Path d="M9 4v13.5M15 6.5V20" /></Svg>;
    case 'plus':
      return <Svg {...props}><Path d="M12 5v14M5 12h14" /></Svg>;
    case 'minus':
      return <Svg {...props}><Path d="M5 12h14" /></Svg>;
    case 'check':
      return <Svg {...props}><Path d="m5 12 5 5L20 7" /></Svg>;
    case 'x':
      return <Svg {...props}><Path d="m6 6 12 12M18 6 6 18" /></Svg>;
    case 'flame':
      return <Svg {...props}><Path d="M12 22c4-1 6-4 6-8 0-3-2-5-3-6 0 2-1 3-2 3 0-3-2-5-5-7-1 4-4 6-4 10 0 4 3 7 8 8z" /></Svg>;
    case 'spark':
      return <Svg {...props}><Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></Svg>;
    case 'chat':
      return <Svg {...props}><Path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5V15a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V17.5H6.5A2.5 2.5 0 0 1 4 15z" /></Svg>;
    case 'dot3':
      return <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}><Circle cx="5" cy="12" r="1.7" /><Circle cx="12" cy="12" r="1.7" /><Circle cx="19" cy="12" r="1.7" /></Svg>;
    case 'share':
      return <Svg {...props}><Path d="M12 4v12M7 9l5-5 5 5" /><Path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></Svg>;
    case 'split':
      return <Svg {...props}><Path d="M4 6h6l4 6 4-6h2M4 18h6l4-6M14 18h6" /></Svg>;
    case 'tonir':
      return <Svg {...props}><Path d="M6 10c0-3.5 2.7-6 6-6s6 2.5 6 6" /><Path d="M5 10h14l-1.5 8a2 2 0 0 1-2 1.7h-9A2 2 0 0 1 6.5 18z" /><Path d="M10 14c1 1 3 1 4 0" /></Svg>;
    case 'lock':
      return <Svg {...props}><Rect x="5" y="11" width="14" height="10" rx="2" /><Path d="M8 11V7a4 4 0 0 1 8 0v4" /></Svg>;
    case 'mail':
      return <Svg {...props}><Rect x="3" y="5" width="18" height="14" rx="2" /><Path d="m3 7 9 6 9-6" /></Svg>;
    default:
      return null;
  }
}
