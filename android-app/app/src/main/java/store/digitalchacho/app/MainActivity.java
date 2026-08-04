package store.digitalchacho.app;

import android.annotation.SuppressLint;
import android.app.DownloadManager;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

public class MainActivity extends AppCompatActivity {

    private static final int LOAD_TIMEOUT_MS = 25000;

    private WebView webView;
    private SwipeRefreshLayout refreshLayout;
    private FrameLayout root;
    private View splash;
    private LinearLayout errorView;
    private final Handler handler = new Handler(Looper.getMainLooper());

    private boolean firstPaintDone = false;
    private boolean usedFallback = false;
    private ValueCallback<Uri[]> filePathCallback;
    private ActivityResultLauncher<Intent> fileChooser;
    private Runnable timeoutTask;

    private String primaryUrl() { return getString(R.string.site_url); }
    private String fallbackUrl() { return getString(R.string.site_url_fallback); }

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

        splash = buildSplash();
        root.addView(splash, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        errorView = buildErrorView();
        errorView.setVisibility(View.GONE);
        root.addView(errorView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportMultipleWindows(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setUserAgentString(settings.getUserAgentString() + " DigitalChachoApp/1.1");

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        webView.setWebChromeClient(new WebChromeClient() {
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

            @Override
            public void onProgressChanged(WebView view, int progress) {
                if (progress >= 60) hideSplash();
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                String scheme = url.getScheme() == null ? "" : url.getScheme();
                String host = url.getHost() == null ? "" : url.getHost();
                boolean internal = scheme.startsWith("http")
                        && (host.endsWith("digitalchacho.store")
                            || host.endsWith("lovable.app")
                            || host.endsWith("supabase.co")
                            || host.endsWith("accounts.google.com"));
                if (internal) return false;
                openExternally(url);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                errorView.setVisibility(View.GONE);
                armTimeout();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                refreshLayout.setRefreshing(false);
                firstPaintDone = true;
                cancelTimeout();
                hideSplash();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request == null || !request.isForMainFrame()) return;
                cancelTimeout();
                if (!usedFallback) {
                    usedFallback = true;
                    webView.loadUrl(fallbackUrl());
                } else {
                    showError();
                }
            }
        });

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                        String mimeType, long contentLength) {
                openExternally(Uri.parse(url));
            }
        });

        refreshLayout.setOnRefreshListener(() -> {
            errorView.setVisibility(View.GONE);
            webView.reload();
        });

        if (savedInstanceState == null) {
            webView.loadUrl(primaryUrl());
        } else {
            webView.restoreState(savedInstanceState);
        }
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
            if (firstPaintDone) return;
            if (!usedFallback) {
                usedFallback = true;
                webView.loadUrl(fallbackUrl());
            } else {
                showError();
            }
        };
        handler.postDelayed(timeoutTask, LOAD_TIMEOUT_MS);
    }

    private void cancelTimeout() {
        if (timeoutTask != null) handler.removeCallbacks(timeoutTask);
        timeoutTask = null;
    }

    private void hideSplash() {
        if (splash.getVisibility() == View.GONE) return;
        splash.animate().alpha(0f).setDuration(280).withEndAction(() -> splash.setVisibility(View.GONE)).start();
    }

    private void showError() {
        refreshLayout.setRefreshing(false);
        splash.setVisibility(View.GONE);
        errorView.setVisibility(View.VISIBLE);
    }

    private View buildSplash() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setBackgroundColor(Color.parseColor("#0B0B0F"));

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(96), dp(96));
        box.addView(logo, lp);

        TextView title = new TextView(this);
        title.setText(R.string.app_name);
        title.setTextColor(Color.WHITE);
        title.setTextSize(20f);
        LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        tp.topMargin = dp(16);
        box.addView(title, tp);

        ProgressBar bar = new ProgressBar(this);
        LinearLayout.LayoutParams pp = new LinearLayout.LayoutParams(dp(36), dp(36));
        pp.topMargin = dp(24);
        box.addView(bar, pp);
        return box;
    }

    private LinearLayout buildErrorView() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setBackgroundColor(Color.parseColor("#0B0B0F"));
        box.setPadding(dp(32), dp(32), dp(32), dp(32));

        TextView msg = new TextView(this);
        msg.setText(R.string.offline_message);
        msg.setTextColor(Color.parseColor("#E5E7EB"));
        msg.setTextSize(16f);
        msg.setGravity(Gravity.CENTER);
        box.addView(msg);

        Button retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setOnClickListener(v -> {
            errorView.setVisibility(View.GONE);
            splash.setAlpha(1f);
            splash.setVisibility(View.VISIBLE);
            firstPaintDone = false;
            usedFallback = false;
            webView.loadUrl(primaryUrl());
        });
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        bp.topMargin = dp(20);
        box.addView(retry, bp);
        return box;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        cancelTimeout();
        super.onDestroy();
    }
}
