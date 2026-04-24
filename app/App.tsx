import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';
import type { WebViewErrorEvent, WebViewHttpErrorEvent } from 'react-native-webview/lib/WebViewTypes';

const WEB_HOST = 'schriftinzicht.nl';
const WEB_URL: string =
  (Constants.expoConfig?.extra as { webUrl?: string } | undefined)?.webUrl ??
  `https://${WEB_HOST}`;

const APP_UA_SUFFIX = `SchriftInzichtApp/${Constants.expoConfig?.version ?? '1.0.0'}`;

const ALLOWED_HOST_RE = /^https:\/\/(www\.)?schriftinzicht\.nl(\/|$|\?|#)/i;

function buildStartUrl(): string {
  try {
    const initial = Linking.parseInitialURLSync?.();
    if (initial?.hostname?.endsWith(WEB_HOST) && initial.path) {
      return `https://${WEB_HOST}${initial.path.startsWith('/') ? '' : '/'}${initial.path}`;
    }
  } catch {
    /* fall through */
  }
  return WEB_URL;
}

export default function App() {
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [startUrl, setStartUrl] = useState<string>(() => buildStartUrl());

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      try {
        const parsed = Linking.parse(url);
        if (parsed.hostname?.endsWith(WEB_HOST) && parsed.path) {
          const target = `https://${WEB_HOST}${parsed.path.startsWith('/') ? '' : '/'}${parsed.path}`;
          webRef.current?.injectJavaScript(
            `window.location.href = ${JSON.stringify(target)}; true;`,
          );
        }
      } catch {
        /* ignore */
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const onNavChange = (nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  };

  const onShouldStartLoadWithRequest = (req: { url: string }) => {
    const url = req.url;
    if (ALLOWED_HOST_RE.test(url) || url.startsWith('about:') || url === 'about:blank') {
      return true;
    }
    if (url.startsWith('mailto:') || url.startsWith('tel:')) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    return false;
  };

  const handleError = useCallback((_e: WebViewErrorEvent | WebViewHttpErrorEvent) => {
    setErrored(true);
    setLoading(false);
  }, []);

  const retry = () => {
    setErrored(false);
    setLoading(true);
    setStartUrl(buildStartUrl());
    webRef.current?.reload();
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <WebView
          ref={webRef}
          source={{ uri: startUrl }}
          applicationNameForUserAgent={APP_UA_SUFFIX}
          onNavigationStateChange={onNavChange}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onLoadStart={() => setErrored(false)}
          onLoadEnd={() => setLoading(false)}
          onError={handleError}
          onHttpError={handleError}
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          setSupportMultipleWindows={false}
          originWhitelist={['https://schriftinzicht.nl', 'https://www.schriftinzicht.nl']}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          cacheEnabled
          mediaPlaybackRequiresUserAction={false}
          style={styles.webview}
        />
        {loading && !errored && (
          <View style={styles.loader} pointerEvents="none">
            <ActivityIndicator size="large" color="#1a4d7a" />
          </View>
        )}
        {errored && (
          <View style={styles.errorScreen}>
            <Text style={styles.errorTitle}>Geen verbinding</Text>
            <Text style={styles.errorBody}>
              SchriftInzicht kan momenteel niet geladen worden. Controleer je internet­verbinding en probeer opnieuw.
            </Text>
            <Pressable style={styles.retryBtn} onPress={retry}>
              <Text style={styles.retryText}>Opnieuw proberen</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  webview: { flex: 1, backgroundColor: '#ffffff' },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0C0A09',
    marginBottom: 12,
  },
  errorBody: {
    fontSize: 15,
    color: '#4a4a4a',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: '#C4956A',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
