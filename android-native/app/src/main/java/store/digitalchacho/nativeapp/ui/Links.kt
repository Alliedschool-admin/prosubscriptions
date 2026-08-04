package store.digitalchacho.nativeapp.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import store.digitalchacho.nativeapp.core.Env

fun openUrl(ctx: Context, url: String) {
    runCatching {
        ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }.onFailure { Toast.makeText(ctx, "No app can open this link", Toast.LENGTH_SHORT).show() }
}

fun pingWhatsApp(ctx: Context, message: String) {
    openUrl(ctx, "https://wa.me/${Env.WHATSAPP_NUMBER}?text=" + Uri.encode(message))
}
