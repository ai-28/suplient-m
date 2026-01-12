package com.suplient.app;

import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private WebViewClient originalWebViewClient;

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {

        super.onStart();

        // Set up WebViewClient after bridge is initialized
        if (this.bridge != null && this.bridge.getWebView() != null) {
            // Store the original WebViewClient if it exists
            originalWebViewClient = this.bridge.getWebView().getWebViewClient();

            // Create a custom WebViewClient that intercepts navigation
            this.bridge.getWebView().setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    String url = request.getUrl().toString();

                    // Check if the URL is within suplient.com domain (including subdomains)
                    if (url != null && (url.contains("suplient.com") || url.contains("localhost"))) {
                        // Load within the app WebView instead of opening external browser
                        view.loadUrl(url);
                        return true; // We handled the navigation
                    }

                    // For other URLs, try the original WebViewClient if it exists
                    if (originalWebViewClient != null) {
                        return originalWebViewClient.shouldOverrideUrlLoading(view, request);
                    }

                    // Default behavior - let the WebView handle it
                    return false;
                }
            });
        }
    }
}

