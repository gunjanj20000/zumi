package com.zumi.app;

import android.Manifest;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "VoiceAssistant",
    permissions = {
        @Permission(
            alias = "microphone",
            strings = { Manifest.permission.RECORD_AUDIO }
        )
    }
)
public class VoiceAssistantPlugin extends Plugin {
    private VoiceAssistantService assistantService;

    @Override
    public void load() {
        super.load();
        assistantService = new VoiceAssistantService(getContext());
        assistantService.setListener(new VoiceAssistantService.Listener() {
            @Override
            public void onStateChange(String state, String detail) {
                JSObject ret = new JSObject();
                ret.put("state", state);
                ret.put("detail", detail);
                notifyListeners("stateChange", ret);
            }

            @Override
            public void onWakeWordDetected(String phrase, String subsequentText) {
                JSObject ret = new JSObject();
                ret.put("phrase", phrase);
                ret.put("subsequentText", subsequentText);
                notifyListeners("wakeWordDetected", ret);
            }

            @Override
            public void onTranscript(String transcript, boolean isFinal) {
                JSObject ret = new JSObject();
                ret.put("transcript", transcript);
                ret.put("isFinal", isFinal);
                notifyListeners("transcript", ret);
            }

            @Override
            public void onCommandDetected(String command) {
                JSObject ret = new JSObject();
                ret.put("command", command);
                notifyListeners("commandDetected", ret);
            }

            @Override
            public void onError(String errorMessage) {
                JSObject ret = new JSObject();
                ret.put("error", errorMessage);
                notifyListeners("error", ret);
            }
        });
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
            return;
        }

        assistantService.startAlwaysListening();
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            assistantService.startAlwaysListening();
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } else {
            call.reject("Microphone permission is required to listen for voice commands.");
        }
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        assistantService.stopAlwaysListening();
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void restartListening(PluginCall call) {
        assistantService.restartListening();
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void updateConfig(PluginCall call) {
        String wakePhrase = call.getString("wakePhrase", "Hey Zumi");
        String language = call.getString("language", "en-US");
        assistantService.updateConfig(wakePhrase, language);
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getListeningState(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("state", assistantService.getCurrentState());
        call.resolve(ret);
    }
}
