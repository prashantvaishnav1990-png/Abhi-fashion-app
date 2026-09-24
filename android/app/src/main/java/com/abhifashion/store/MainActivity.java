package com.abhifashion.store;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onResume() {
        super.onResume();
        if ("com.abhifashion.admin".equals(getPackageName())) {
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
}
