package store.digitalchacho.nativeapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import store.digitalchacho.nativeapp.core.AppState
import store.digitalchacho.nativeapp.core.Price
import store.digitalchacho.nativeapp.ui.DC
import store.digitalchacho.nativeapp.ui.components.*

@Composable
fun CartScreen(nav: NavController) {
    val currency = AppState.currency.value
    val lines = AppState.cart

    if (lines.isEmpty()) {
        Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.Center) {
            EmptyState("Your cart is empty", "Browse the store and add a premium plan.")
            GradientButton("Browse the store", Modifier.fillMaxWidth()) { nav.navigate("home") }
        }
        return
    }

    Column(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.weight(1f),
            contentPadding = PaddingValues(14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { SectionTitle("Your cart", "${lines.sumOf { it.qty }} item(s)") }
            items(lines.toList(), key = { it.product.id }) { line ->
                GlassCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AsyncImage(
                            model = sizedImage(line.product.image, 200),
                            contentDescription = line.product.name,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.size(58.dp).clip(RoundedCornerShape(14.dp)).background(DC.SurfaceAlt),
                        )
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                line.product.name, color = DC.Text,
                                style = MaterialTheme.typography.titleMedium,
                                maxLines = 1, overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                Price.format(Price.of(line.product, currency) * line.qty, currency),
                                color = DC.Gold, fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            StepBtn("−") { AppState.setQty(line.product.id, line.qty - 1) }
                            Text(
                                "${line.qty}", color = DC.Text,
                                modifier = Modifier.padding(horizontal = 10.dp),
                            )
                            StepBtn("+") { AppState.setQty(line.product.id, line.qty + 1) }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Remove", color = DC.Danger, style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.clickable { AppState.removeFromCart(line.product.id) },
                    )
                }
            }
        }
        Column(
            Modifier
                .fillMaxWidth()
                .background(DC.Surface)
                .padding(14.dp)
                .navigationBarsPadding()
        ) {
            Row {
                Text("Subtotal", color = DC.Muted, modifier = Modifier.weight(1f))
                Text(
                    Price.format(AppState.subtotal(), currency),
                    color = DC.Text, fontWeight = FontWeight.Bold,
                )
            }
            Spacer(Modifier.height(10.dp))
            GradientButton("Checkout", Modifier.fillMaxWidth()) {
                if (AppState.signedIn.value) nav.navigate("checkout") else nav.navigate("auth")
            }
        }
    }
}

@Composable
private fun StepBtn(label: String, onClick: () -> Unit) {
    Box(
        Modifier
            .size(30.dp)
            .clip(CircleShape)
            .background(DC.Glass)
            .border(1.dp, DC.Line, CircleShape)
            .clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) { Text(label, color = DC.Text, fontWeight = FontWeight.Bold) }
}
