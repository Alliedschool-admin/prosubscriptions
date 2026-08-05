package store.digitalchacho.nativeapp.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import store.digitalchacho.nativeapp.core.AppState
import store.digitalchacho.nativeapp.core.Post
import store.digitalchacho.nativeapp.ui.DC
import store.digitalchacho.nativeapp.ui.components.*
import store.digitalchacho.nativeapp.ui.openUrl

private val tipCategories = listOf(
    "all" to "All",
    "tip" to "Tips & tricks",
    "free_method" to "Free methods",
    "update" to "Updates",
    "announcement" to "Announcements",
)

private fun categoryLabel(category: String): String =
    tipCategories.firstOrNull { it.first == category }?.second
        ?: category.replace('_', ' ').replaceFirstChar { it.uppercase() }

/** Tech tips & tricks — the same knowledge base as the website, native. */
@Composable
fun TipsScreen(@Suppress("UNUSED_PARAMETER") nav: NavController) {
    val ctx = LocalContext.current
    var category by remember { mutableStateOf("all") }
    var query by remember { mutableStateOf("") }

    val posts: List<Post> = AppState.posts.value
    val needle = query.trim().lowercase()
    val filtered = posts.filter { post ->
        val categoryOk = category == "all" || post.category == category
        val queryOk = needle.isEmpty() ||
            post.title.lowercase().contains(needle) ||
            post.body.lowercase().contains(needle)
        categoryOk && queryOk
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp, 12.dp, 16.dp, 28.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item {
            Column {
                Pill("KNOWLEDGE BASE", DC.Cyan)
                Spacer(Modifier.height(8.dp))
                SectionTitle(
                    "Tech tips & tricks",
                    "Free methods, tips and the latest store updates.",
                )
                Field(query, { query = it }, "Search tips, methods, updates")
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    tipCategories.take(3).forEach { (id, label) ->
                        CategoryChip(label, id == category, posts.countFor(id)) { category = id }
                    }
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    tipCategories.drop(3).forEach { (id, label) ->
                        CategoryChip(label, id == category, posts.countFor(id)) { category = id }
                    }
                }
            }
        }

        if (filtered.isEmpty()) {
            item {
                EmptyState(
                    "Nothing here yet",
                    if (!AppState.online.value) "Connect to load the newest tips."
                    else "New tips and free methods land here — check back soon.",
                )
            }
        }

        items(filtered) { post ->
            GlassCard(onClick = { post.link?.let { openUrl(ctx, it) } }) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Pill(categoryLabel(post.category).uppercase(), DC.Violet)
                    if (post.pinned) { Spacer(Modifier.width(6.dp)); Pill("PINNED", DC.Gold) }
                }
                Spacer(Modifier.height(6.dp))
                Text(post.title, style = MaterialTheme.typography.titleMedium, color = DC.Text)
                Spacer(Modifier.height(4.dp))
                Text(post.body, style = MaterialTheme.typography.bodySmall, color = DC.Muted)
                if (post.link != null) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Open link",
                        style = MaterialTheme.typography.labelLarge, color = DC.Cyan,
                        maxLines = 1, overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }

        item {
            GhostButton("Read everything on the website", Modifier.fillMaxWidth()) {
                openUrl(ctx, "https://www.digitalchacho.store/tips")
            }
        }
    }
}

private fun List<Post>.countFor(category: String): Int =
    if (category == "all") size else count { it.category == category }

@Composable
private fun CategoryChip(label: String, selected: Boolean, count: Int, onClick: () -> Unit) {
    Box(Modifier.clickable { onClick() }) {
        Pill("$label $count", if (selected) DC.Gold else DC.Muted)
    }
}
