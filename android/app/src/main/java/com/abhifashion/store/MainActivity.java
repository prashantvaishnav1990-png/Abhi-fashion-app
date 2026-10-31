package com.abhifashion.store;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private void injectTargetMode() {
        String pkg = getPackageName();
        if (pkg != null && pkg.toLowerCase().contains("admin")) {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().post(new Runnable() {
                    @Override
                    public void run() {
                        getBridge().getWebView().evaluateJavascript(
                            "window.__APP_TARGET_MODE__ = 'admin'; if (window.__onAppTargetMode) window.__onAppTargetMode('admin');",
                            null
                        );
                    }
                });
            }
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        injectTargetMode();
    }

    @Override
    public void onResume() {
        super.onResume();
        injectTargetMode();
    }
}
