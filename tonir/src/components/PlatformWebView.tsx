import React from 'react';
import { WebView } from 'react-native-webview';

type Props = {
  html: string;
  style?: any;
  webViewRef?: React.MutableRefObject<any>;
  onMessage?: (event: any) => void;
  scrollEnabled?: boolean;
};

export function PlatformWebView({ html, style, webViewRef, onMessage, scrollEnabled }: Props) {
  return (
    <WebView
      ref={webViewRef}
      source={{ html }}
      style={style}
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['*']}
      mixedContentMode="always"
      scrollEnabled={scrollEnabled}
    />
  );
}
