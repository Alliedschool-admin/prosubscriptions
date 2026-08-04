package store.digitalchacho.nativeapp.core

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class ApiException(message: String) : Exception(message)

object Api {
    val json = Json { ignoreUnknownKeys = true; encodeDefaults = true; explicitNulls = false }
    private val JSON_MEDIA = "application/json".toMediaType()

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private var ctx: Context? = null
    fun init(c: Context) { ctx = c.applicationContext }

    fun isOnline(): Boolean {
        val cm = ctx?.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return true
        val caps = cm.getNetworkCapabilities(cm.activeNetwork) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    // ---------------------------------------------------------------- raw HTTP

    private suspend fun exec(req: Request): String = withContext(Dispatchers.IO) {
        client.newCall(req).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) throw ApiException(readableError(body, res.code))
            body
        }
    }

    private fun readableError(body: String, code: Int): String {
        val parsed = runCatching { json.parseToJsonElement(body).jsonObject }.getOrNull()
        val msg = parsed?.get("message")?.jsonPrimitive?.contentOrNullSafe()
            ?: parsed?.get("error_description")?.jsonPrimitive?.contentOrNullSafe()
            ?: parsed?.get("msg")?.jsonPrimitive?.contentOrNullSafe()
            ?: parsed?.get("error")?.jsonPrimitive?.contentOrNullSafe()
        val errorCode = parsed?.get("error_code")?.jsonPrimitive?.contentOrNullSafe()
        val friendly = when {
            errorCode == "invalid_credentials" || msg?.contains("Invalid login", true) == true ->
                "Wrong email or password. Check both and try again."
            errorCode == "email_not_confirmed" || msg?.contains("not confirmed", true) == true ->
                "Confirm your email first — open the link we sent you, then sign in."
            errorCode == "user_already_exists" || msg?.contains("already registered", true) == true ->
                "That email already has an account — sign in instead."
            errorCode == "weak_password" -> "Password too weak. Use at least 6 characters."
            errorCode == "over_email_send_rate_limit" || code == 429 ->
                "Too many attempts. Wait a minute and try again."
            code == 401 || code == 403 -> msg ?: "Not allowed. Please try again."
            else -> msg
        }
        return friendly ?: "Request failed ($code)"
    }

    private fun JsonPrimitive.contentOrNullSafe(): String? = runCatching { content }.getOrNull()

    private fun builder(url: String, auth: Boolean = true): Request.Builder {
        val b = Request.Builder().url(url)
            .header("apikey", Env.SUPABASE_KEY)
            .header("Content-Type", "application/json")
        val token = if (auth) Session.accessToken else null
        b.header("Authorization", "Bearer " + (token ?: Env.SUPABASE_KEY))
        return b
    }

    private fun body(element: JsonElement): RequestBody =
        element.toString().toRequestBody(JSON_MEDIA)

    // ------------------------------------------------------------------- auth

    private fun storeSession(payload: JsonObject) {
        val access = payload["access_token"]?.jsonPrimitive?.contentOrNullSafe()
        val refresh = payload["refresh_token"]?.jsonPrimitive?.contentOrNullSafe()
        if (access.isNullOrBlank()) throw ApiException("Sign-in did not return a session. Try again.")
        Session.accessToken = access
        Session.refreshToken = refresh
        val expiresIn = payload["expires_in"]?.jsonPrimitive?.content?.toLongOrNull() ?: 3600
        Session.expiresAt = System.currentTimeMillis() / 1000 + expiresIn
        val user = payload["user"]?.jsonObject
        Session.userId = user?.get("id")?.jsonPrimitive?.content
        Session.email = user?.get("email")?.jsonPrimitive?.contentOrNullSafe()
        Session.fullName = user?.get("user_metadata")?.jsonObject
            ?.get("full_name")?.jsonPrimitive?.contentOrNullSafe()
    }

    suspend fun signIn(email: String, password: String) {
        val res = exec(
            builder("${Env.authUrl}/token?grant_type=password", auth = false)
                .post(body(buildJsonObject {
                    put("email", JsonPrimitive(email.trim().lowercase()))
                    put("password", JsonPrimitive(password))
                })).build()
        )
        storeSession(json.parseToJsonElement(res).jsonObject)
        refreshRole()
    }

    /** Returns true when a session was created (auto-confirm), false when email confirmation is needed. */
    suspend fun signUp(email: String, password: String, fullName: String): Boolean {
        val clean = email.trim().lowercase()
        val res = exec(
            builder(
                "${Env.authUrl}/signup?redirect_to=" + java.net.URLEncoder.encode("${Env.SITE_URL}/auth", "UTF-8"),
                auth = false,
            )
                .post(body(buildJsonObject {
                    put("email", JsonPrimitive(clean))
                    put("password", JsonPrimitive(password))
                    put("data", buildJsonObject { put("full_name", JsonPrimitive(fullName)) })
                })).build()
        )
        val obj = json.parseToJsonElement(res).jsonObject
        if (obj["access_token"] != null) {
            storeSession(obj); refreshRole(); return true
        }
        // GoTrue returns an obfuscated user (empty identities) when the email already exists.
        val identities = obj["identities"] ?: obj["user"]?.jsonObject?.get("identities")
        if (identities != null && identities.toString() == "[]") {
            throw ApiException("That email already has an account — sign in or reset your password.")
        }
        return false
    }

    suspend fun resetPassword(email: String) {
        exec(
            builder(
                "${Env.authUrl}/recover?redirect_to=" +
                    java.net.URLEncoder.encode("${Env.SITE_URL}/reset-password", "UTF-8"),
                auth = false,
            )
                .post(body(buildJsonObject { put("email", JsonPrimitive(email.trim().lowercase())) })).build()
        )
    }

    // ------------------------------------------------------------- google (PKCE)

    /** Builds the Google consent URL and stores the PKCE verifier for the callback. */
    fun googleAuthUrl(): String {
        val verifier = Pkce.newVerifier()
        Session.codeVerifier = verifier
        val challenge = Pkce.challenge(verifier)
        val redirect = java.net.URLEncoder.encode(Env.REDIRECT_SCHEME, "UTF-8")
        return "${Env.authUrl}/authorize?provider=google&redirect_to=$redirect" +
            "&code_challenge=$challenge&code_challenge_method=s256"
    }

    /** Exchanges the ?code= returned to the app deep link for a session. */
    suspend fun sessionFromCode(code: String) {
        val verifier = Session.codeVerifier
            ?: throw ApiException("Sign-in session expired — start Google sign-in again.")
        val res = exec(
            builder("${Env.authUrl}/token?grant_type=pkce", auth = false)
                .post(body(buildJsonObject {
                    put("auth_code", JsonPrimitive(code))
                    put("code_verifier", JsonPrimitive(verifier))
                })).build()
        )
        Session.codeVerifier = null
        storeSession(json.parseToJsonElement(res).jsonObject)
        refreshRole()
    }

    /** Exchange an OAuth refresh token (deep link from the browser flow) for a session. */
    suspend fun sessionFromRefreshToken(refresh: String) {
        val res = exec(
            builder("${Env.authUrl}/token?grant_type=refresh_token", auth = false)
                .post(body(buildJsonObject { put("refresh_token", JsonPrimitive(refresh)) })).build()
        )
        storeSession(json.parseToJsonElement(res).jsonObject)
        refreshRole()
    }

    suspend fun ensureFreshToken() {
        val refresh = Session.refreshToken ?: return
        if (Session.expiresAt - 60 > System.currentTimeMillis() / 1000) return
        if (!isOnline()) return
        runCatching { sessionFromRefreshToken(refresh) }
    }

    suspend fun signOut() {
        runCatching {
            if (isOnline() && Session.accessToken != null) {
                exec(builder("${Env.authUrl}/logout").post(body(buildJsonObject { })).build())
            }
        }
        Session.clear()
        Cache.clearUserData()
    }

    suspend fun refreshRole() {
        val uid = Session.userId ?: return
        runCatching {
            val rows = select("user_roles", "select=role&user_id=eq.$uid")
            val roles = json.parseToJsonElement(rows).let { el ->
                el.toString()
            }
            Session.isAdmin = roles.contains("\"admin\"") || roles.contains("\"super_admin\"")
            Session.isSuperAdmin = roles.contains("\"super_admin\"")
        }
    }

    // ------------------------------------------------------------------- rest

    /** Cached GET: returns fresh JSON when online, the stored snapshot otherwise. */
    suspend fun cachedSelect(cacheKey: String, table: String, query: String): String {
        if (!isOnline()) return Cache.read(cacheKey) ?: "[]"
        return try {
            val fresh = select(table, query)
            Cache.write(cacheKey, fresh)
            fresh
        } catch (e: Exception) {
            Cache.read(cacheKey) ?: throw e
        }
    }

    suspend fun select(table: String, query: String): String =
        exec(builder("${Env.rest}/$table?$query").get().build())

    suspend fun insert(table: String, payload: JsonElement, returning: Boolean = true): String =
        exec(
            builder("${Env.rest}/$table")
                .header("Prefer", if (returning) "return=representation" else "return=minimal")
                .post(body(payload)).build()
        )

    suspend fun upsert(table: String, payload: JsonElement): String =
        exec(
            builder("${Env.rest}/$table")
                .header("Prefer", "resolution=merge-duplicates,return=representation")
                .post(body(payload)).build()
        )

    suspend fun update(table: String, filter: String, payload: JsonElement): String =
        exec(
            builder("${Env.rest}/$table?$filter")
                .header("Prefer", "return=representation")
                .patch(body(payload)).build()
        )

    suspend fun delete(table: String, filter: String): String =
        exec(builder("${Env.rest}/$table?$filter").delete().build())

    suspend fun rpc(fn: String, args: JsonObject = buildJsonObject { }): String =
        exec(builder("${Env.rest}/rpc/$fn").post(body(args)).build())

    // ---------------------------------------------------------------- storage

    /** Signed read URL for a private bucket object. */
    suspend fun signedUrl(bucket: String, path: String, seconds: Int = 3600): String? {
        if (path.isBlank()) return null
        return runCatching {
            val res = exec(
                builder("${Env.storage}/object/sign/$bucket/$path")
                    .post(body(buildJsonObject { put("expiresIn", JsonPrimitive(seconds)) })).build()
            )
            val signed = json.parseToJsonElement(res).jsonObject["signedURL"]?.jsonPrimitive?.content
            signed?.let { Env.storage.removeSuffix("/storage/v1") + "/storage/v1" + it.removePrefix("/storage/v1") }
        }.getOrNull()
    }

    suspend fun uploadBytes(bucket: String, path: String, bytes: ByteArray, mime: String): String {
        exec(
            Request.Builder().url("${Env.storage}/object/$bucket/$path")
                .header("apikey", Env.SUPABASE_KEY)
                .header("Authorization", "Bearer " + (Session.accessToken ?: Env.SUPABASE_KEY))
                .header("x-upsert", "true")
                .post(bytes.toRequestBody(mime.toMediaType())).build()
        )
        return path
    }
}
