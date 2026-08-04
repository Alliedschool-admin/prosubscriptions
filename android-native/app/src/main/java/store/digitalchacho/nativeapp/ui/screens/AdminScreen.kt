package store.digitalchacho.nativeapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import store.digitalchacho.nativeapp.core.*
import store.digitalchacho.nativeapp.ui.DC
import store.digitalchacho.nativeapp.ui.components.*

private val TABS = listOf(
    "Orders", "Products", "Stock", "Posts", "Coupons", "Requests", "Users", "Admins", "Analytics", "Broadcast",
)

@Composable
fun AdminScreen(nav: NavController) {
    var tab by remember { mutableStateOf(0) }

    if (!AppState.isAdmin.value) {
        Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.Center) {
            EmptyState("Admins only", "This area is reserved for the Digital Chacho team.")
        }
        return
    }

    Column(Modifier.fillMaxSize()) {
        ScrollableTabRow(
            selectedTabIndex = tab,
            containerColor = Color.Transparent,
            contentColor = DC.Molten,
            edgePadding = 12.dp,
        ) {
            TABS.forEachIndexed { i, label ->
                Tab(selected = tab == i, onClick = { tab = i }, text = { Text(label, maxLines = 1) })
            }
        }
        when (TABS[tab]) {
            "Orders" -> AdminOrders()
            "Products" -> AdminProducts()
            "Stock" -> AdminStock()
            "Posts" -> AdminPosts()
            "Coupons" -> AdminCoupons()
            "Requests" -> AdminRequests()
            "Users" -> AdminUsers()
            "Admins" -> AdminAdmins()
            "Analytics" -> AdminAnalytics()
            else -> AdminBroadcast()
        }
    }
}

@Composable
private fun Screen(content: @Composable ColumnScope.() -> Unit) {
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) { item { Column(verticalArrangement = Arrangement.spacedBy(12.dp), content = content) } }
}

// ------------------------------------------------------------------- orders

@Composable
private fun AdminOrders() {
    val scope = rememberCoroutineScope()
    var status by remember { mutableStateOf<String?>("pending") }
    var orders by remember { mutableStateOf<List<Order>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var note by remember { mutableStateOf("") }

    suspend fun reload() { runCatching { orders = Repo.allOrders(status) } }
    LaunchedEffect(status) { busy = true; reload(); busy = false }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("pending" to "Pending", "approved" to "Approved", "rejected" to "Rejected", null to "All")
                    .forEach { (value, label) ->
                        val on = status == value
                        Text(
                            label,
                            color = if (on) Color.Black else DC.Muted,
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(if (on) DC.Gold else DC.Glass)
                                .clickable { status = value }
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                        )
                    }
            }
        }
        item { Field(note, { note = it }, "Note sent with approve / reject") }
        if (busy) item { Loader() }
        if (!busy && orders.isEmpty()) item { EmptyState("Nothing here", "No orders with this status.") }
        items(orders, key = { it.id }) { o ->
            GlassCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(o.item_name, color = DC.Text, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    Pill(o.status.uppercase(), if (o.status == "approved") DC.Mint else if (o.status == "rejected") DC.Danger else DC.Gold)
                }
                Text(
                    "${Price.format(o.amount, o.currency)} · qty ${o.quantity} · ${o.sender_name}",
                    color = DC.Muted, style = MaterialTheme.typography.bodySmall,
                )
                Text(
                    "${o.sender_contact}${o.transaction_ref?.let { " · ref $it" } ?: ""}",
                    color = DC.Muted, style = MaterialTheme.typography.bodySmall,
                )
                if (o.status == "pending") {
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        GradientButton("Approve", Modifier.weight(1f)) {
                            scope.launch {
                                runCatching { Repo.approveOrder(o.id, note) }
                                    .onSuccess { (delivered, oos) ->
                                        AppState.notify(if (oos) "Out of stock — add stock first" else "Approved & delivered")
                                        reload()
                                    }
                                    .onFailure { AppState.notify(it.message ?: "Approve failed") }
                            }
                        }
                        GhostButton("Reject", Modifier.weight(1f)) {
                            scope.launch {
                                runCatching { Repo.rejectOrder(o.id, note) }
                                    .onSuccess { AppState.notify("Rejected"); reload() }
                                    .onFailure { AppState.notify(it.message ?: "Reject failed") }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ----------------------------------------------------------------- products

@Composable
private fun AdminProducts() {
    val scope = rememberCoroutineScope()
    var editing by remember { mutableStateOf<Product?>(null) }
    var isNew by remember { mutableStateOf(false) }
    var counts by remember { mutableStateOf<Map<String, Long>>(emptyMap()) }

    LaunchedEffect(Unit) { counts = Repo.purchaseCounts() }

    val current = editing
    if (current != null) {
        ProductEditor(
            product = current,
            isNew = isNew,
            onCancel = { editing = null },
            onSave = { p ->
                scope.launch {
                    runCatching { Repo.saveProduct(p, isNew) }
                        .onSuccess { editing = null; AppState.refreshAll(); AppState.notify("Saved") }
                        .onFailure { AppState.notify(it.message ?: "Save failed") }
                }
            },
        )
        return
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            GradientButton("Add a product", Modifier.fillMaxWidth()) {
                isNew = true
                editing = Product(id = "", code = "", name = "")
            }
        }
        items(AppState.products.value, key = { it.id }) { p ->
            GlassCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(p.name, color = DC.Text, style = MaterialTheme.typography.titleMedium)
                        Text(
                            "${Price.label(p, "PKR")} · stock ${p.available_stock} · sold ${counts[p.id] ?: 0}",
                            color = DC.Muted, style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    if (p.is_free) Pill("FREE", DC.Mint)
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    GhostButton("Edit", Modifier.weight(1f)) { isNew = false; editing = p }
                    GhostButton("Delete", Modifier.weight(1f)) {
                        scope.launch {
                            runCatching { Repo.deleteProduct(p.id) }
                                .onSuccess { AppState.refreshAll(); AppState.notify("Deleted") }
                                .onFailure { AppState.notify(it.message ?: "Delete failed") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProductEditor(product: Product, isNew: Boolean, onCancel: () -> Unit, onSave: (Product) -> Unit) {
    var id by remember { mutableStateOf(product.id) }
    var name by remember { mutableStateOf(product.name) }
    var tagline by remember { mutableStateOf(product.tagline) }
    var description by remember { mutableStateOf(product.description) }
    var category by remember { mutableStateOf(product.category) }
    var image by remember { mutableStateOf(product.image) }
    var usd by remember { mutableStateOf(product.price_usd?.toString().orEmpty()) }
    var pkr by remember { mutableStateOf(product.price_pkr?.toString().orEmpty()) }
    var delivery by remember { mutableStateOf(product.delivery_instructions.orEmpty()) }
    var free by remember { mutableStateOf(product.is_free) }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item { SectionTitle(if (isNew) "New product" else "Edit ${product.name}") }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (isNew) Field(id, { id = it.lowercase().replace(" ", "-") }, "Product id (slug)")
                Field(name, { name = it }, "Name")
                Field(tagline, { tagline = it }, "Tagline")
                Field(description, { description = it }, "Description", singleLine = false, minLines = 4)
                Field(category, { category = it }, "Category")
                Field(image, { image = it }, "Image URL")
                Field(usd, { usd = it }, "Price USD")
                Field(pkr, { pkr = it }, "Price PKR")
                Field(delivery, { delivery = it }, "Delivery instructions", singleLine = false, minLines = 2)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Switch(
                        checked = free, onCheckedChange = { free = it },
                        colors = SwitchDefaults.colors(checkedTrackColor = DC.Molten),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text("Free product (no checkout, instant delivery)", color = DC.Muted)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    GhostButton("Cancel", Modifier.weight(1f)) { onCancel() }
                    GradientButton("Save", Modifier.weight(1f)) {
                        onSave(
                            product.copy(
                                id = id.ifBlank { name.lowercase().replace(Regex("[^a-z0-9]+"), "-") },
                                code = product.code.ifBlank { name.take(6).uppercase() },
                                name = name, tagline = tagline, description = description,
                                category = category, image = image,
                                price_usd = usd.toDoubleOrNull(), price_pkr = pkr.toDoubleOrNull(),
                                delivery_instructions = delivery.ifBlank { null }, is_free = free,
                            )
                        )
                    }
                }
            }
        }
    }
}

// -------------------------------------------------------------------- stock

@Composable
private fun AdminStock() {
    val scope = rememberCoroutineScope()
    var productId by remember { mutableStateOf(AppState.products.value.firstOrNull()?.id.orEmpty()) }
    var items by remember { mutableStateOf<List<StockItem>>(emptyList()) }
    var bulk by remember { mutableStateOf("") }

    suspend fun reload() { if (productId.isNotBlank()) runCatching { items = Repo.stockItems(productId) } }
    LaunchedEffect(productId) { reload() }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { SectionTitle("Stock", "One line per account / key") }
        items(AppState.products.value.chunked(2)) { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { p ->
                    val on = p.id == productId
                    Text(
                        "${p.name} (${p.available_stock})",
                        color = if (on) Color.Black else DC.Muted,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (on) DC.Gold else DC.Glass)
                            .clickable { productId = p.id }
                            .padding(10.dp),
                    )
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
        item {
            GlassCard {
                Field(bulk, { bulk = it }, "Paste stock lines", singleLine = false, minLines = 4)
                Spacer(Modifier.height(10.dp))
                GradientButton("Add stock", Modifier.fillMaxWidth(), enabled = bulk.isNotBlank()) {
                    scope.launch {
                        runCatching { Repo.addStock(productId, bulk.lines()) }
                            .onSuccess { bulk = ""; reload(); AppState.refreshAll(); AppState.notify("Stock added") }
                            .onFailure { AppState.notify(it.message ?: "Could not add stock") }
                    }
                }
            }
        }
        items(items, key = { it.id }) { s ->
            GlassCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(s.content, color = DC.Text, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                    Pill(s.status.uppercase(), if (s.status == "sold") DC.Muted else DC.Mint)
                }
                if (s.status == "available") {
                    Text(
                        "Delete", color = DC.Danger, style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.clickable {
                            scope.launch {
                                runCatching { Repo.deleteStock(s.id) }
                                    .onSuccess { reload(); AppState.refreshAll() }
                                    .onFailure { AppState.notify(it.message ?: "Delete failed") }
                            }
                        },
                    )
                }
            }
        }
    }
}

// -------------------------------------------------------------------- posts

@Composable
private fun AdminPosts() {
    val scope = rememberCoroutineScope()
    var posts by remember { mutableStateOf<List<Post>>(emptyList()) }
    var editId by remember { mutableStateOf<String?>(null) }
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("update") }
    var link by remember { mutableStateOf("") }
    var image by remember { mutableStateOf("") }
    var pinned by remember { mutableStateOf(false) }

    suspend fun reload() { runCatching { posts = Repo.allPosts() } }
    LaunchedEffect(Unit) { reload() }

    fun clear() { editId = null; title = ""; body = ""; link = ""; image = ""; pinned = false; category = "update" }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            GlassCard {
                Text(if (editId == null) "New post" else "Edit post", color = DC.Text, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                Field(title, { title = it }, "Title")
                Spacer(Modifier.height(8.dp))
                Field(body, { body = it }, "Body", singleLine = false, minLines = 4)
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("free_method", "update", "announcement").forEach { c ->
                        val on = c == category
                        Text(
                            c.replace('_', ' '),
                            color = if (on) Color.Black else DC.Muted,
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier
                                .clip(RoundedCornerShape(14.dp))
                                .background(if (on) DC.Gold else DC.Glass)
                                .clickable { category = c }
                                .padding(horizontal = 10.dp, vertical = 8.dp),
                        )
                    }
                }
                Spacer(Modifier.height(8.dp))
                Field(link, { link = it }, "Link (optional)")
                Spacer(Modifier.height(8.dp))
                Field(image, { image = it }, "Image URL (optional)")
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Switch(checked = pinned, onCheckedChange = { pinned = it }, colors = SwitchDefaults.colors(checkedTrackColor = DC.Molten))
                    Spacer(Modifier.width(8.dp))
                    Text("Pin to top", color = DC.Muted)
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (editId != null) GhostButton("Cancel", Modifier.weight(1f)) { clear() }
                    GradientButton("Publish", Modifier.weight(1f), enabled = title.isNotBlank() && body.isNotBlank()) {
                        scope.launch {
                            runCatching { Repo.savePost(editId, title, body, category, link, image, pinned) }
                                .onSuccess { clear(); reload(); AppState.refreshAll(); AppState.notify("Published") }
                                .onFailure { AppState.notify(it.message ?: "Could not publish") }
                        }
                    }
                }
            }
        }
        items(posts, key = { it.id }) { p ->
            GlassCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(p.title, color = DC.Text, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    Pill(p.category.replace('_', ' ').uppercase(), DC.Violet)
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    GhostButton("Edit", Modifier.weight(1f)) {
                        editId = p.id; title = p.title; body = p.body; category = p.category
                        link = p.link.orEmpty(); image = p.image.orEmpty(); pinned = p.pinned
                    }
                    GhostButton("Delete", Modifier.weight(1f)) {
                        scope.launch {
                            runCatching { Repo.deletePost(p.id) }
                                .onSuccess { reload(); AppState.refreshAll() }
                                .onFailure { AppState.notify(it.message ?: "Delete failed") }
                        }
                    }
                }
            }
        }
    }
}

// ------------------------------------------------------------------ coupons

@Composable
private fun AdminCoupons() {
    val scope = rememberCoroutineScope()
    var coupons by remember { mutableStateOf<List<Coupon>>(emptyList()) }
    var code by remember { mutableStateOf("") }
    var kind by remember { mutableStateOf("percent") }
    var value by remember { mutableStateOf("") }
    var minAmount by remember { mutableStateOf("") }
    var maxUses by remember { mutableStateOf("") }

    suspend fun reload() { runCatching { coupons = Repo.coupons() } }
    LaunchedEffect(Unit) { reload() }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            GlassCard {
                Text("New promo code", color = DC.Text, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                Field(code, { code = it.uppercase() }, "Code")
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("percent", "fixed").forEach { k ->
                        val on = k == kind
                        Text(
                            k, color = if (on) Color.Black else DC.Muted,
                            style = MaterialTheme.typography.labelSmall,
                            modifier = Modifier
                                .clip(RoundedCornerShape(14.dp))
                                .background(if (on) DC.Gold else DC.Glass)
                                .clickable { kind = k }
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                        )
                    }
                }
                Spacer(Modifier.height(8.dp))
                Field(value, { value = it }, if (kind == "percent") "Percent off" else "Amount off")
                Spacer(Modifier.height(8.dp))
                Field(minAmount, { minAmount = it }, "Minimum spend (optional)")
                Spacer(Modifier.height(8.dp))
                Field(maxUses, { maxUses = it }, "Max uses (optional)")
                Spacer(Modifier.height(10.dp))
                GradientButton(
                    "Create code", Modifier.fillMaxWidth(),
                    enabled = code.isNotBlank() && value.toDoubleOrNull() != null,
                ) {
                    scope.launch {
                        val c = Coupon(
                            id = "", code = code, kind = kind, value = value.toDoubleOrNull() ?: 0.0,
                            min_amount = minAmount.toDoubleOrNull() ?: 0.0, max_uses = maxUses.toIntOrNull(),
                        )
                        runCatching { Repo.saveCoupon(c, true) }
                            .onSuccess { code = ""; value = ""; minAmount = ""; maxUses = ""; reload(); AppState.notify("Code created") }
                            .onFailure { AppState.notify(it.message ?: "Could not create code") }
                    }
                }
            }
        }
        items(coupons, key = { it.id }) { c ->
            GlassCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(c.code, color = DC.Text, style = MaterialTheme.typography.titleMedium)
                        Text(
                            "${if (c.kind == "percent") "${c.value}% off" else "${c.value} off"} · used ${c.uses_count}${c.max_uses?.let { "/$it" } ?: ""}",
                            color = DC.Muted, style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    Pill(if (c.active) "ACTIVE" else "OFF", if (c.active) DC.Mint else DC.Muted)
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    GhostButton(if (c.active) "Disable" else "Enable", Modifier.weight(1f)) {
                        scope.launch {
                            runCatching { Repo.saveCoupon(c.copy(active = !c.active), false) }
                                .onSuccess { reload() }
                                .onFailure { AppState.notify(it.message ?: "Update failed") }
                        }
                    }
                    GhostButton("Delete", Modifier.weight(1f)) {
                        scope.launch {
                            runCatching { Repo.deleteCoupon(c.id) }.onSuccess { reload() }
                                .onFailure { AppState.notify(it.message ?: "Delete failed") }
                        }
                    }
                }
            }
        }
    }
}

// ----------------------------------------------------------------- requests

@Composable
private fun AdminRequests() {
    val scope = rememberCoroutineScope()
    var requests by remember { mutableStateOf<List<ProductRequest>>(emptyList()) }
    var replies by remember { mutableStateOf(mapOf<String, String>()) }

    suspend fun reload() { runCatching { requests = Repo.allRequests() } }
    LaunchedEffect(Unit) { reload() }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (requests.isEmpty()) item { EmptyState("No requests", "Customer product demands appear here.") }
        items(requests, key = { it.id }) { r ->
            GlassCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(r.product_name, color = DC.Text, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    Pill(r.status.uppercase(), DC.Cyan)
                }
                if (!r.details.isNullOrBlank()) Text(r.details, color = DC.Muted, style = MaterialTheme.typography.bodySmall)
                if (!r.contact.isNullOrBlank()) Text("Contact: ${r.contact}", color = DC.Muted, style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(8.dp))
                Field(replies[r.id].orEmpty(), { replies = replies + (r.id to it) }, "Your reply")
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    GradientButton("Respond", Modifier.weight(1f)) {
                        scope.launch {
                            runCatching { Repo.respondRequest(r.id, replies[r.id].orEmpty(), "responded") }
                                .onSuccess { reload(); AppState.notify("Reply sent") }
                                .onFailure { AppState.notify(it.message ?: "Failed") }
                        }
                    }
                    GhostButton("Fulfilled", Modifier.weight(1f)) {
                        scope.launch {
                            runCatching { Repo.respondRequest(r.id, replies[r.id].orEmpty(), "fulfilled") }
                                .onSuccess { reload() }
                                .onFailure { AppState.notify(it.message ?: "Failed") }
                        }
                    }
                }
            }
        }
    }
}

// -------------------------------------------------------------------- users

@Composable
private fun AdminUsers() {
    var users by remember { mutableStateOf<List<AdminUser>>(emptyList()) }
    var query by remember { mutableStateOf("") }
    LaunchedEffect(Unit) { runCatching { users = Repo.users() } }
    val visible = users.filter {
        query.isBlank() || it.email?.contains(query, true) == true || it.full_name?.contains(query, true) == true
    }
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { Field(query, { query = it }, "Search users") }
        items(visible, key = { it.user_id }) { u ->
            GlassCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(u.full_name ?: u.email.orEmpty(), color = DC.Text, style = MaterialTheme.typography.titleMedium)
                        Text(u.email.orEmpty(), color = DC.Muted, style = MaterialTheme.typography.bodySmall)
                        if (!u.phone.isNullOrBlank()) Text(u.phone, color = DC.Muted, style = MaterialTheme.typography.bodySmall)
                        Text(
                            "${u.order_count} orders · spent ${u.total_spent}",
                            color = DC.Muted, style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    if (u.is_admin) Pill("ADMIN", DC.Gold)
                }
            }
        }
    }
}

// ------------------------------------------------------------------- admins

@Composable
private fun AdminAdmins() {
    val scope = rememberCoroutineScope()
    var admins by remember { mutableStateOf<List<AdminRow>>(emptyList()) }
    var email by remember { mutableStateOf("") }

    suspend fun reload() { runCatching { admins = Repo.admins() } }
    LaunchedEffect(Unit) { reload() }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (AppState.isSuper.value) {
            item {
                GlassCard {
                    Text("Invite an admin", color = DC.Text, style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))
                    Field(email, { email = it }, "Email")
                    Spacer(Modifier.height(10.dp))
                    GradientButton("Send invite", Modifier.fillMaxWidth(), enabled = email.contains("@")) {
                        scope.launch {
                            runCatching { Repo.inviteAdmin(email) }
                                .onSuccess { email = ""; reload(); AppState.notify("Invite recorded") }
                                .onFailure { AppState.notify(it.message ?: "Invite failed") }
                        }
                    }
                }
            }
        }
        items(admins, key = { it.user_id }) { a ->
            GlassCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(a.email.orEmpty(), color = DC.Text, modifier = Modifier.weight(1f))
                    Pill(if (a.is_super) "SUPER" else "ADMIN", if (a.is_super) DC.Gold else DC.Cyan)
                }
                if (AppState.isSuper.value && !a.is_super) {
                    Spacer(Modifier.height(8.dp))
                    GhostButton("Remove admin", Modifier.fillMaxWidth()) {
                        scope.launch {
                            runCatching { Repo.revokeAdmin(a.user_id) }
                                .onSuccess { reload(); AppState.notify("Removed") }
                                .onFailure { AppState.notify(it.message ?: "Failed") }
                        }
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------- analytics

@Composable
private fun AdminAnalytics() {
    var stats by remember { mutableStateOf<JsonObject?>(null) }
    var visits by remember { mutableStateOf<JsonObject?>(null) }
    LaunchedEffect(Unit) {
        runCatching { stats = Repo.salesStats() }
        runCatching { visits = Repo.visitorStats() }
    }
    fun num(o: JsonObject?, key: String): String =
        runCatching { o?.get(key)?.jsonPrimitive?.content ?: "0" }.getOrDefault("0")

    Screen {
        SectionTitle("Sales", "Approved orders only")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatBox("Revenue USD", num(stats, "total_revenue_usd"), Modifier.weight(1f))
            StatBox("Revenue PKR", num(stats, "total_revenue_pkr"), Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatBox("Orders", num(stats, "total_orders"), Modifier.weight(1f))
            StatBox("Pending", num(stats, "pending_orders"), Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatBox("Last 7 days", num(stats, "orders_7d"), Modifier.weight(1f))
            StatBox("Last 30 days", num(stats, "orders_30d"), Modifier.weight(1f))
        }
        SectionTitle("Visitors", "Lifetime tracking")
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatBox("Total visits", num(visits, "total_visits"), Modifier.weight(1f))
            StatBox("Unique", num(visits, "unique_visitors"), Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatBox("Today", num(visits, "visits_today"), Modifier.weight(1f))
            StatBox("30 days", num(visits, "visits_30d"), Modifier.weight(1f))
        }
    }
}

@Composable
private fun StatBox(label: String, value: String, modifier: Modifier = Modifier) {
    GlassCard(modifier) {
        Text(label, color = DC.Muted, style = MaterialTheme.typography.bodySmall)
        Text(value, color = DC.Gold, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
    }
}

// ---------------------------------------------------------------- broadcast

@Composable
private fun AdminBroadcast() {
    val scope = rememberCoroutineScope()
    var message by remember { mutableStateOf("") }
    var kind by remember { mutableStateOf("info") }

    Screen {
        SectionTitle("Broadcast", "Shows as a banner for everyone")
        GlassCard {
            Field(message, { message = it }, "Message", singleLine = false, minLines = 3)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("info", "success", "warning").forEach { k ->
                    val on = k == kind
                    Text(
                        k, color = if (on) Color.Black else DC.Muted,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (on) DC.Gold else DC.Glass)
                            .clickable { kind = k }
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            GradientButton("Send broadcast", Modifier.fillMaxWidth(), enabled = message.isNotBlank()) {
                scope.launch {
                    runCatching { Repo.sendBroadcast(message, kind) }
                        .onSuccess { message = ""; AppState.refreshAll(); AppState.notify("Broadcast live") }
                        .onFailure { AppState.notify(it.message ?: "Failed") }
                }
            }
            Spacer(Modifier.height(8.dp))
            GhostButton("Stop all broadcasts", Modifier.fillMaxWidth()) {
                scope.launch {
                    runCatching { Repo.stopBroadcasts() }
                        .onSuccess { AppState.broadcast.value = null; AppState.notify("Cleared") }
                        .onFailure { AppState.notify(it.message ?: "Failed") }
                }
            }
        }
    }
}
