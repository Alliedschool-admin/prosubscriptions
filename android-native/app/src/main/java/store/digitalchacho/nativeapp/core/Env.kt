package store.digitalchacho.nativeapp.core

object Env {
    const val SUPABASE_URL = "https://rneslatbrqceffzgmiuk.supabase.co"
    const val SUPABASE_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZXNsYXRicnFjZWZmemdtaXVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTEyNzIsImV4cCI6MjA5OTE2NzI3Mn0.cY2aO4GrG8U7pmGCoSwYvYKO8Uq3NqtkjhFs5wBTo0s"

    const val SITE_URL = "https://www.digitalchacho.store"
    const val WHATSAPP_NUMBER = "923108411396"
    const val COMMUNITY_GROUP = "https://chat.whatsapp.com/JxpeRwwPP2wJJYfB4IqVi1"
    const val COMMUNITY_CHANNEL = "https://whatsapp.com/channel/0029Vb8Jo8F7YScvDSA5a13S"
    const val REDIRECT_SCHEME = "digitalchacho://auth"

    val rest get() = "$SUPABASE_URL/rest/v1"
    val authUrl get() = "$SUPABASE_URL/auth/v1"
    val storage get() = "$SUPABASE_URL/storage/v1"
}
