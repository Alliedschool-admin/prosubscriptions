package store.digitalchacho.nativeapp.ui

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/** Theme mode, persisted on device. "system" follows the OS setting. */
object ThemeMode {
    private var prefs: SharedPreferences? = null

    /** "dark" | "light" | "system" */
    val choice = mutableStateOf("dark")

    /** Resolved value used by the palette. Set by DigitalChachoTheme each composition. */
    val dark = mutableStateOf(true)

    fun init(ctx: Context) {
        prefs = ctx.getSharedPreferences("dc_theme", Context.MODE_PRIVATE)
        choice.value = prefs?.getString("mode", "dark") ?: "dark"
        dark.value = choice.value != "light"
    }

    fun set(mode: String) {
        choice.value = mode
        prefs?.edit()?.putString("mode", mode)?.apply()
    }

    fun toggle() = set(if (dark.value) "light" else "dark")
}

/**
 * Obsidian + aurora palette mirroring the web store, now theme-aware.
 * Every token is a snapshot-backed getter, so flipping the mode recomposes the app.
 */
object DC {
    private val isDark: Boolean get() = ThemeMode.dark.value

    // Brand accents stay constant across modes (slightly deepened in light mode for contrast).
    val Molten: Color get() = if (isDark) Color(0xFFFF7A18) else Color(0xFFE2620A)
    val Gold: Color get() = if (isDark) Color(0xFFFFC53D) else Color(0xFFC48F00)
    val Cyan: Color get() = if (isDark) Color(0xFF35E1F5) else Color(0xFF0891A6)
    val Violet: Color get() = if (isDark) Color(0xFF8B5CF6) else Color(0xFF6D3EE0)
    val Mint: Color get() = if (isDark) Color(0xFF3DDC97) else Color(0xFF0F9D63)
    val Danger: Color get() = if (isDark) Color(0xFFFF5A5F) else Color(0xFFD92D33)

    val Obsidian: Color get() = if (isDark) Color(0xFF07070B) else Color(0xFFF6F6FA)
    val Surface: Color get() = if (isDark) Color(0xFF101018) else Color(0xFFFFFFFF)
    val SurfaceAlt: Color get() = if (isDark) Color(0xFF16161F) else Color(0xFFEDEDF4)
    val Glass: Color get() = if (isDark) Color(0x14FFFFFF) else Color(0x0A0B1020)
    val Line: Color get() = if (isDark) Color(0x1FFFFFFF) else Color(0x1A0B1020)
    val Text: Color get() = if (isDark) Color(0xFFF3F4F8) else Color(0xFF14141C)
    val Muted: Color get() = if (isDark) Color(0xFF9AA0B4) else Color(0xFF5C6172)

    /** Foreground that sits on top of the ember/aurora gradients. */
    val OnAccent: Color get() = Color.Black

    val aurora: Brush get() = Brush.linearGradient(listOf(Molten, Gold, Cyan))
    val ember: Brush get() = Brush.linearGradient(listOf(Molten, Gold))
    val chrome: Brush get() = Brush.linearGradient(listOf(Cyan, Violet, Molten))
}

private fun scheme(dark: Boolean) = if (dark) darkColorScheme(
    primary = DC.Molten,
    onPrimary = Color.Black,
    secondary = DC.Cyan,
    background = DC.Obsidian,
    onBackground = DC.Text,
    surface = DC.Surface,
    onSurface = DC.Text,
    surfaceVariant = DC.SurfaceAlt,
    onSurfaceVariant = DC.Muted,
    outline = DC.Line,
    error = DC.Danger,
) else lightColorScheme(
    primary = DC.Molten,
    onPrimary = Color.Black,
    secondary = DC.Cyan,
    background = DC.Obsidian,
    onBackground = DC.Text,
    surface = DC.Surface,
    onSurface = DC.Text,
    surfaceVariant = DC.SurfaceAlt,
    onSurfaceVariant = DC.Muted,
    outline = DC.Line,
    error = DC.Danger,
)

private val typo = Typography(
    displaySmall = TextStyle(fontSize = 30.sp, fontWeight = FontWeight.Black, letterSpacing = (-0.5).sp),
    headlineMedium = TextStyle(fontSize = 24.sp, fontWeight = FontWeight.ExtraBold),
    titleLarge = TextStyle(fontSize = 19.sp, fontWeight = FontWeight.Bold),
    titleMedium = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.SemiBold),
    bodyLarge = TextStyle(fontSize = 15.sp),
    bodyMedium = TextStyle(fontSize = 14.sp),
    bodySmall = TextStyle(fontSize = 12.5.sp),
    labelLarge = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.SemiBold),
    labelSmall = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium, letterSpacing = 0.6.sp),
)

@Composable
fun DigitalChachoTheme(content: @Composable () -> Unit) {
    val system = isSystemInDarkTheme()
    val dark = when (ThemeMode.choice.value) {
        "light" -> false
        "dark" -> true
        else -> system
    }
    ThemeMode.dark.value = dark
    MaterialTheme(colorScheme = scheme(dark), typography = typo, content = content)
}
