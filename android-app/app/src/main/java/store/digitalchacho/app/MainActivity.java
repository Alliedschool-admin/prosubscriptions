package store.digitalchacho.app;

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.ConsoleMessage;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

/**
 * Digital Chacho shell — offline-first.
 *
 * Boot order:
 *   1. Local boot screen from assets renders instantly (no network needed).
 *   2. Store loads from the WebView's on-device cache when available, network when online.
 *   3. When connectivity returns, the shell silently syncs (reloads) the store.
 *
 * Google / social sign-in works because popups (window.open) are supported and the
 * user agent is a plain Chrome UA — Google rejects "wv" WebView agents.
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "DigitalChacho";
    private static final int LOAD_TIMEOUT_MS = 18000;

    private WebView webView;
    private WebView popupView;
    private Dialog popupDialog;
    private SwipeRefreshLayout refreshLayout;
    private FrameLayout root;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private boolean storeLoaded = false;
    private boolean usedFallback = false;
    private boolean bootScreenVisible = true;
    private boolean wasOffline = false;
    private ValueCallback<Uri[]> filePathCallback;
    private ActivityResultLauncher<Intent> fileChooser;
    private Runnable timeoutTask;

    private String primaryUrl() { return getString(R.string.site_url); }
    private String fallbackUrl() { return getString(R.string.site_url_fallback); }
    private static final String BOOT_URL = "file:///android_asset/boot.html";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

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
            // 1. Instant local screen — never a black screen, even with no network.
            webView.loadUrl(BOOT_URL);
            // 2. Hand over to the store (cache first, then network).
            handler.postDelayed(this::loadStore, 220);
        }
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }

    /** Google blocks embedded WebViews ("; wv"). Present a plain Chrome UA instead. */
    private String chromeUserAgent(String original) {
        String ua = original == null ? "" : original;
        ua = ua.replace("; wv)", ")").replace("; wv", "");
        return ua + " DigitalChacho/1.2";
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
            wasOffline = false;
            cancelTimeout();
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
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return super.shouldInterceptRequest(view, request);
        }

        @Override
        public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
            // Never leave a dead (black) WebView behind — rebuild the session.
            Log.e(TAG, "render process gone, restarting");
            recreate();
            return true;
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

    /** Fall back to the mirror, then to the on-device cache, then to the offline screen. */
    private void recoverFromFailure() {
        if (!usedFallback) {
            usedFallback = true;
            webView.loadUrl(fallbackUrl());
            return;
        }
        if (webView.getSettings().getCacheMode() != WebSettings.LOAD_CACHE_ONLY && storeLoaded) {
            webView.getSettings().setCacheMode(WebSettings.LOAD_CACHE_ONLY);
            webView.loadUrl(primaryUrl());
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

    /** Called from boot.html's Try again button. */
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
                // Sign-in finished (or was cancelled) — pick up the new session.
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
        // Connection came back while the app was open → sync quietly.
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
        super.onDestroy();
    }
}
