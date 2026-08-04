package store.digitalchacho.app;

import android.content.Context;
import android.util.Log;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

/**
 * Disk cache for the store shell + its data, so the app renders with no network.
 *
 * Every same-origin GET that flows through the WebView is fetched by us, stored on
 * device, and replayed from disk when the network is unavailable (or slow to answer).
 */
class OfflineCache {

    private static final String TAG = "DCOffline";
    private final File dir;

    OfflineCache(Context context) {
        dir = new File(context.getFilesDir(), "snapshot");
        if (!dir.exists()) dir.mkdirs();
    }

    static class Entry {
        byte[] body;
        String mime;
        String encoding;
    }

    private String key(String url) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] d = md.digest(url.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder();
            for (byte b : d) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return String.valueOf(url.hashCode());
        }
    }

    boolean has(String url) {
        return new File(dir, key(url)).exists();
    }

    Entry read(String url) {
        File f = new File(dir, key(url));
        File meta = new File(dir, key(url) + ".meta");
        if (!f.exists()) return null;
        try {
            Entry e = new Entry();
            e.body = readAll(new FileInputStream(f));
            e.mime = "text/html";
            e.encoding = "utf-8";
            if (meta.exists()) {
                String[] parts = new String(readAll(new FileInputStream(meta)), "UTF-8").split("\n");
                if (parts.length > 0 && parts[0].length() > 0) e.mime = parts[0];
                if (parts.length > 1 && parts[1].length() > 0) e.encoding = parts[1];
            }
            return e;
        } catch (Exception ex) {
            return null;
        }
    }

    void write(String url, byte[] body, String mime, String encoding) {
        try {
            FileOutputStream out = new FileOutputStream(new File(dir, key(url)));
            out.write(body);
            out.close();
            FileOutputStream m = new FileOutputStream(new File(dir, key(url) + ".meta"));
            m.write(((mime == null ? "" : mime) + "\n" + (encoding == null ? "utf-8" : encoding)).getBytes("UTF-8"));
            m.close();
        } catch (Exception e) {
            Log.w(TAG, "cache write failed for " + url);
        }
    }

    /** Fetch from network and store a copy. Returns null when the network fails. */
    Entry fetchAndStore(String url, Map<String, String> headers) {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setConnectTimeout(9000);
            conn.setReadTimeout(12000);
            conn.setInstanceFollowRedirects(true);
            if (headers != null) {
                for (Map.Entry<String, String> h : headers.entrySet()) {
                    if ("Accept-Encoding".equalsIgnoreCase(h.getKey())) continue;
                    try { conn.setRequestProperty(h.getKey(), h.getValue()); } catch (Exception ignored) { }
                }
            }
            conn.setRequestProperty("Accept-Encoding", "identity");
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) return null;
            byte[] body = readAll(conn.getInputStream());
            String contentType = conn.getContentType();
            String mime = contentType == null ? "application/octet-stream" : contentType.split(";")[0].trim();
            String enc = "utf-8";
            Entry e = new Entry();
            e.body = body;
            e.mime = mime;
            e.encoding = enc;
            write(url, body, mime, enc);
            return e;
        } catch (Exception ex) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    static InputStream stream(byte[] body) {
        return new ByteArrayInputStream(body);
    }

    private static byte[] readAll(InputStream in) throws IOException {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) bos.write(buf, 0, n);
        in.close();
        return bos.toByteArray();
    }

    Map<String, String> emptyHeaders() {
        return new HashMap<>();
    }
}
