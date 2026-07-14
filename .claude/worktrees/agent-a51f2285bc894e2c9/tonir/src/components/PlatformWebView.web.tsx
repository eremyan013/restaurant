import React, { useRef, useEffect } from 'react';

type Props = {
  html: string;
  style?: any;
  webViewRef?: React.MutableRefObject<any>;
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  scrollEnabled?: boolean;
};

export function PlatformWebView({ html, webViewRef, onMessage }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Expose the raw iframe DOM element via the shared webViewRef so the
  // parent can call iframe.contentWindow.postMessage to inject commands.
  useEffect(() => {
    if (webViewRef) webViewRef.current = iframeRef.current;
  });

  // Forward messages from the iframe to the onMessage callback.
  useEffect(() => {
    if (!onMessage) return;
    const handler = (e: MessageEvent) => {
      if (typeof e.data === 'string') {
        onMessage({ nativeEvent: { data: e.data } });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onMessage]);

  return (
    // @ts-ignore – iframe is valid HTML in web context
    <iframe
      ref={iframeRef}
      srcDoc={html}
      style={{
        border: 'none',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
}
