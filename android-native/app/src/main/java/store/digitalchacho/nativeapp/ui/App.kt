package store.digitalchacho.nativeapp.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
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
                }
            },
            bottomBar = {
                NavigationBar(containerColor = DC.Surface, tonalElevation = 0.dp) {
                    tabs.forEach { tab ->
                        val selected = current == tab.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                if (!selected) nav.navigate(tab.route) {
                                    popUpTo("home"); launchSingleTop = true
                                }
                            },
                            icon = {
                                if (tab.route == "cart" && AppState.cart.isNotEmpty()) {
                                    BadgedBox(badge = { Badge(containerColor = DC.Molten) { Text("${AppState.cart.sumOf { it.qty }}") } }) {
                                        Icon(tab.icon, tab.label)
                                    }
                                } else Icon(tab.icon, tab.label)
                            },
                            label = { Text(tab.label, style = MaterialTheme.typography.labelSmall) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Color.Black,
                                selectedTextColor = DC.Molten,
                                indicatorColor = DC.Molten,
                                unselectedIconColor = DC.Muted,
                                unselectedTextColor = DC.Muted,
                            ),
                        )
                    }
                }
            },
        ) { padding ->
            Box(Modifier.padding(padding).background(Color.Transparent)) {
                NavHost(nav, startDestination = "home") {
                    composable("home") { HomeScreen(nav) }
                    composable("product/{id}") { back ->
                        ProductDetailScreen(nav, back.arguments?.getString("id").orEmpty())
                    }
                    composable("cart") { CartScreen(nav) }
                    composable("checkout") { CheckoutScreen(nav) }
                    composable("auth") { AuthScreen(nav) }
                    composable("vault") { VaultScreen(nav) }
                    composable("requests") { RequestsScreen(nav) }
                    composable("admin") { AdminScreen(nav) }
                }
            }
        }
    }
}
