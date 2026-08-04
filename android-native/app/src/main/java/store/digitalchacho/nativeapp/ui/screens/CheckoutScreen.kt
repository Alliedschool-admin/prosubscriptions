package store.digitalchacho.nativeapp.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import store.digitalchacho.nativeapp.core.*
import store.digitalchacho.nativeapp.ui.DC
import store.digitalchacho.nativeapp.ui.components.*
import store.digitalchacho.nativeapp.ui.pingWhatsApp

@Composable
fun CheckoutScreen(nav: NavController) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val currency = AppState.currency.value
    val methods = AppState.paymentMethods.value.filter { it.currency == currency || it.currency.isBlank() }
        .ifEmpty { AppState.paymentMethods.value }

    var method by remember(methods) { mutableStateOf(methods.firstOrNull()) }
    var name by remember { mutableStateOf(Session.fullName.orEmpty()) }
    var contact by remember { mutableStateOf(Session.email.orEmpty()) }
    var txn by remember { mutableStateOf("") }
    var coupon by remember { mutableStateOf("") }
    var discount by remember { mutableStateOf(0.0) }
    var appliedCode by remember { mutableStateOf<String?>(null) }
    var proofUri by remember { mutableStateOf<Uri?>(null) }
    var placing by remember { mutableStateOf(false) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { proofUri = it }

    val subtotal = AppState.subtotal()
    val total = (subtotal - discount).coerceAtLeast(0.0)

    if (!AppState.online.value) {
        Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.Center) {
            EmptyState("You're offline", "Checkout needs a connection so your payment can be verified.")
            GradientButton("Try again", Modifier.fillMaxWidth()) { AppState.online.value = Api.isOnline() }
        }
        return
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { SectionTitle("Checkout", "Pay, upload proof, get approved fast") }

        item {
            GlassCard {
                Text("Pay with", style = MaterialTheme.typography.titleMedium, color = DC.Text)
                Spacer(Modifier.height(8.dp))
                methods.forEach { m ->
                    val on = method?.id == m.id
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (on) DC.Molten.copy(alpha = 0.14f) else DC.Glass)
                            .border(1.dp, if (on) DC.Molten else DC.Line, RoundedCornerShape(14.dp))
                            .clickable { method = m }
                            .padding(12.dp)
                    ) {
                        Text("${m.label} · ${m.currency}", color = DC.Text, fontWeight = FontWeight.SemiBold)
                        Text(m.account_number, color = DC.Gold, style = MaterialTheme.typography.bodyMedium)
                        if (!m.account_name.isNullOrBlank()) {
                            Text(m.account_name, color = DC.Muted, style = MaterialTheme.typography.bodySmall)
                        }
                        if (!m.instructions.isNullOrBlank()) {
                            Text(m.instructions, color = DC.Muted, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
        }

        item {
            GlassCard {
                Field(name, { name = it }, "Your name")
                Spacer(Modifier.height(8.dp))
                Field(contact, { contact = it }, "WhatsApp or email")
                Spacer(Modifier.height(8.dp))
                Field(txn, { txn = it }, "Transaction ID / reference")
                Spacer(Modifier.height(10.dp))
                GhostButton(
                    if (proofUri == null) "Attach payment screenshot" else "Screenshot attached ✓",
                    Modifier.fillMaxWidth(),
                ) { picker.launch("image/*") }
            }
        }

        item {
            GlassCard {
                Text("Promo code", style = MaterialTheme.typography.titleMedium, color = DC.Text)
                Spacer(Modifier.height(8.dp))
                Row {
                    Field(coupon, { coupon = it }, "Code", Modifier.weight(1f))
                    Spacer(Modifier.width(8.dp))
                    GhostButton("Apply", Modifier.width(96.dp)) {
                        scope.launch {
                            runCatching { Repo.applyCoupon(coupon, subtotal, currency) }
                                .onSuccess {
                                    discount = it.discount; appliedCode = it.code
                                    AppState.notify("Code applied — you saved ${Price.format(it.discount, currency)}")
                                }
                                .onFailure { AppState.notify(it.message ?: "Invalid code") }
                        }
                    }
                }
                if (appliedCode != null) {
                    Spacer(Modifier.height(6.dp))
                    Pill("${appliedCode} · −${Price.format(discount, currency)}", DC.Mint)
                }
            }
        }

        item {
            GlassCard {
                Row { Text("Subtotal", color = DC.Muted, modifier = Modifier.weight(1f)); Text(Price.format(subtotal, currency), color = DC.Text) }
                if (discount > 0) {
                    Row { Text("Discount", color = DC.Muted, modifier = Modifier.weight(1f)); Text("−" + Price.format(discount, currency), color = DC.Mint) }
                }
                Spacer(Modifier.height(6.dp))
                Row {
                    Text("Total", color = DC.Text, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    Text(Price.format(total, currency), color = DC.Gold, fontWeight = FontWeight.Black)
                }
            }
        }

        item {
            GradientButton(
                "Place order",
                Modifier.fillMaxWidth(),
                enabled = name.isNotBlank() && contact.isNotBlank() && AppState.cart.isNotEmpty(),
                loading = placing,
            ) {
                placing = true
                scope.launch {
                    val proofPath = proofUri?.let { uri ->
                        runCatching {
                            withContext(Dispatchers.IO) {
                                val mime = ctx.contentResolver.getType(uri) ?: "image/jpeg"
                                val bytes = ctx.contentResolver.openInputStream(uri)!!.use { it.readBytes() }
                                Repo.uploadProof(bytes, mime)
                            }
                        }.getOrNull()
                    }
                    runCatching {
                        Repo.placeOrder(
                            lines = AppState.cart.toList(),
                            currency = currency,
                            method = method,
                            senderName = name,
                            senderContact = contact,
                            transactionRef = txn,
                            proofPath = proofPath,
                            couponCode = appliedCode,
                            discount = discount,
                        )
                    }.onSuccess {
                        placing = false
                        AppState.cart.clear()
                        AppState.loadUserData()
                        AppState.notify("Order placed — waiting for approval")
                        nav.navigate("vault")
                    }.onFailure {
                        placing = false
                        AppState.notify(it.message ?: "Could not place the order")
                    }
                }
            }
        }

        item {
            GhostButton("Ping admin on WhatsApp", Modifier.fillMaxWidth()) {
                pingWhatsApp(ctx, "Hi, I just paid ${Price.format(total, currency)} for my Digital Chacho order. Name: $name, ref: $txn")
            }
        }
    }
}
