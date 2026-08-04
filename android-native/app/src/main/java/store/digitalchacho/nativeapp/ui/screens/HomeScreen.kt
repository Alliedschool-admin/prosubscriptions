package store.digitalchacho.nativeapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Login
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import store.digitalchacho.nativeapp.core.*
import store.digitalchacho.nativeapp.ui.DC
import store.digitalchacho.nativeapp.ui.components.*
import store.digitalchacho.nativeapp.ui.openUrl

@Composable
fun HomeScreen(nav: NavController) {
    val ctx = LocalContext.current
    var query by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("All") }
    val products = AppState.products.value
    val currency = AppState.currency.value

    val categories = remember(products) {
        listOf("All") + products.map { it.category }.filter { it.isNotBlank() }.distinct().sorted()
    }
    val visible = products.filter { p ->
        (category == "All" || p.category == category) &&
            (query.isBlank() || p.name.contains(query, true) || p.tagline.contains(query, true) ||
                p.description.contains(query, true))
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 14.dp, end = 14.dp, top = 10.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("DIGITAL CHACHO", style = MaterialTheme.typography.labelSmall, color = DC.Gold)
                    Text(
                        "Premium tools,\nunreal prices.",
                        style = MaterialTheme.typography.displaySmall, color = DC.Text,
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Row(
                        Modifier
                            .clip(CircleShape)
                            .background(DC.Glass)
                            .border(1.dp, DC.Line, CircleShape)
                    ) {
                        listOf("PKR", "USD").forEach { c ->
                            Text(
                                c,
                                color = if (currency == c) Color_black() else DC.Muted,
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(if (currency == c) DC.Gold else androidx.compose.ui.graphics.Color.Transparent)
                                    .clickable { AppState.currency.value = c }
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                            )
                        }
                    }
                    Spacer(Modifier.height(6.dp))
                    Row {
                        IconButton(onClick = { AppState.refreshAll() }) {
                            Icon(Icons.Filled.Refresh, "Sync", tint = DC.Muted)
                        }
                        if (AppState.signedIn.value) {
                            IconButton(onClick = { AppState.signOut() }) {
                                Icon(Icons.Filled.Logout, "Sign out", tint = DC.Muted)
                            }
                        } else {
                            IconButton(onClick = { nav.navigate("auth") }) {
                                Icon(Icons.Filled.Login, "Sign in", tint = DC.Molten)
                            }
                        }
                    }
                }
            }
        }

        item {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                placeholder = { Text("Search premium subscriptions") },
                leadingIcon = { Icon(Icons.Filled.Search, null, tint = DC.Muted) },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = DC.Molten, unfocusedBorderColor = DC.Line,
                    focusedTextColor = DC.Text, unfocusedTextColor = DC.Text, cursorColor = DC.Molten,
                ),
            )
        }

        if (AppState.ticker.value.isNotEmpty()) {
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(AppState.ticker.value) { t ->
                        Row(
                            Modifier
                                .clip(CircleShape)
                                .background(DC.Glass)
                                .border(1.dp, DC.Line, CircleShape)
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(Icons.Filled.Bolt, null, tint = DC.Mint, modifier = Modifier.size(13.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(
                                "${t.first_name} got ${t.item_name}",
                                color = DC.Muted, style = MaterialTheme.typography.bodySmall,
                                maxLines = 1, overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                }
            }
        }

        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(categories) { c ->
                    val on = c == category
                    Text(
                        c,
                        color = if (on) Color_black() else DC.Muted,
                        style = MaterialTheme.typography.labelLarge,
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(if (on) DC.Gold else DC.Glass)
                            .border(1.dp, DC.Line, CircleShape)
                            .clickable { category = c }
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                    )
                }
            }
        }

        if (AppState.loading.value && products.isEmpty()) {
            item { Loader() }
        } else if (visible.isEmpty()) {
            item { EmptyState("Nothing here yet", "Try another search or pull sync to refresh the store.") }
        } else {
            item {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 4000.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    userScrollEnabled = false,
                ) {
                    items(visible, key = { it.id }) { p ->
                        ProductCardView(
                            product = p,
                            currency = currency,
                            wishlisted = AppState.wishlist.value.contains(p.id),
                            onOpen = { nav.navigate("product/${p.id}") },
                            onBuy = {
                                if (p.is_free) nav.navigate("product/${p.id}")
                                else { AppState.addToCart(p); nav.navigate("cart") }
                            },
                            onWishlist = { AppState.toggleWishlist(p.id) },
                        )
                    }
                }
            }
        }

        item {
            GlassCard {
                Text("Join the community", style = MaterialTheme.typography.titleMedium, color = DC.Text)
                Text(
                    "Get drops, free methods and instant support first.",
                    style = MaterialTheme.typography.bodySmall, color = DC.Muted,
                )
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    GhostButton("WhatsApp group", Modifier.weight(1f)) { openUrl(ctx, Env.COMMUNITY_GROUP) }
                    GhostButton("Channel", Modifier.weight(1f)) { openUrl(ctx, Env.COMMUNITY_CHANNEL) }
                }
            }
        }

        if (AppState.posts.value.isNotEmpty()) {
            item { SectionTitle("Free methods & updates", "Straight from the Chacho desk") }
            items(AppState.posts.value.take(8)) { post ->
                GlassCard(onClick = { post.link?.let { openUrl(ctx, it) } }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Pill(post.category.replace('_', ' ').uppercase(), DC.Violet)
                        if (post.pinned) { Spacer(Modifier.width(6.dp)); Pill("PINNED", DC.Gold) }
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(post.title, style = MaterialTheme.typography.titleMedium, color = DC.Text)
                    Text(
                        post.body, style = MaterialTheme.typography.bodySmall, color = DC.Muted,
                        maxLines = 4, overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }

        item {
            Row(
                Modifier.fillMaxWidth().padding(top = 8.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Filled.Chat, null, tint = DC.Muted, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(6.dp))
                Text(
                    "Need help? WhatsApp +${Env.WHATSAPP_NUMBER}",
                    color = DC.Muted, style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.clickable { openUrl(ctx, "https://wa.me/${Env.WHATSAPP_NUMBER}") },
                )
            }
        }
    }
}

internal fun Color_black() = androidx.compose.ui.graphics.Color.Black
