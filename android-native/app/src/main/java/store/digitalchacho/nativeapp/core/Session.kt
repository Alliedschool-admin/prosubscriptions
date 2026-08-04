package store.digitalchacho.nativeapp.core

import android.content.Context
import android.content.SharedPreferences

/** Persisted auth session + light user profile info. */
object Session {
    private lateinit var prefs: SharedPreferences

    fun init(ctx: Context) {
        prefs = ctx.getSharedPreferences("dc_session", Context.MODE_PRIVATE)
    }

    var accessToken: String?
        get() = prefs.getString("access", null)
        set(v) { prefs.edit().putString("access", v).apply() }

    var refreshToken: String?
        get() = prefs.getString("refresh", null)
        set(v) { prefs.edit().putString("refresh", v).apply() }

    var expiresAt: Long
        get() = prefs.getLong("expires", 0L)
        set(v) { prefs.edit().putLong("expires", v).apply() }

    var userId: String?
        get() = prefs.getString("uid", null)
        set(v) { prefs.edit().putString("uid", v).apply() }

    var email: String?
        get() = prefs.getString("email", null)
        set(v) { prefs.edit().putString("email", v).apply() }

    var fullName: String?
        get() = prefs.getString("name", null)
        set(v) { prefs.edit().putString("name", v).apply() }

    var isAdmin: Boolean
        get() = prefs.getBoolean("is_admin", false)
        set(v) { prefs.edit().putBoolean("is_admin", v).apply() }

    var isSuperAdmin: Boolean
        get() = prefs.getBoolean("is_super", false)
        set(v) { prefs.edit().putBoolean("is_super", v).apply() }

    var seenWelcome: Boolean
        get() = prefs.getBoolean("seen_welcome", false)
        set(v) { prefs.edit().putBoolean("seen_welcome", v).apply() }

    /** PKCE verifier kept between opening Google consent and returning to the app. */
    var codeVerifier: String?
        get() = prefs.getString("pkce", null)
        set(v) { prefs.edit().putString("pkce", v).apply() }

    val signedIn: Boolean get() = accessToken != null

    fun clear() {
        prefs.edit().clear().apply()
    }
}
