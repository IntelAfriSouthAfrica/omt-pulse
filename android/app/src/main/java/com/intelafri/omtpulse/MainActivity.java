package com.intelafri.omtpulse;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Transparent WebView background so @capacitor/google-maps native
        // map view (rendered behind the WebView) is visible through the HTML element.
        this.bridge.getWebView().setBackgroundColor(Color.TRANSPARENT);

        // Disable Android's force-dark algorithm on the WebView. The app manages
        // its own light/dark theme via ThemeProvider + localStorage ("ob-theme"),
        // so Android's heuristic colour inversion must be switched off — it has
        // no knowledge of the app's theme state and produces inconsistent, broken
        // colours when the device is in system dark mode.
        //
        // Two separate APIs are required for full coverage:
        //   - API 29-32: WebSettingsCompat.setForceDark (deprecated in 33+)
        //   - API 33+  : setAlgorithmicDarkeningAllowed(false) (replaces the above)
        WebSettings settings = this.bridge.getWebView().getSettings();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // API 33+ — use the replacement API
            settings.setAlgorithmicDarkeningAllowed(false);
        } else if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
            // API 29-32 — use the compat library
            WebSettingsCompat.setForceDark(settings, WebSettingsCompat.FORCE_DARK_OFF);
        }
    }
}
