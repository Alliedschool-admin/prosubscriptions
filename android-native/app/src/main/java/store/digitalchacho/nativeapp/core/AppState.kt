package store.digitalchacho.nativeapp.core

import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Single source of truth for the whole app. Snapshot-backed reads mean the first
 * frame after launch already has content, with a silent refresh when online.
 */
object AppState {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    val products = mutableStateOf<List<Product>>(emptyList())
    val posts = mutableStateOf<List<Post>>(emptyList())
    val orders = mutableStateOf<List<Order>>(emptyList())
    val requests = mutableStateOf<List<ProductRequest>>(emptyList())
    val paymentMethods = mutableStateOf<List<PaymentMethod>>(emptyList())
    val wishlist = mutableStateOf<Set<String>>(emptySet())
    val loyalty = mutableStateOf(0)
    val ticker = mutableStateOf<List<RecentPurchase>>(emptyList())
    val broadcast = mutableStateOf<Broadcast?>(null)

    val cart = mutableStateListOf<CartLine>()
    val currency = mutableStateOf("PKR")
    val online = mutableStateOf(true)
    val loading = mutableStateOf(false)
    val signedIn = mutableStateOf(false)
    val isAdmin = mutableStateOf(false)
    val isSuper = mutableStateOf(false)
    val toast = mutableStateOf<String?>(null)

    fun notify(msg: String) { toast.value = msg }

    fun syncAuthFlags() {
        signedIn.value = Session.signedIn
        isAdmin.value = Session.isAdmin
        isSuper.value = Session.isSuperAdmin
    }

    fun bootstrap() {
        online.value = Api.isOnline()
        syncAuthFlags()
        scope.launch {
            loading.value = true
            runCatching { if (Session.signedIn) Api.ensureFreshToken() }
            loadCatalogue()
            loading.value = false
            if (Session.signedIn) { runCatching { Api.refreshRole() }; syncAuthFlags(); loadUserData() }
            runCatching { Repo.recordVisit(deviceKey()) }
        }
    }

    private fun deviceKey(): String {
        val existing = Session.email ?: android.os.Build.MODEL
        return "android-" + existing.hashCode().toString()
    }

    fun refreshAll() {
        online.value = Api.isOnline()
        scope.launch {
            loadCatalogue()
            if (Session.signedIn) loadUserData()
        }
    }

    private suspend fun loadCatalogue() {
        runCatching { products.value = Repo.products() }
        runCatching { posts.value = Repo.posts() }
        runCatching { paymentMethods.value = Repo.paymentMethods() }
        runCatching { ticker.value = Repo.recentPurchases() }
        runCatching { broadcast.value = Repo.broadcast() }
    }

    fun loadUserData() {
        scope.launch {
            runCatching { orders.value = Repo.myOrders() }
            runCatching { requests.value = Repo.myRequests() }
            runCatching { wishlist.value = Repo.wishlist() }
            runCatching { loyalty.value = Repo.loyaltyPoints() }
        }
    }

    private suspend fun loadUserDataNow() {
        runCatching { orders.value = Repo.myOrders() }
        runCatching { requests.value = Repo.myRequests() }
        runCatching { wishlist.value = Repo.wishlist() }
        runCatching { loyalty.value = Repo.loyaltyPoints() }
    }

    suspend fun afterSignIn() {
        runCatching { Api.refreshRole() }
        syncAuthFlags()
        loadUserDataNow()
    }

    fun signOut() {
        scope.launch {
            runCatching { Api.signOut() }
            Cache.clearUserData()
            orders.value = emptyList()
            requests.value = emptyList()
            wishlist.value = emptySet()
            loyalty.value = 0
            cart.clear()
            syncAuthFlags()
            notify("Signed out")
        }
    }

    // ------------------------------------------------------------------- cart

    fun addToCart(p: Product, qty: Int = 1) {
        val i = cart.indexOfFirst { it.product.id == p.id }
        if (i >= 0) cart[i] = cart[i].copy(qty = cart[i].qty + qty) else cart.add(CartLine(p, qty))
        notify("${p.name} added to cart")
    }

    fun setQty(productId: String, qty: Int) {
        val i = cart.indexOfFirst { it.product.id == productId }
        if (i < 0) return
        if (qty <= 0) cart.removeAt(i) else cart[i] = cart[i].copy(qty = qty)
    }

    fun removeFromCart(productId: String) { cart.removeAll { it.product.id == productId } }

    fun subtotal(): Double = cart.sumOf { Price.of(it.product, currency.value) * it.qty }

    fun product(id: String): Product? = products.value.firstOrNull { it.id == id }

    fun toggleWishlist(id: String) {
        if (!Session.signedIn) { notify("Sign in to save favourites"); return }
        val add = !wishlist.value.contains(id)
        wishlist.value = if (add) wishlist.value + id else wishlist.value - id
        scope.launch {
            runCatching { Repo.toggleWishlist(id, add) }
                .onFailure { notify(it.message ?: "Could not update wishlist") }
        }
    }
}
