package store.digitalchacho.app;

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.net.NetworkRequest;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.util.Log;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.util.Map;

/**
 * Digital Chacho shell — offline-first native app.
 *
 * Boot order:
 *   1. Bundled boot screen renders instantly (no network needed).
 *   2. The store loads from the on-device snapshot — full store, zero internet.
 *   3. When online, every request is refetched and the snapshot is refreshed silently.
 *
 * Sign-in / admin / checkout need the server: the web app asks DCApp.isOnline()
 * and shows a "connect to continue" state instead of a dead form.
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "DigitalChacho";
    private static final int LOAD_TIMEOUT_MS = 18000;
    private static final String BOOT_URL = "file:///android_asset/boot.html";

    private WebView webView;
    private WebView popupView;
    private Dialog popupDialog;
    private SwipeRefreshLayout refreshLayout;
    private FrameLayout root;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private OfflineCache cache;

    private boolean storeLoaded = false;
    private boolean usedFallback = false;
    private boolean bootScreenVisible = true;
    private boolean wasOffline = false;
    private ValueCallback<Uri[]> filePathCallback;
    private ActivityResultLauncher<Intent> fileChooser;
    private Runnable timeoutTask;
    private ConnectivityManager.NetworkCallback netCallback;

    private String primaryUrl() { return getString(R.string.site_url); }
    private String fallbackUrl() { return getString(R.string.site_url_fallback); }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        cache = new OfflineCache(this);

        fileChooser = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (filePathCallback == null) return;
                    Uri[] uris = null;
                    Intent data = result.getData();
                    if (result.getResultCode() == RESULT_OK && data != null) {
                        if (data.getClipData() != null) {
                            int n = data.getClipData().getItemCount();
                            uris = new Uri[n];
                            for (int i = 0; i < n; i++) uris[i] = data.getClipData().getItemAt(i).getUri();
                        } else if (data.getData() != null) {
                            uris = new Uri[]{data.getData()};
                        }
                    }
                    filePathCallback.onReceiveValue(uris);
                    filePathCallback = null;
                });

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#0B0B0F"));

        refreshLayout = new SwipeRefreshLayout(this);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#0B0B0F"));
        refreshLayout.addView(webView, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        root.addView(refreshLayout, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);

        applySettings(webView);
        webView.addJavascriptInterface(new BootBridge(), "DCApp");

        webView.setWebChromeClient(new StoreChromeClient());
        webView.setWebViewClient(new StoreWebViewClient());

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                        String mimeType, long contentLength) {
                openExternally(Uri.parse(url));
            }
        });

        refreshLayout.setOnRefreshListener(this::syncNow);

        if (savedInstanceState != null) {
            bootScreenVisible = false;
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(BOOT_URL);
            handler.postDelayed(this::loadStore, 200);
        }

        registerNetworkCallback();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void applySettings(WebView view) {
        WebSettings s = view.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setSupportMultipleWindows(true);          // required for Google sign-in popups
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setCacheMode(isOnline() ? WebSettings.LOAD_DEFAULT : WebSettings.LOAD_CACHE_ELSE_NETWORK);
        s.setUserAgentString(chromeUserAgent(s.getUserAgentString()));

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(view, true);
        WebView.setWebContentsDebuggingEnabled(true);
    }

    /** Google blocks embedded WebViews ("; wv"). Present a plain Chrome UA instead. */
    private String chromeUserAgent(String original) {
        String ua = original == null ? "" : original;
        ua = ua.replace("; wv)", ")").replace("; wv", "");
        return ua + " DigitalChacho/1.3";
    }

    private void loadStore() {
        armTimeout();
        webView.loadUrl(primaryUrl());
    }

    /** Sync the store when the user pulls to refresh or connectivity returns. */
    private void syncNow() {
        webView.getSettings().setCacheMode(
                isOnline() ? WebSettings.LOAD_DEFAULT : WebSettings.LOAD_CACHE_ELSE_NETWORK);
        if (storeLoaded) {
            webView.reload();
        } else {
            usedFallback = false;
            loadStore();
        }
    }

    private boolean isOnline() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                NetworkCapabilities caps = cm.getNetworkCapabilities(cm.getActiveNetwork());
                return caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
            }
            NetworkInfo info = cm.getActiveNetworkInfo();
            return info != null && info.isConnected();
        } catch (Exception e) {
            return true;
        }
    }

    private void registerNetworkCallback() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return;
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return;
            netCallback = new ConnectivityManager.NetworkCallback() {
                @Override
                public void onAvailable(Network network) {
                    handler.post(() -> {
                        notifyConnectivity(true);
                        if (wasOffline || !storeLoaded) syncNow();
                    });
                }

                @Override
                public void onLost(Network network) {
                    handler.post(() -> notifyConnectivity(false));
                }
            };
            cm.registerNetworkCallback(new NetworkRequest.Builder()
                    .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build(), netCallback);
        } catch (Exception e) {
            netCallback = null;
        }
    }

    private void notifyConnectivity(boolean online) {
        if (webView == null) return;
        webView.evaluateJavascript(
                "window.dispatchEvent(new Event('" + (online ? "online" : "offline") + "'));"
                + "window.__dcOnline=" + online + ";", null);
    }

    private boolean isStoreHost(String host) {
        return host.endsWith("digitalchacho.store") || host.endsWith("lovable.app");
    }

    /** Cacheable = the store shell, its assets, and read-only backend GETs. */
    private boolean isCacheable(WebResourceRequest request) {
        if (request == null) return false;
        if (!"GET".equalsIgnoreCase(request.getMethod())) return false;
        Uri url = request.getUrl();
        String scheme = url.getScheme() == null ? "" : url.getScheme();
        if (!scheme.startsWith("http")) return false;
        String host = url.getHost() == null ? "" : url.getHost();
        return isStoreHost(host) || host.endsWith("supabase.co");
    }

    private class StoreWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri url = request.getUrl();
            if (isInternal(url)) return false;
            openExternally(url);
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            if (!BOOT_URL.equals(url)) armTimeout();
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            refreshLayout.setRefreshing(false);
            if (BOOT_URL.equals(url)) {
                bootScreenVisible = true;
                return;
            }
            bootScreenVisible = false;
            storeLoaded = true;
            cancelTimeout();
            notifyConnectivity(isOnline());
            wasOffline = !isOnline();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request == null || !request.isForMainFrame()) return;
            Log.w(TAG, "main frame error: " + (error != null ? error.getDescription() : "unknown"));
            cancelTimeout();
            recoverFromFailure();
        }

        @Override
        public void onReceivedSslError(WebView view, SslErrorHandler handler, android.net.http.SslError error) {
            Log.w(TAG, "ssl error: " + error);
            handler.cancel();
            recoverFromFailure();
        }

        @Override
        public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
            Log.e(TAG, "render process gone, restarting");
            recreate();
            return true;
        }

        /**
         * Offline-first request pipeline:
         *   offline → serve the stored copy immediately
         *   online  → fetch, refresh the stored copy, fall back to it if the network fails
         */
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            if (!isCacheable(request)) return null;
            String url = request.getUrl().toString();
            Map<String, String> headers = request.getRequestHeaders();

            if (!isOnline()) {
                OfflineCache.Entry stored = cache.read(url);
                if (stored != null) {
                    return new WebResourceResponse(stored.mime, stored.encoding,
                            OfflineCache.stream(stored.body));
                }
                return null;
            }

            OfflineCache.Entry fresh = cache.fetchAndStore(url, headers);
            if (fresh != null) {
                return new WebResourceResponse(fresh.mime, fresh.encoding,
                        OfflineCache.stream(fresh.body));
            }
            OfflineCache.Entry stored = cache.read(url);
            if (stored != null) {
                return new WebResourceResponse(stored.mime, stored.encoding,
                        OfflineCache.stream(stored.body));
            }
            return null;
        }
    }

    private boolean isInternal(Uri url) {
        String scheme = url.getScheme() == null ? "" : url.getScheme();
        String host = url.getHost() == null ? "" : url.getHost();
        if ("file".equals(scheme)) return true;
        return scheme.startsWith("http") && (
                host.endsWith("digitalchacho.store")
                || host.endsWith("lovable.app")
                || host.endsWith("lovable.dev")
                || host.endsWith("lovable.cloud")
                || host.endsWith("supabase.co")
                || host.endsWith("accounts.google.com")
                || host.endsWith("google.com")
                || host.endsWith("googleusercontent.com")
                || host.endsWith("gstatic.com")
                || host.endsWith("appleid.apple.com")
                || host.endsWith("live.com")
                || host.endsWith("microsoftonline.com"));
    }

    /** Fall back to the mirror, then to the on-device snapshot, then to the offline screen. */
    private void recoverFromFailure() {
        if (cache.has(primaryUrl())) {
            // The snapshot can render the whole store without any network.
            webView.getSettings().setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
            webView.loadUrl(primaryUrl());
            wasOffline = true;
            return;
        }
        if (!usedFallback) {
            usedFallback = true;
            webView.loadUrl(fallbackUrl());
            return;
        }
        showOfflineScreen();
    }

    private void showOfflineScreen() {
        wasOffline = true;
        refreshLayout.setRefreshing(false);
        webView.loadUrl(BOOT_URL);
        handler.postDelayed(
                () -> webView.evaluateJavascript("window.dcShowOffline && window.dcShowOffline();", null),
                350);
    }

    /** Bridge used by boot.html and by the web app to know if the server is reachable. */
    private class BootBridge {
        @JavascriptInterface
        public void retry() {
            handler.post(() -> {
                usedFallback = false;
                webView.getSettings().setCacheMode(
                        isOnline() ? WebSettings.LOAD_DEFAULT : WebSettings.LOAD_CACHE_ELSE_NETWORK);
                loadStore();
            });
        }

        @JavascriptInterface
        public boolean isOnline() {
            return MainActivity.this.isOnline();
        }

        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public void sync() {
            handler.post(MainActivity.this::syncNow);
        }
    }

    /** Handles OAuth popups (Google, Apple, Microsoft) opened with window.open. */
    private class StoreChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                         FileChooserParams params) {
            if (filePathCallback != null) filePathCallback.onReceiveValue(null);
            filePathCallback = callback;
            try {
                fileChooser.launch(params.createIntent());
                return true;
            } catch (Exception e) {
                filePathCallback = null;
                return false;
            }
        }

        @SuppressLint("SetJavaScriptEnabled")
        @Override
        public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture,
                                     Message resultMsg) {
            closePopup();
            popupView = new WebView(MainActivity.this);
            applySettings(popupView);
            popupView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                    if (isInternal(request.getUrl())) return false;
                    openExternally(request.getUrl());
                    return true;
                }
            });
            popupView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onCloseWindow(WebView window) {
                    closePopup();
                }
            });

            popupDialog = new Dialog(MainActivity.this);
            popupDialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
            popupDialog.setContentView(popupView);
            Window w = popupDialog.getWindow();
            if (w != null) {
                w.setBackgroundDrawable(new ColorDrawable(Color.parseColor("#0B0B0F")));
                w.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
            }
            popupDialog.setOnDismissListener(d -> {
                popupDialog = null;
                popupView = null;
                if (storeLoaded) webView.reload();
            });
            popupDialog.show();

            WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
            transport.setWebView(popupView);
            resultMsg.sendToTarget();
            return true;
        }

        @Override
        public void onCloseWindow(WebView window) {
            closePopup();
        }

        @Override
        public boolean onConsoleMessage(ConsoleMessage msg) {
            if (msg.messageLevel() == ConsoleMessage.MessageLevel.ERROR) {
                Log.w(TAG, "web error: " + msg.message() + " @" + msg.sourceId() + ":" + msg.lineNumber());
            }
            return true;
        }
    }

    private void closePopup() {
        if (popupDialog != null) {
            try { popupDialog.dismiss(); } catch (Exception ignored) { }
        }
        popupDialog = null;
        popupView = null;
    }

    private void openExternally(Uri url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, url);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(this, "No app found to open this link", Toast.LENGTH_SHORT).show();
        }
    }

    private void armTimeout() {
        cancelTimeout();
        timeoutTask = () -> {
            if (storeLoaded && !bootScreenVisible) return;
            recoverFromFailure();
        };
        handler.postDelayed(timeoutTask, LOAD_TIMEOUT_MS);
    }

    private void cancelTimeout() {
        if (timeoutTask != null) handler.removeCallbacks(timeoutTask);
        timeoutTask = null;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (isOnline() && (wasOffline || !storeLoaded)) syncNow();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (popupDialog != null) { closePopup(); return; }
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        cancelTimeout();
        closePopup();
        if (netCallback != null) {
            try {
                ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                if (cm != null) cm.unregisterNetworkCallback(netCallback);
            } catch (Exception ignored) { }
        }
        super.onDestroy();
    }
}
