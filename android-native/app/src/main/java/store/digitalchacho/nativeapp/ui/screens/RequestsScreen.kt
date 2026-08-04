package store.digitalchacho.nativeapp.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import kotlinx.coroutines.launch
import store.digitalchacho.nativeapp.core.AppState
import store.digitalchacho.nativeapp.core.Repo
import store.digitalchacho.nativeapp.core.Session
import store.digitalchacho.nativeapp.ui.DC
import store.digitalchacho.nativeapp.ui.components.*

@Composable
fun RequestsScreen(nav: NavController) {
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf("") }
    var details by remember { mutableStateOf("") }
    var link by remember { mutableStateOf("") }
    var contact by remember { mutableStateOf(Session.email.orEmpty()) }
    var busy by remember { mutableStateOf(false) }

    if (!AppState.signedIn.value) {
        Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.Center) {
            EmptyState("Sign in to request", "Tell us what you need and we'll try to arrange it.")
            GradientButton("Sign in", Modifier.fillMaxWidth()) { nav.navigate("auth") }
        }
        return
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { SectionTitle("Request a product", "Not in the store? We'll try to arrange it for you.") }
        item {
            GlassCard {
                Field(name, { name = it }, "Product name")
                Spacer(Modifier.height(8.dp))
                Field(details, { details = it }, "Plan, duration, anything specific", singleLine = false, minLines = 3)
                Spacer(Modifier.height(8.dp))
                Field(link, { link = it }, "Reference link (optional)")
                Spacer(Modifier.height(8.dp))
                Field(contact, { contact = it }, "How should we reach you?")
                Spacer(Modifier.height(12.dp))
                GradientButton(
                    "Send request", Modifier.fillMaxWidth(),
                    enabled = name.isNotBlank(), loading = busy,
                ) {
                    busy = true
                    scope.launch {
                        runCatching { Repo.createRequest(name, details, link, contact) }
                            .onSuccess {
                                busy = false; name = ""; details = ""; link = ""
                                AppState.loadUserData(); AppState.notify("Request sent — we'll reply soon")
                            }
                            .onFailure { busy = false; AppState.notify(it.message ?: "Could not send") }
                    }
                }
            }
        }
        item { SectionTitle("Your requests") }
        if (AppState.requests.value.isEmpty()) {
            item { EmptyState("No requests yet", "Anything you ask for shows up here with our reply.") }
        }
        items(AppState.requests.value, key = { it.id }) { r ->
            GlassCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        r.product_name, color = DC.Text, style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.weight(1f),
                    )
                    Pill(
                        r.status.replace('_', ' ').uppercase(),
                        when (r.status) {
                            "fulfilled" -> DC.Mint
                            "declined" -> DC.Danger
                            "responded" -> DC.Cyan
                            else -> DC.Gold
                        },
                    )
                }
                if (!r.details.isNullOrBlank()) {
                    Text(r.details, color = DC.Muted, style = MaterialTheme.typography.bodySmall)
                }
                if (!r.admin_response.isNullOrBlank()) {
                    Spacer(Modifier.height(6.dp))
                    Text("Chacho says: ${r.admin_response}", color = DC.Text, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}
