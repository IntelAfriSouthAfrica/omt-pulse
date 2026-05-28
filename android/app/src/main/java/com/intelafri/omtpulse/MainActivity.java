package com.intelafri.omtpulse;

import android.graphics.Color;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Transparent WebView background so @capacitor/google-maps native
        // map view (rendered behind the WebView) is visible through the HTML element.
        this.bridge.getWebView().setBackgroundColor(Color.TRANSPARENT);
    }
}
