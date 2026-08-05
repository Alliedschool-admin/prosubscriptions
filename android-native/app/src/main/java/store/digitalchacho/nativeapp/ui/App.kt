package store.digitalchacho.nativeapp.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandHorizontally
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import store.digitalchacho.nativeapp.core.AppState
import store.digitalchacho.nativeapp.ui.components.AuroraBackground
import store.digitalchacho.nativeapp.ui.components.BroadcastBanner
import store.digitalchacho.nativeapp.ui.components.OfflineBanner
import store.digitalchacho.nativeapp.ui.screens.*


private data class Tab(val route: String, val label: String, val icon: ImageVector)

@Composable
fun App() {
    val nav = rememberNavController()
    val snackbar = remember { SnackbarHostState() }
    val entry by nav.currentBackStackEntryAsState()
    val current = entry?.destination?.route
    val toast = AppState.toast.value

    LaunchedEffect(toast) {
        if (toast != null) {
            snackbar.showSnackbar(toast)
            AppState.toast.value = null
        }
    }

    val tabs = buildList {
        add(Tab("home", "Store", Icons.Filled.Home))
        add(Tab("vault", "Vault", Icons.Filled.Lock))
        add(Tab("tips", "Tips", Icons.Filled.Lightbulb))
        add(Tab("requests", "Requests", Icons.Filled.Inbox))
        add(Tab("cart", "Cart", Icons.Filled.ShoppingBag))
        if (AppState.isAdmin.value) add(Tab("admin", "Admin", Icons.Filled.AdminPanelSettings))
    }

    AuroraBackground {
        Scaffold(
            containerColor = Color.Transparent,
            snackbarHost = { SnackbarHost(snackbar) },
            topBar = {
                Column(Modifier.statusBarsPadding()) {
                    BroadcastBanner(AppState.broadcast.value?.message)
                    OfflineBanner(!AppState.online.value)
                    BrandBar()
                }
            },
            bottomBar = { FuturisticDock(tabs, current, nav) },
        ) { padding ->
            Box(Modifier.padding(padding)) {
                NavHost(nav, startDestination = "home") {
                    composable("home") { HomeScreen(nav) }
                    composable("product/{id}") { back ->
                        ProductDetailScreen(nav, back.arguments?.getString("id").orEmpty())
                    }
                    composable("cart") { CartScreen(nav) }
                    composable("checkout") { CheckoutScreen(nav) }
                    composable("auth") { AuthScreen(nav) }
                    composable("vault") { VaultScreen(nav) }
                    composable("tips") { TipsScreen(nav) }
                    composable("requests") { RequestsScreen(nav) }
                    composable("admin") { AdminScreen(nav) }
                }
            }
        }
    }
}

/** Slim brand strip with the live theme switch. */
@Composable
private fun BrandBar() {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier
                .size(28.dp)
                .clip(RoundedCornerShape(9.dp))
                .background(DC.aurora),
            contentAlignment = Alignment.Center,
        ) { Text("DC", color = DC.OnAccent, fontWeight = FontWeight.Black, style = MaterialTheme.typography.labelSmall) }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text("Digital Chacho", color = DC.Text, style = MaterialTheme.typography.titleMedium)
            Text("Premium tools · unreal prices", color = DC.Muted, style = MaterialTheme.typography.labelSmall)
        }
        ThemeSwitch()
    }
}

@Composable
private fun ThemeSwitch() {
    val dark = ThemeMode.dark.value
    val glow by animateColorAsState(if (dark) DC.Cyan else DC.Gold, label = "glow")
    Box(
        Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(DC.Glass)
            .border(1.dp, glow.copy(alpha = 0.45f), CircleShape)
            .clickable { ThemeMode.toggle() },
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            if (dark) Icons.Filled.DarkMode else Icons.Filled.LightMode,
            contentDescription = if (dark) "Switch to light mode" else "Switch to dark mode",
            tint = glow,
            modifier = Modifier.size(19.dp),
        )
    }
}

/** Floating glass dock: selected tab expands into a gradient pill with its label. */
@Composable
private fun FuturisticDock(
    tabs: List<Tab>,
    current: String?,
    nav: NavHostController,
) {
    Box(Modifier.fillMaxWidth().navigationBarsPadding().padding(horizontal = 12.dp, vertical = 10.dp)) {
        Row(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(26.dp))
                .background(DC.Surface.copy(alpha = if (ThemeMode.dark.value) 0.82f else 0.94f))
                .border(1.dp, DC.Line, RoundedCornerShape(26.dp))
                .padding(horizontal = 6.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            tabs.forEach { tab ->
                val selected = current == tab.route
                DockItem(tab, selected, tabs.size) {
                    if (!selected) nav.navigate(tab.route) {
                        popUpTo("home"); launchSingleTop = true
                    }
                }
            }
        }
    }
}

@Composable
private fun RowScope.DockItem(tab: Tab, selected: Boolean, total: Int, onClick: () -> Unit) {
    val height by animateDpAsState(if (selected) 44.dp else 40.dp, label = "h")
    val iconAlpha by animateFloatAsState(if (selected) 1f else 0.75f, label = "a")
    val interaction = remember { MutableInteractionSource() }
    val cartCount = AppState.cart.sumOf { it.qty }

    Row(
        Modifier
            .weight(if (selected) 1.5f else 1f)
            .height(height)
            .clip(RoundedCornerShape(20.dp))
            .then(
                if (selected) Modifier.background(DC.ember)
                else Modifier.background(Brush.linearGradient(listOf(Color.Transparent, Color.Transparent)))
            )
            .clickable(interactionSource = interaction, indication = null) { onClick() },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        val tint = if (selected) DC.OnAccent else DC.Muted
        if (tab.route == "cart" && cartCount > 0) {
            BadgedBox(badge = {
                Badge(containerColor = if (selected) DC.Violet else DC.Molten) { Text("$cartCount") }
            }) {
                Icon(tab.icon, tab.label, tint = tint, modifier = Modifier.size(20.dp).alpha(iconAlpha))
            }
        } else {
            Icon(tab.icon, tab.label, tint = tint, modifier = Modifier.size(20.dp).alpha(iconAlpha))
        }
        AnimatedVisibility(
            visible = selected && total <= 6,
            enter = fadeIn() + expandHorizontally(),
            exit = fadeOut() + shrinkHorizontally(),
        ) {
            Text(
                tab.label,
                color = DC.OnAccent,
                fontWeight = FontWeight.Bold,
                style = MaterialTheme.typography.labelSmall,
                modifier = Modifier.padding(start = 6.dp),
            )
        }
    }
}
