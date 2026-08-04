package store.digitalchacho.nativeapp.core

import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** Every read is snapshot-backed, so the store works with no connection. */
object Repo {

    private inline fun <reified T> decodeList(raw: String, serializer: kotlinx.serialization.KSerializer<T>): List<T> =
        runCatching { Api.json.decodeFromString(ListSerializer(serializer), raw) }.getOrDefault(emptyList())

    // -------------------------------------------------------------- catalogue

    suspend fun products(): List<Product> {
        val raw = Api.cachedSelect("products", "products", "select=*&order=created_at.desc")
        return decodeList(raw, Product.serializer())
    }

    suspend fun posts(): List<Post> {
        val raw = Api.cachedSelect(
            "posts", "posts",
            "select=*&published=eq.true&order=pinned.desc,created_at.desc&limit=40"
        )
        return decodeList(raw, Post.serializer())
    }

    suspend fun paymentMethods(): List<PaymentMethod> {
        val raw = Api.cachedSelect(
            "payment_methods", "payment_methods",
            "select=*&active=eq.true&order=sort_order.asc"
        )
        return decodeList(raw, PaymentMethod.serializer())
    }

    suspend fun reviews(productId: String): List<Review> {
        val raw = Api.cachedSelect(
            "reviews_$productId", "product_reviews",
            "select=*&product_id=eq.$productId&order=created_at.desc"
        )
        return decodeList(raw, Review.serializer())
    }

    suspend fun addReview(productId: String, rating: Int, title: String, body: String) {
        val uid = Session.userId ?: throw ApiException("Sign in required")
        Api.insert("product_reviews", buildJsonArray {
            add(buildJsonObject {
                put("product_id", JsonPrimitive(productId))
                put("user_id", JsonPrimitive(uid))
                put("rating", JsonPrimitive(rating))
                put("title", JsonPrimitive(title.ifBlank { null }))
                put("body", JsonPrimitive(body.ifBlank { null }))
            })
        })
    }

    suspend fun recentPurchases(): List<RecentPurchase> {
        if (!Api.isOnline()) return decodeList(Cache.read("ticker") ?: "[]", RecentPurchase.serializer())
        return runCatching {
            val raw = Api.rpc("recent_purchases_public")
            Cache.write("ticker", raw)
            decodeList(raw, RecentPurchase.serializer())
        }.getOrElse { decodeList(Cache.read("ticker") ?: "[]", RecentPurchase.serializer()) }
    }

    suspend fun broadcast(): Broadcast? {
        val raw = Api.cachedSelect(
            "broadcast", "broadcasts",
            "select=*&active=eq.true&order=created_at.desc&limit=1"
        )
        return decodeList(raw, Broadcast.serializer()).firstOrNull()
    }

    // ------------------------------------------------------------------ user

    suspend fun myOrders(): List<Order> {
        val uid = Session.userId ?: return emptyList()
        val raw = Api.cachedSelect(
            "orders", "orders",
            "select=*&buyer_id=eq.$uid&order=created_at.desc"
        )
        return decodeList(raw, Order.serializer())
    }

    suspend fun deleteOrder(id: String) { Api.delete("orders", "id=eq.$id") }

    suspend fun myRequests(): List<ProductRequest> {
        val uid = Session.userId ?: return emptyList()
        val raw = Api.cachedSelect(
            "requests", "product_requests",
            "select=*&user_id=eq.$uid&order=created_at.desc"
        )
        return decodeList(raw, ProductRequest.serializer())
    }

    suspend fun createRequest(name: String, details: String, link: String, contact: String) {
        val uid = Session.userId ?: throw ApiException("Sign in required")
        Api.insert("product_requests", buildJsonArray {
            add(buildJsonObject {
                put("user_id", JsonPrimitive(uid))
                put("product_name", JsonPrimitive(name))
                put("details", JsonPrimitive(details.ifBlank { null }))
                put("reference_link", JsonPrimitive(link.ifBlank { null }))
                put("contact", JsonPrimitive(contact.ifBlank { null }))
            })
        })
    }

    suspend fun wishlist(): Set<String> {
        val uid = Session.userId ?: return emptySet()
        val raw = Api.cachedSelect("wishlist", "wishlists", "select=product_id&user_id=eq.$uid")
        return runCatching {
            Api.json.parseToJsonElement(raw).jsonArray
                .mapNotNull { it.jsonObject["product_id"]?.jsonPrimitive?.content }.toSet()
        }.getOrDefault(emptySet())
    }

    suspend fun toggleWishlist(productId: String, add: Boolean) {
        val uid = Session.userId ?: throw ApiException("Sign in required")
        if (add) {
            Api.upsert("wishlists", buildJsonArray {
                add(buildJsonObject {
                    put("user_id", JsonPrimitive(uid))
                    put("product_id", JsonPrimitive(productId))
                })
            })
        } else {
            Api.delete("wishlists", "user_id=eq.$uid&product_id=eq.$productId")
        }
    }

    suspend fun loyaltyPoints(): Int {
        val uid = Session.userId ?: return 0
        val raw = Api.cachedSelect("loyalty", "loyalty_points", "select=points&user_id=eq.$uid")
        return runCatching {
            Api.json.parseToJsonElement(raw).jsonArray.firstOrNull()
                ?.jsonObject?.get("points")?.jsonPrimitive?.content?.toIntOrNull() ?: 0
        }.getOrDefault(0)
    }

    // -------------------------------------------------------------- checkout

    suspend fun applyCoupon(code: String, subtotal: Double, currency: String): CouponResult {
        val raw = Api.rpc("apply_coupon", buildJsonObject {
            put("_code", JsonPrimitive(code))
            put("_subtotal", JsonPrimitive(subtotal))
            put("_currency", JsonPrimitive(currency))
        })
        val row = Api.json.parseToJsonElement(raw).jsonArray.firstOrNull()?.jsonObject
            ?: throw ApiException("Invalid code")
        return CouponResult(
            row["code"]?.jsonPrimitive?.content ?: code,
            row["kind"]?.jsonPrimitive?.content ?: "percent",
            row["value"]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 0.0,
            row["discount"]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 0.0,
        )
    }

    suspend fun placeOrder(
        lines: List<CartLine>,
        currency: String,
        method: PaymentMethod?,
        senderName: String,
        senderContact: String,
        transactionRef: String,
        proofPath: String?,
        couponCode: String?,
        discount: Double,
    ): List<String> {
        val uid = Session.userId ?: throw ApiException("Sign in required")
        val ids = mutableListOf<String>()
        var remainingDiscount = discount
        for (line in lines) {
            val unit = Price.of(line.product, currency)
            val gross = unit * line.qty
            val applied = minOf(remainingDiscount, gross)
            remainingDiscount -= applied
            val payload = buildJsonArray {
                add(buildJsonObject {
                    put("buyer_id", JsonPrimitive(uid))
                    put("item_kind", JsonPrimitive("product"))
                    put("item_id", JsonPrimitive(line.product.id))
                    put("item_name", JsonPrimitive(line.product.name))
                    put("amount", JsonPrimitive(gross - applied))
                    put("currency", JsonPrimitive(currency))
                    put("quantity", JsonPrimitive(line.qty))
                    put("sender_name", JsonPrimitive(senderName))
                    put("sender_contact", JsonPrimitive(senderContact))
                    put("transaction_ref", JsonPrimitive(transactionRef.ifBlank { null }))
                    put("proof_path", JsonPrimitive(proofPath))
                    put("payment_method_id", JsonPrimitive(method?.id))
                    put("payment_method_label", JsonPrimitive(method?.label))
                    put("coupon_code", JsonPrimitive(couponCode))
                    put("discount_amount", JsonPrimitive(applied))
                })
            }
            val res = Api.insert("orders", payload)
            runCatching {
                Api.json.parseToJsonElement(res).jsonArray.firstOrNull()
                    ?.jsonObject?.get("id")?.jsonPrimitive?.content
            }.getOrNull()?.let { ids.add(it) }
        }
        if (!couponCode.isNullOrBlank()) {
            runCatching { Api.rpc("redeem_coupon", buildJsonObject { put("_code", JsonPrimitive(couponCode)) }) }
        }
        return ids
    }

    suspend fun claimFree(productId: String): Triple<String?, Boolean, Boolean> {
        val raw = Api.rpc("claim_free_product", buildJsonObject { put("_product_id", JsonPrimitive(productId)) })
        val row = Api.json.parseToJsonElement(raw).jsonArray.firstOrNull()?.jsonObject
        return Triple(
            row?.get("order_id")?.jsonPrimitive?.contentOrNull(),
            row?.get("already_owned")?.jsonPrimitive?.content == "true",
            row?.get("out_of_stock")?.jsonPrimitive?.content == "true",
        )
    }

    private fun JsonPrimitive.contentOrNull(): String? =
        runCatching { if (content == "null") null else content }.getOrNull()

    suspend fun uploadProof(bytes: ByteArray, mime: String): String {
        val uid = Session.userId ?: throw ApiException("Sign in required")
        val ext = if (mime.contains("png")) "png" else "jpg"
        val path = "$uid/${System.currentTimeMillis()}.$ext"
        return Api.uploadBytes("payment-proofs", path, bytes, mime)
    }

    // ----------------------------------------------------------------- admin

    suspend fun allOrders(status: String?): List<Order> {
        val filter = if (status == null) "" else "&status=eq.$status"
        val raw = Api.select("orders", "select=*&order=created_at.desc&limit=200$filter")
        return decodeList(raw, Order.serializer())
    }

    suspend fun approveOrder(id: String, note: String): Pair<Boolean, Boolean> {
        val raw = Api.rpc("approve_order", buildJsonObject {
            put("_order_id", JsonPrimitive(id))
            put("_note", JsonPrimitive(note.ifBlank { null }))
        })
        val row = Api.json.parseToJsonElement(raw).jsonArray.firstOrNull()?.jsonObject
        return Pair(
            row?.get("delivered")?.jsonPrimitive?.content == "true",
            row?.get("out_of_stock")?.jsonPrimitive?.content == "true",
        )
    }

    suspend fun rejectOrder(id: String, note: String) {
        Api.update("orders", "id=eq.$id", buildJsonObject {
            put("status", JsonPrimitive("rejected"))
            put("admin_note", JsonPrimitive(note.ifBlank { null }))
            put("reviewed_by", JsonPrimitive(Session.userId))
        })
    }

    suspend fun saveProduct(p: Product, isNew: Boolean) {
        val payload = buildJsonObject {
            put("id", JsonPrimitive(p.id))
            put("code", JsonPrimitive(p.code.ifBlank { p.id.uppercase() }))
            put("name", JsonPrimitive(p.name))
            put("tagline", JsonPrimitive(p.tagline))
            put("description", JsonPrimitive(p.description))
            put("category", JsonPrimitive(p.category.ifBlank { "general" }))
            put("image", JsonPrimitive(p.image))
            put("price", JsonPrimitive(p.price_usd ?: 0.0))
            put("price_usd", JsonPrimitive(p.price_usd))
            put("price_pkr", JsonPrimitive(p.price_pkr))
            put("is_free", JsonPrimitive(p.is_free))
            put("delivery_instructions", JsonPrimitive(p.delivery_instructions))
        }
        if (isNew) Api.insert("products", buildJsonArray { add(payload) })
        else Api.update("products", "id=eq.${p.id}", payload)
    }

    suspend fun deleteProduct(id: String) { Api.delete("products", "id=eq.$id") }

    suspend fun stockItems(productId: String): List<StockItem> {
        val raw = Api.select(
            "product_stock_items",
            "select=*&product_id=eq.$productId&order=created_at.asc"
        )
        return decodeList(raw, StockItem.serializer())
    }

    suspend fun addStock(productId: String, lines: List<String>) {
        val payload = buildJsonArray {
            lines.filter { it.isNotBlank() }.forEach { line ->
                add(buildJsonObject {
                    put("product_id", JsonPrimitive(productId))
                    put("content", JsonPrimitive(line.trim()))
                    put("created_by", JsonPrimitive(Session.userId))
                })
            }
        }
        Api.insert("product_stock_items", payload, returning = false)
    }

    suspend fun deleteStock(id: String) { Api.delete("product_stock_items", "id=eq.$id") }

    suspend fun allPosts(): List<Post> {
        val raw = Api.select("posts", "select=*&order=created_at.desc")
        return decodeList(raw, Post.serializer())
    }

    suspend fun savePost(id: String?, title: String, body: String, category: String, link: String, image: String, pinned: Boolean) {
        val payload = buildJsonObject {
            put("title", JsonPrimitive(title))
            put("body", JsonPrimitive(body))
            put("category", JsonPrimitive(category))
            put("link", JsonPrimitive(link.ifBlank { null }))
            put("image", JsonPrimitive(image.ifBlank { null }))
            put("pinned", JsonPrimitive(pinned))
            put("published", JsonPrimitive(true))
            put("created_by", JsonPrimitive(Session.userId))
        }
        if (id == null) Api.insert("posts", buildJsonArray { add(payload) })
        else Api.update("posts", "id=eq.$id", payload)
    }

    suspend fun deletePost(id: String) { Api.delete("posts", "id=eq.$id") }

    suspend fun coupons(): List<Coupon> {
        val raw = Api.select("coupons", "select=*&order=created_at.desc")
        return decodeList(raw, Coupon.serializer())
    }

    suspend fun saveCoupon(c: Coupon, isNew: Boolean) {
        val payload = buildJsonObject {
            put("code", JsonPrimitive(c.code.trim()))
            put("kind", JsonPrimitive(c.kind))
            put("value", JsonPrimitive(c.value))
            put("currency", JsonPrimitive(c.currency?.ifBlank { null }))
            put("min_amount", JsonPrimitive(c.min_amount))
            put("max_uses", JsonPrimitive(c.max_uses))
            put("active", JsonPrimitive(c.active))
            put("note", JsonPrimitive(c.note?.ifBlank { null }))
        }
        if (isNew) Api.insert("coupons", buildJsonArray { add(payload) })
        else Api.update("coupons", "id=eq.${c.id}", payload)
    }

    suspend fun deleteCoupon(id: String) { Api.delete("coupons", "id=eq.$id") }

    suspend fun allRequests(): List<ProductRequest> {
        val raw = Api.select("product_requests", "select=*&order=created_at.desc")
        return decodeList(raw, ProductRequest.serializer())
    }

    suspend fun respondRequest(id: String, response: String, status: String) {
        Api.update("product_requests", "id=eq.$id", buildJsonObject {
            put("admin_response", JsonPrimitive(response))
            put("status", JsonPrimitive(status))
            put("responded_by", JsonPrimitive(Session.userId))
            put("responded_at", JsonPrimitive(nowIso()))
        })
    }

    suspend fun users(): List<AdminUser> = decodeList(Api.rpc("list_users"), AdminUser.serializer())

    suspend fun admins(): List<AdminRow> = decodeList(Api.rpc("list_admins"), AdminRow.serializer())

    suspend fun inviteAdmin(email: String) {
        Api.rpc("invite_admin_by_email", buildJsonObject { put("_email", JsonPrimitive(email.trim())) })
    }

    suspend fun revokeAdmin(userId: String) {
        Api.rpc("revoke_admin", buildJsonObject { put("_user_id", JsonPrimitive(userId)) })
    }

    suspend fun salesStats(): JsonObject =
        Api.json.parseToJsonElement(Api.rpc("admin_sales_stats")).jsonObject

    suspend fun visitorStats(): JsonObject? =
        runCatching {
            Api.json.parseToJsonElement(Api.rpc("visitor_stats")).jsonArray.firstOrNull()?.jsonObject
        }.getOrNull()

    suspend fun purchaseCounts(): Map<String, Long> = runCatching {
        Api.json.parseToJsonElement(Api.rpc("product_purchase_counts")).jsonArray.associate { el ->
            val o = el.jsonObject
            (o["product_id"]?.jsonPrimitive?.content ?: "") to
                (o["purchase_count"]?.jsonPrimitive?.content?.toLongOrNull() ?: 0L)
        }
    }.getOrDefault(emptyMap())

    suspend fun sendBroadcast(message: String, kind: String) {
        Api.insert("broadcasts", buildJsonArray {
            add(buildJsonObject {
                put("message", JsonPrimitive(message))
                put("kind", JsonPrimitive(kind))
                put("created_by", JsonPrimitive(Session.userId))
            })
        }, returning = false)
    }

    suspend fun stopBroadcasts() {
        Api.update("broadcasts", "active=eq.true", buildJsonObject { put("active", JsonPrimitive(false)) })
    }

    suspend fun recordVisit(visitorKey: String) {
        runCatching {
            Api.rpc("record_site_visit", buildJsonObject {
                put("_visitor_key", JsonPrimitive(visitorKey))
                put("_path", JsonPrimitive("android-native"))
                put("_user_agent", JsonPrimitive("DigitalChachoNative/2.0"))
            })
        }
    }

    private fun nowIso(): String {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US)
        sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
        return sdf.format(java.util.Date())
    }
}

object Price {
    fun of(p: Product, currency: String): Double =
        if (p.is_free) 0.0
        else if (currency == "PKR") (p.price_pkr ?: p.price_usd?.times(280.0) ?: 0.0)
        else (p.price_usd ?: p.price_pkr?.div(280.0) ?: 0.0)

    fun format(amount: Double, currency: String): String =
        if (currency == "PKR") "Rs " + String.format(java.util.Locale.US, "%,.0f", amount)
        else "$" + String.format(java.util.Locale.US, "%,.2f", amount)

    fun label(p: Product, currency: String): String =
        if (p.is_free) "Free" else format(of(p, currency), currency)
}
