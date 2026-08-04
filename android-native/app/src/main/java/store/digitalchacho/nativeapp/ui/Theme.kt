package store.digitalchacho.nativeapp.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/** Obsidian + aurora palette mirroring the web store. */
object DC {
    val Obsidian = Color(0xFF07070B)
    val Surface = Color(0xFF101018)
    val SurfaceAlt = Color(0xFF16161F)
    val Glass = Color(0x14FFFFFF)
    val Line = Color(0x1FFFFFFF)
    val Text = Color(0xFFF3F4F8)
    val Muted = Color(0xFF9AA0B4)
    val Molten = Color(0xFFFF7A18)
    val Gold = Color(0xFFFFC53D)
    val Cyan = Color(0xFF35E1F5)
    val Violet = Color(0xFF8B5CF6)
    val Mint = Color(0xFF3DDC97)
    val Danger = Color(0xFFFF5A5F)

    val aurora = Brush.linearGradient(listOf(Molten, Gold, Cyan))
    val ember = Brush.linearGradient(listOf(Molten, Gold))
    val chrome = Brush.linearGradient(listOf(Cyan, Violet, Molten))
}

private val darkScheme = darkColorScheme(
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

private val lightSchemeFallback = lightColorScheme(
    primary = DC.Molten,
    background = Color(0xFFF7F7FA),
    surface = Color.White,
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
fun DigitalChachoTheme(forceDark: Boolean = true, content: @Composable () -> Unit) {
    val dark = forceDark || isSystemInDarkTheme()
    MaterialTheme(
        colorScheme = if (dark) darkScheme else lightSchemeFallback,
        typography = typo,
        content = content,
    )
}
