package store.digitalchacho.nativeapp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import store.digitalchacho.nativeapp.core.Price
import store.digitalchacho.nativeapp.core.Product
import store.digitalchacho.nativeapp.ui.DC

/** Supabase renders resized images on the fly — cheaper on mobile data. */
fun sizedImage(src: String, width: Int = 640): String {
    if (!src.contains("/storage/v1/object/public/")) return src
    val base = src.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/")
    val sep = if (base.contains("?")) "&" else "?"
    return "$base${sep}width=$width&quality=75&resize=cover"
}

@Composable
fun ProductCardView(
    product: Product,
    currency: String,
    wishlisted: Boolean,
    onOpen: () -> Unit,
    onBuy: () -> Unit,
    onWishlist: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val inStock = product.available_stock > 0
    Column(
        modifier
            .clip(RoundedCornerShape(22.dp))
            .background(DC.Glass)
            .border(1.dp, DC.Line, RoundedCornerShape(22.dp))
            .clickable { onOpen() }
    ) {
        Box(Modifier.fillMaxWidth().aspectRatio(1f)) {
            AsyncImage(
                model = sizedImage(product.image, 480),
                contentDescription = product.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize().background(DC.SurfaceAlt),
            )
            Row(
                Modifier.fillMaxWidth().padding(8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                if (product.is_free) Pill("FREE", DC.Mint)
                else if (!inStock) Pill("SOLD OUT", DC.Danger)
                else Pill("IN STOCK · ${product.available_stock}", DC.Cyan)
                Box(
                    Modifier
                        .size(30.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.45f))
                        .clickable { onWishlist() },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        if (wishlisted) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                        contentDescription = "Save",
                        tint = if (wishlisted) DC.Molten else Color.White,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        }
        Column(Modifier.padding(12.dp)) {
            Text(
                product.name, color = DC.Text, style = MaterialTheme.typography.titleMedium,
                maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
            Text(
                product.tagline, color = DC.Muted, style = MaterialTheme.typography.bodySmall,
                maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.heightIn(min = 32.dp),
            )
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    Price.label(product, currency),
                    color = DC.Gold, fontWeight = FontWeight.Black,
                    style = MaterialTheme.typography.titleMedium,
                )
                Spacer(Modifier.weight(1f))
                Box(
                    Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (inStock) DC.ember else androidx.compose.ui.graphics.Brush.linearGradient(listOf(DC.Line, DC.Line)))
                        .clickable(enabled = inStock) { onBuy() },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Filled.Bolt,
                        contentDescription = if (product.is_free) "Get it free" else "Buy now",
                        tint = if (inStock) Color.Black else DC.Muted,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }
    }
}
