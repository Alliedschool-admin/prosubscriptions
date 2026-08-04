package store.digitalchacho.nativeapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
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
    }

    override fun onResume() {
        super.onResume()
        AppState.online.value = Api.isOnline()
    }
}
