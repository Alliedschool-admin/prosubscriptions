package store.digitalchacho.nativeapp.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import kotlinx.coroutines.launch
import store.digitalchacho.nativeapp.core.*
import store.digitalchacho.nativeapp.ui.DC
import store.digitalchacho.nativeapp.ui.components.*
import store.digitalchacho.nativeapp.ui.pingWhatsApp

@Composable
fun VaultScreen(nav: NavController) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    var tab by remember { mutableStateOf(0) }

    if (!AppState.signedIn.value) {
        Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.Center) {
            EmptyState("Your vault is locked", "Sign in to see everything you own.")
            GradientButton("Sign in", Modifier.fillMaxWidth()) { nav.navigate("auth") }
        }
        return
    }

    Column(Modifier.fillMaxSize()) {
        TabRow(selectedTabIndex = tab, containerColor = Color.Transparent, contentColor = DC.Molten) {
            listOf("My purchases", "Saved").forEachIndexed { i, label ->
                Tab(selected = tab == i, onClick = { tab = i }, text = { Text(label) })
            }
        }
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                GlassCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Loyalty points", color = DC.Muted, style = MaterialTheme.typography.bodySmall)
                            Text(
                                "${AppState.loyalty.value}",
                                color = DC.Gold, style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Black,
                            )
                        }
                        Pill(Session.email ?: "Signed in", DC.Cyan)
                    }
                }
            }

            if (tab == 0) {
                val orders = AppState.orders.value
                if (orders.isEmpty()) {
                    item { EmptyState("Nothing here yet", "Your approved orders appear here instantly.") }
                }
                items(orders, key = { it.id }) { o ->
                    GlassCard {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                o.item_name, color = DC.Text,
                                style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f),
                            )
                            Pill(
                                o.status.uppercase(),
                                when (o.status) {
                                    "approved" -> DC.Mint
                                    "rejected" -> DC.Danger
                                    else -> DC.Gold
                                },
                            )
                        }
                        Text(
                            "${Price.format(o.amount, o.currency)} · qty ${o.quantity}" +
                                (o.payment_method_label?.let { " · $it" } ?: ""),
                            color = DC.Muted, style = MaterialTheme.typography.bodySmall,
                        )
                        if (!o.delivered_content.isNullOrBlank()) {
                            Spacer(Modifier.height(8.dp))
                            Column(
                                Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(DC.SurfaceAlt)
                                    .padding(10.dp)
                            ) {
                                Text(o.delivered_content, color = DC.Text, style = MaterialTheme.typography.bodySmall)
                            }
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "Copy details", color = DC.Cyan, style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.clickable { copy(ctx, o.delivered_content) },
                            )
                        }
                        if (!o.admin_note.isNullOrBlank()) {
                            Text("Note: ${o.admin_note}", color = DC.Muted, style = MaterialTheme.typography.bodySmall)
                        }
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (o.status == "pending") {
                                GhostButton("Ping admin", Modifier.weight(1f)) {
                                    pingWhatsApp(ctx, "Hi, my payment for ${o.item_name} is done. Please approve order ${o.id.take(8)}.")
                                }
                            }
                            GhostButton("Remove", Modifier.weight(1f)) {
                                scope.launch {
                                    runCatching { Repo.deleteOrder(o.id) }
                                        .onSuccess { AppState.loadUserData(); AppState.notify("Removed") }
                                        .onFailure { AppState.notify(it.message ?: "Could not remove") }
                                }
                            }
                        }
                    }
                }
            } else {
                val saved = AppState.products.value.filter { AppState.wishlist.value.contains(it.id) }
                if (saved.isEmpty()) item { EmptyState("Nothing saved", "Tap the heart on any product to save it.") }
                items(saved.chunked(2)) { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        row.forEach { p ->
                            ProductCardView(
                                product = p, currency = AppState.currency.value, wishlisted = true,
                                onOpen = { nav.navigate("product/${p.id}") },
                                onBuy = { AppState.addToCart(p); nav.navigate("cart") },
                                onWishlist = { AppState.toggleWishlist(p.id) },
                                modifier = Modifier.weight(1f),
                            )
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

private fun copy(ctx: Context, text: String) {
    val cm = ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    cm.setPrimaryClip(ClipData.newPlainText("Digital Chacho", text))
    AppState.notify("Copied")
}
