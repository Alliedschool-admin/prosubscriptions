package store.digitalchacho.nativeapp.core

import kotlinx.serialization.Serializable

@Serializable
data class Product(
    val id: String,
    val code: String = "",
    val name: String = "",
    val tagline: String = "",
    val description: String = "",
    val category: String = "",
    val image: String = "",
    val price_usd: Double? = null,
    val price_pkr: Double? = null,
    val available_stock: Int = 0,
    val is_free: Boolean = false,
    val delivery_instructions: String? = null,
    val created_at: String? = null,
)

@Serializable
data class Post(
    val id: String,
    val title: String = "",
    val body: String = "",
    val category: String = "update",
    val link: String? = null,
    val image: String? = null,
    val pinned: Boolean = false,
    val created_at: String? = null,
)

@Serializable
data class Order(
    val id: String,
    val buyer_id: String? = null,
    val item_kind: String = "product",
    val item_id: String = "",
    val item_name: String = "",
    val amount: Double = 0.0,
    val currency: String = "USD",
    val quantity: Int = 1,
    val status: String = "pending",
    val sender_name: String = "",
    val sender_contact: String = "",
    val transaction_ref: String? = null,
    val payment_method_label: String? = null,
    val admin_note: String? = null,
    val delivered_content: String? = null,
    val coupon_code: String? = null,
    val discount_amount: Double = 0.0,
    val created_at: String? = null,
)

@Serializable
data class PaymentMethod(
    val id: String,
    val kind: String = "other",
    val label: String = "",
    val account_name: String? = null,
    val account_number: String = "",
    val instructions: String? = null,
    val currency: String = "PKR",
    val active: Boolean = true,
    val sort_order: Int = 0,
)

@Serializable
data class Review(
    val id: String,
    val product_id: String = "",
    val user_id: String = "",
    val rating: Int = 5,
    val title: String? = null,
    val body: String? = null,
    val created_at: String? = null,
)

@Serializable
data class ProductRequest(
    val id: String,
    val user_id: String = "",
    val product_name: String = "",
    val details: String? = null,
    val reference_link: String? = null,
    val contact: String? = null,
    val status: String = "new",
    val admin_response: String? = null,
    val created_at: String? = null,
)

@Serializable
data class Coupon(
    val id: String,
    val code: String = "",
    val kind: String = "percent",
    val value: Double = 0.0,
    val currency: String? = null,
    val min_amount: Double = 0.0,
    val max_uses: Int? = null,
    val uses_count: Int = 0,
    val active: Boolean = true,
    val expires_at: String? = null,
    val note: String? = null,
)

@Serializable
data class Broadcast(
    val id: String,
    val message: String = "",
    val kind: String = "info",
    val active: Boolean = true,
    val created_at: String? = null,
)

@Serializable
data class AdminUser(
    val user_id: String,
    val email: String? = null,
    val phone: String? = null,
    val full_name: String? = null,
    val provider: String? = null,
    val created_at: String? = null,
    val last_sign_in_at: String? = null,
    val is_admin: Boolean = false,
    val order_count: Long = 0,
    val total_spent: Double = 0.0,
)

@Serializable
data class AdminRow(
    val user_id: String,
    val email: String? = null,
    val granted_at: String? = null,
    val is_super: Boolean = false,
)

@Serializable
data class StockItem(
    val id: String,
    val product_id: String = "",
    val content: String = "",
    val status: String = "available",
)

@Serializable
data class RecentPurchase(
    val id: String,
    val first_name: String = "Someone",
    val item_name: String = "",
    val created_at: String? = null,
)

@Serializable
data class WishlistRow(val user_id: String = "", val product_id: String = "")

@Serializable
data class LoyaltyRow(val user_id: String = "", val points: Int = 0)

@Serializable
data class SiteSetting(val key: String, val value: kotlinx.serialization.json.JsonElement)

data class CartLine(val product: Product, val qty: Int)

data class CouponResult(val code: String, val kind: String, val value: Double, val discount: Double)
