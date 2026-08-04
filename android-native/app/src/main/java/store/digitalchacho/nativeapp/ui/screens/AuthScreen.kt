package store.digitalchacho.nativeapp.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import kotlinx.coroutines.launch
import store.digitalchacho.nativeapp.core.*
import store.digitalchacho.nativeapp.ui.DC
import store.digitalchacho.nativeapp.ui.components.*
import store.digitalchacho.nativeapp.ui.openUrl

private val disposableDomains = setOf(
    "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org",
    "yopmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "trashmail.com",
    "throwawaymail.com", "maildrop.cc", "fakeinbox.com", "mailnesia.com", "tempr.email",
    "moakt.com", "emailondeck.com", "mohmal.com", "inboxkitten.com", "mintemail.com",
)

@Composable
fun AuthScreen(nav: NavController) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var mode by remember { mutableStateOf("in") } // in | up | reset
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var awaitingConfirm by remember { mutableStateOf(false) }
    val emailValid = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}$").matches(email.trim())

    if (AppState.signedIn.value) {
        Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.Center) {
            EmptyState("You're signed in", Session.email ?: "Welcome back to Digital Chacho.")
            GradientButton("Go to the store", Modifier.fillMaxWidth()) { nav.navigate("home") }
            Spacer(Modifier.height(10.dp))
            GhostButton("Sign out", Modifier.fillMaxWidth()) { AppState.signOut() }
        }
        return
    }

    if (!AppState.online.value) {
        Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.Center) {
            EmptyState("You're offline", "Sign-in needs a connection. Browsing works offline.")
            GradientButton("Try again", Modifier.fillMaxWidth()) { AppState.online.value = Api.isOnline() }
        }
        return
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text("DIGITAL CHACHO", style = MaterialTheme.typography.labelSmall, color = DC.Gold)
        Text(
            when (mode) {
                "up" -> "Create your account"
                "reset" -> "Reset your password"
                else -> "Welcome back"
            },
            style = MaterialTheme.typography.displaySmall, color = DC.Text,
        )
        Spacer(Modifier.height(18.dp))

        if (mode == "up") {
            Field(fullName, { fullName = it }, "Full name")
            Spacer(Modifier.height(10.dp))
        }
        Field(email, { email = it }, "Email", keyboard = KeyboardType.Email)
        if (mode != "reset") {
            Spacer(Modifier.height(10.dp))
            Field(password, { password = it }, "Password", password = true)
            if (mode == "up" && password.isNotEmpty() && password.length < 6) {
                Spacer(Modifier.height(6.dp))
                Text("Use at least 6 characters", color = DC.Muted, style = MaterialTheme.typography.bodySmall)
            }
        }
        if (awaitingConfirm) {
            Spacer(Modifier.height(12.dp))
            Text(
                "We emailed you a confirmation link. Open it, then come back and sign in.",
                color = DC.Gold, style = MaterialTheme.typography.bodySmall,
            )
        }
        Spacer(Modifier.height(16.dp))

        GradientButton(
            when (mode) { "up" -> "Create account"; "reset" -> "Send reset link"; else -> "Sign in" },
            Modifier.fillMaxWidth(),
            enabled = emailValid && (mode == "reset" || password.length >= 6) &&
                (mode != "up" || fullName.trim().length >= 2),
            loading = busy,
        ) {
            val domain = email.substringAfterLast('@', "").lowercase().trim()
            if (mode == "up" && domain in disposableDomains) {
                AppState.notify("Temporary email services aren't allowed"); return@GradientButton
            }
            busy = true
            awaitingConfirm = false
            scope.launch {
                runCatching {
                    when (mode) {
                        "up" -> Api.signUp(email.trim(), password, fullName.trim())
                        "reset" -> Api.resetPassword(email.trim())
                        else -> Api.signIn(email.trim(), password)
                    }
                }.onSuccess { result ->
                    busy = false
                    when (mode) {
                        "reset" -> AppState.notify("Reset link sent — check your inbox")
                        "up" -> {
                            if (result == true && Session.signedIn) {
                                AppState.afterSignIn(); AppState.notify("Welcome to Digital Chacho"); nav.navigate("home")
                            } else {
                                awaitingConfirm = true
                                mode = "in"
                                password = ""
                                AppState.notify("Check your email to confirm your account")
                            }
                        }
                        else -> { AppState.afterSignIn(); AppState.notify("Signed in"); nav.navigate("home") }
                    }
                }.onFailure {
                    busy = false
                    AppState.notify(it.message ?: "Something went wrong. Check your connection and try again.")
                }
            }
        }

        Spacer(Modifier.height(12.dp))
        GhostButton("Continue with Google", Modifier.fillMaxWidth()) {
            openUrl(ctx, Api.googleAuthUrl())
        }

        Spacer(Modifier.height(18.dp))
        Text(
            when (mode) {
                "in" -> "New here? Create an account"
                else -> "Already have an account? Sign in"
            },
            color = DC.Cyan, style = MaterialTheme.typography.labelLarge,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().clickable { mode = if (mode == "in") "up" else "in" },
        )
        if (mode == "in") {
            Spacer(Modifier.height(10.dp))
            Text(
                "Forgot your password?",
                color = DC.Muted, style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().clickable { mode = "reset" },
            )
        }
        Spacer(Modifier.height(24.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Text(
                "Need help? WhatsApp support",
                color = DC.Muted, style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.clickable { openUrl(ctx, "https://wa.me/${Env.WHATSAPP_NUMBER}") },
            )
        }
    }
}
