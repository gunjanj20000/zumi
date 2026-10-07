package com.zumi.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VoiceAssistantPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
