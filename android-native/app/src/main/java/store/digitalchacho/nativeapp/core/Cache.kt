package store.digitalchacho.nativeapp.core

import android.content.Context
import java.io.File

/**
 * Offline-first snapshot store. Every remote read is written here as raw JSON,
 * so the whole store renders from disk with no connection at all.
 */
object Cache {
    private lateinit var dir: File
    private lateinit var appCtx: Context

    fun init(ctx: Context) {
        appCtx = ctx.applicationContext
        dir = File(ctx.filesDir, "snapshot").apply { mkdirs() }
    }

    private fun file(key: String) = File(dir, key.replace(Regex("[^A-Za-z0-9_.-]"), "_") + ".json")

    fun write(key: String, json: String) {
        runCatching { file(key).writeText(json) }
    }

    fun read(key: String): String? {
        val f = file(key)
        if (f.exists()) return runCatching { f.readText() }.getOrNull()
        // Fall back to the snapshot bundled inside the APK (works right after install).
        return runCatching {
            appCtx.assets.open("seed/${key}.json").bufferedReader().use { it.readText() }
        }.getOrNull()
    }

    fun has(key: String) = read(key) != null

    fun clearUserData() {
        listOf("orders", "requests", "wishlist", "loyalty").forEach { runCatching { file(it).delete() } }
    }
}
