package store.digitalchacho.nativeapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import store.digitalchacho.nativeapp.core.*
import store.digitalchacho.nativeapp.ui.DC
import store.digitalchacho.nativeapp.ui.components.*

@Composable
fun ProductDetailScreen(nav: NavController, id: String) {
    val product = AppState.product(id)
    val currency = AppState.currency.value
    val scope = rememberCoroutineScope()
    var reviews by remember { mutableStateOf<List<Review>>(emptyList()) }
    var claiming by remember { mutableStateOf(false) }
    var showReview by remember { mutableStateOf(false) }
    var rating by remember { mutableStateOf(5) }
    var reviewTitle by remember { mutableStateOf("") }
    var reviewBody by remember { mutableStateOf("") }

    LaunchedEffect(id) { runCatching { reviews = Repo.reviews(id) } }

    if (product == null) {
        EmptyState("Product unavailable", "It may have been removed. Go back and refresh the store.")
        return
    }
    val avg = if (reviews.isEmpty()) 0.0 else reviews.sumOf { it.rating }.toDouble() / reviews.size
    val related = AppState.products.value.filter { it.category == product.category && it.id != product.id }.take(6)
    val inStock = product.available_stock > 0

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { nav.popBackStack() }) {
                    Icon(Icons.Filled.ArrowBack, "Back", tint = DC.Text)
                }
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { AppState.toggleWishlist(product.id) }) {
                    val saved = AppState.wishlist.value.contains(product.id)
                    Icon(
                        if (saved) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                        "Save", tint = if (saved) DC.Molten else DC.Muted,
                    )
                }
            }
        }
        item {
            AsyncImage(
                model = sizedImage(product.image, 1024),
                contentDescription = product.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1.1f)
                    .clip(RoundedCornerShape(22.dp))
                    .background(DC.SurfaceAlt),
            )
        }
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (product.is_free) Pill("FREE", DC.Mint)
                else if (inStock) Pill("IN STOCK · ${product.available_stock}", DC.Cyan)
                else Pill("SOLD OUT", DC.Danger)
                if (reviews.isNotEmpty()) {
                    Spacer(Modifier.width(8.dp))
                    Stars(avg)
                    Spacer(Modifier.width(4.dp))
                    Text("${reviews.size}", color = DC.Muted, style = MaterialTheme.typography.bodySmall)
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(product.name, style = MaterialTheme.typography.displaySmall, color = DC.Text)
            Text(product.tagline, style = MaterialTheme.typography.bodyLarge, color = DC.Muted)
            Spacer(Modifier.height(8.dp))
            Text(
                Price.label(product, currency),
                style = MaterialTheme.typography.headlineMedium, color = DC.Gold, fontWeight = FontWeight.Black,
            )
        }
        item {
            when {
                product.is_free && inStock -> GradientButton(
                    if (claiming) "Claiming…" else "Get it free",
                    Modifier.fillMaxWidth(), loading = claiming,
                ) {
                    if (!AppState.signedIn.value) { nav.navigate("auth"); return@GradientButton }
                    claiming = true
                    scope.launch {
                        runCatching { Repo.claimFree(product.id) }
                            .onSuccess { (orderId, owned, oos) ->
                                claiming = false
                                when {
                                    oos -> AppState.notify("Out of stock right now")
                                    owned -> { AppState.notify("Already in your vault"); nav.navigate("vault") }
                                    else -> {
                                        AppState.loadUserData()
                                        AppState.notify("Delivered — check your vault")
                                        nav.navigate("vault")
                                    }
                                }
                            }
                            .onFailure { claiming = false; AppState.notify(it.message ?: "Claim failed") }
                    }
                }
                inStock -> Column {
                    GradientButton("Buy now", Modifier.fillMaxWidth()) {
                        AppState.addToCart(product); nav.navigate("cart")
                    }
                    Spacer(Modifier.height(8.dp))
                    GhostButton("Add to cart", Modifier.fillMaxWidth()) { AppState.addToCart(product) }
                }
                else -> GhostButton("Request this product", Modifier.fillMaxWidth()) { nav.navigate("requests") }
            }
        }
        item {
            GlassCard {
                Text("What you get", style = MaterialTheme.typography.titleMedium, color = DC.Text)
                Spacer(Modifier.height(6.dp))
                Text(product.description, style = MaterialTheme.typography.bodyMedium, color = DC.Muted)
                if (!product.delivery_instructions.isNullOrBlank()) {
                    Spacer(Modifier.height(10.dp))
                    Text("Delivery", style = MaterialTheme.typography.titleMedium, color = DC.Text)
                    Text(product.delivery_instructions, style = MaterialTheme.typography.bodyMedium, color = DC.Muted)
                }
            }
        }
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                SectionTitle("Reviews")
                Spacer(Modifier.weight(1f))
                Text(
                    if (showReview) "Cancel" else "Write one",
                    color = DC.Cyan, style = MaterialTheme.typography.labelLarge,
                    modifier = Modifier.clickable {
                        if (!AppState.signedIn.value) nav.navigate("auth") else showReview = !showReview
                    },
                )
            }
        }
        if (showReview) {
            item {
                GlassCard {
                    Row {
                        (1..5).forEach { i ->
                            Text(
                                if (i <= rating) "★" else "☆",
                                color = DC.Gold, style = MaterialTheme.typography.headlineMedium,
                                modifier = Modifier.clickable { rating = i }.padding(end = 4.dp),
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Field(reviewTitle, { reviewTitle = it }, "Headline")
                    Spacer(Modifier.height(8.dp))
                    Field(reviewBody, { reviewBody = it }, "Your experience", singleLine = false, minLines = 3)
                    Spacer(Modifier.height(10.dp))
                    GradientButton("Post review", Modifier.fillMaxWidth()) {
                        scope.launch {
                            runCatching { Repo.addReview(product.id, rating, reviewTitle, reviewBody) }
                                .onSuccess {
                                    showReview = false; reviewTitle = ""; reviewBody = ""
                                    reviews = runCatching { Repo.reviews(product.id) }.getOrDefault(reviews)
                                    AppState.notify("Thanks for the review")
                                }
                                .onFailure { AppState.notify(it.message ?: "Could not post review") }
                        }
                    }
                }
            }
        }
        if (reviews.isEmpty()) {
            item { Text("No reviews yet.", color = DC.Muted, style = MaterialTheme.typography.bodyMedium) }
        } else {
            items(reviews) { r ->
                GlassCard {
                    Stars(r.rating.toDouble())
                    if (!r.title.isNullOrBlank()) Text(r.title, color = DC.Text, style = MaterialTheme.typography.titleMedium)
                    if (!r.body.isNullOrBlank()) Text(r.body, color = DC.Muted, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        if (related.isNotEmpty()) {
            item { SectionTitle("You may also like") }
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(related) { p ->
                        ProductCardView(
                            product = p, currency = currency,
                            wishlisted = AppState.wishlist.value.contains(p.id),
                            onOpen = { nav.navigate("product/${p.id}") },
                            onBuy = { AppState.addToCart(p); nav.navigate("cart") },
                            onWishlist = { AppState.toggleWishlist(p.id) },
                            modifier = Modifier.width(180.dp),
                        )
                    }
                }
            }
        }
    }
}
