package store.digitalchacho.nativeapp

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import store.digitalchacho.nativeapp.core.Api
import store.digitalchacho.nativeapp.core.AppState
import store.digitalchacho.nativeapp.core.Cache
import store.digitalchacho.nativeapp.core.Session
import store.digitalchacho.nativeapp.ui.App
import store.digitalchacho.nativeapp.ui.DigitalChachoTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        Session.init(this)
        Cache.init(this)
        Api.init(this)
        AppState.bootstrap()
        setContent { DigitalChachoTheme { App() } }
        handleAuthDeepLink(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleAuthDeepLink(intent)
    }

    /** Google/OAuth returns to digitalchacho://auth#access_token=…&refresh_token=… */
    private fun handleAuthDeepLink(intent: Intent?) {
        val data: Uri = intent?.data ?: return
        if (data.scheme != "digitalchacho") return
        val fragment = data.fragment ?: data.query ?: return
        val params = fragment.split("&").mapNotNull {
            val parts = it.split("=", limit = 2)
            if (parts.size == 2) parts[0] to Uri.decode(parts[1]) else null
        }.toMap()
        val refresh = params["refresh_token"] ?: return
        lifecycleScope.launch {
            runCatching { Api.sessionFromRefreshToken(refresh) }
                .onSuccess { AppState.afterSignIn(); AppState.notify("Signed in with Google") }
                .onFailure { AppState.notify("Google sign-in failed — try email instead") }
        }
    }

    override fun onResume() {
        super.onResume()
        AppState.online.value = Api.isOnline()
    }
}
