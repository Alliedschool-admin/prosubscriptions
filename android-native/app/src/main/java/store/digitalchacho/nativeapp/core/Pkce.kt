package store.digitalchacho.nativeapp.core

import android.util.Base64
import java.security.MessageDigest
import java.security.SecureRandom

/** Minimal PKCE helper for the Supabase OAuth code flow. */
object Pkce {
    private fun b64(bytes: ByteArray): String =
        Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)

    fun newVerifier(): String {
        val bytes = ByteArray(64)
        SecureRandom().nextBytes(bytes)
        return b64(bytes)
    }

    fun challenge(verifier: String): String =
        b64(MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray(Charsets.US_ASCII)))
}
