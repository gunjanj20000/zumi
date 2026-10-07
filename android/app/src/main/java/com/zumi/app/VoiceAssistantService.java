package com.zumi.app;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;

import java.util.ArrayList;
import java.util.Locale;

/**
 * Native Android VoiceAssistantService.
 * Replaces browser SpeechRecognition with native Android SpeechRecognizer
 * and integrates the lightweight on-device WakeWordEngine for "Hey Zumi".
 */
public class VoiceAssistantService {
    private static final String TAG = "VoiceAssistantService";

    public interface Listener {
        void onStateChange(String state, String detail);
        void onWakeWordDetected(String phrase, String subsequentText);
        void onTranscript(String transcript, boolean isFinal);
        void onCommandDetected(String command);
        void onError(String errorMessage);
    }

    private final Context context;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final WakeWordEngine wakeWordEngine = new WakeWordEngine();

    private SpeechRecognizer speechRecognizer;
    private Listener listener;

    private boolean isAlwaysListening = false;
    private boolean isListeningActive = false;
    private String currentState = "IDLE";
    private String language = "en-US";

    private Runnable restartRunnable;
    private Runnable watchdogRunnable;
    private long lastAudioEventTime = 0;

    public VoiceAssistantService(Context context) {
        this.context = context.getApplicationContext();
    }

    public void setListener(Listener listener) {
        this.listener = listener;
    }

    public void updateConfig(String wakePhrase, String language) {
        if (wakePhrase != null && !wakePhrase.trim().isEmpty()) {
            wakeWordEngine.setWakePhrase(wakePhrase);
        }
        if (language != null && !language.trim().isEmpty()) {
            this.language = language;
        }
    }

    public String getCurrentState() {
        return currentState;
    }

    private void setState(String state, String detail) {
        this.currentState = state;
        if (listener != null) {
            mainHandler.post(() -> listener.onStateChange(state, detail));
        }
    }

    public void startAlwaysListening() {
        this.isAlwaysListening = true;
        mainHandler.post(this::initAndStartRecognizer);
        startWatchdog();
    }

    public void stopAlwaysListening() {
        this.isAlwaysListening = false;
        stopWatchdog();
        mainHandler.post(this::destroyRecognizer);
        setState("IDLE", "Assistant paused");
    }

    public void restartListening() {
        mainHandler.post(() -> {
            destroyRecognizer();
            if (isAlwaysListening) {
                initAndStartRecognizer();
            }
        });
    }

    private void initAndStartRecognizer() {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            Log.e(TAG, "Speech recognition is not available on this device.");
            setState("ERROR", "Android SpeechRecognizer is not available.");
            if (listener != null) {
                listener.onError("Android SpeechRecognizer is not available on this device.");
            }
            return;
        }

        destroyRecognizer();

        try {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context);
            speechRecognizer.setRecognitionListener(new RecognitionListener() {
                @Override
                public void onReadyForSpeech(Bundle params) {
                    isListeningActive = true;
                    lastAudioEventTime = System.currentTimeMillis();
                    if (!"WAKE_DETECTED".equals(currentState) && !"LISTENING_FOR_OBJECT".equals(currentState)) {
                        setState("LISTENING", "Zumi is listening for \"Hey Zumi\"");
                    }
                }

                @Override
                public void onBeginningOfSpeech() {
                    lastAudioEventTime = System.currentTimeMillis();
                }

                @Override
                public void onRmsChanged(float rmsdB) {
                    if (rmsdB > 2.0f) {
                        lastAudioEventTime = System.currentTimeMillis();
                    }
                }

                @Override
                public void onBufferReceived(byte[] buffer) {}

                @Override
                public void onEndOfSpeech() {
                    isListeningActive = false;
                }

                @Override
                public void onError(int error) {
                    isListeningActive = false;
                    handleRecognitionError(error);
                }

                @Override
                public void onResults(Bundle results) {
                    isListeningActive = false;
                    handleSpeechResults(results, true);
                }

                @Override
                public void onPartialResults(Bundle partialResults) {
                    handleSpeechResults(partialResults, false);
                }

                @Override
                public void onEvent(int eventType, Bundle params) {}
            });

            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
            // Prefer on-device offline recognition when supported
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);

            speechRecognizer.startListening(intent);
            lastAudioEventTime = System.currentTimeMillis();
        } catch (Exception e) {
            Log.e(TAG, "Failed to start SpeechRecognizer", e);
            scheduleRestart(500);
        }
    }

    private void handleSpeechResults(Bundle resultsBundle, boolean isFinal) {
        if (resultsBundle == null) return;

        ArrayList<String> matches = resultsBundle.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches == null || matches.isEmpty()) return;

        String transcript = matches.get(0).trim();
        if (transcript.isEmpty()) return;

        lastAudioEventTime = System.currentTimeMillis();

        if (listener != null) {
            mainHandler.post(() -> listener.onTranscript(transcript, isFinal));
        }

        // Process through lightweight WakeWordEngine
        WakeWordEngine.DetectionResult wakeResult = wakeWordEngine.processTranscript(transcript);

        if (wakeResult.detected) {
            vibrateFeedback();

            if (wakeResult.isWakeOnly) {
                // User said "Hey Zumi"
                setState("WAKE_DETECTED", "Wake word detected: " + wakeResult.matchedPhrase);
                if (listener != null) {
                    mainHandler.post(() -> listener.onWakeWordDetected(wakeResult.matchedPhrase, ""));
                }
                setState("LISTENING_FOR_OBJECT", "Listening for object...");
            } else {
                // User said combined command: "Hey Zumi, show Apple"
                setState("WAKE_DETECTED", "Wake word detected with command");
                if (listener != null) {
                    mainHandler.post(() -> {
                        listener.onWakeWordDetected(wakeResult.matchedPhrase, wakeResult.remainingText);
                        listener.onCommandDetected(wakeResult.remainingText);
                    });
                }
            }
        } else if ("LISTENING_FOR_OBJECT".equals(currentState)) {
            // Already in wake mode, treat transcript as object name
            if (listener != null) {
                mainHandler.post(() -> listener.onCommandDetected(transcript));
            }
        } else if (isFinal && !"IDLE".equals(currentState)) {
            // Standalone final command
            if (listener != null) {
                mainHandler.post(() -> listener.onCommandDetected(transcript));
            }
        }

        if (isFinal && isAlwaysListening) {
            scheduleRestart(200);
        }
    }

    private void handleRecognitionError(int error) {
        String message;
        boolean recoverable = true;

        switch (error) {
            case SpeechRecognizer.ERROR_NO_MATCH:
                message = "No speech match detected";
                break;
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                message = "Speech timeout";
                break;
            case SpeechRecognizer.ERROR_AUDIO:
                message = "Audio recording error";
                break;
            case SpeechRecognizer.ERROR_CLIENT:
                message = "Client side error";
                break;
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                message = "Microphone permission required";
                recoverable = false;
                break;
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
            case SpeechRecognizer.ERROR_NETWORK:
                message = "Network error";
                break;
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                message = "Speech recognizer is busy";
                break;
            default:
                message = "Recognition error (" + error + ")";
                break;
        }

        Log.d(TAG, "SpeechRecognizer error: " + message + " (code: " + error + ")");

        if (!recoverable) {
            setState("ERROR", message);
            if (listener != null) {
                mainHandler.post(() -> listener.onError(message));
            }
        } else if (isAlwaysListening) {
            scheduleRestart(250);
        }
    }

    private void scheduleRestart(long delayMs) {
        if (restartRunnable != null) {
            mainHandler.removeCallbacks(restartRunnable);
        }
        restartRunnable = () -> {
            if (isAlwaysListening) {
                initAndStartRecognizer();
            }
        };
        mainHandler.postDelayed(restartRunnable, delayMs);
    }

    private void startWatchdog() {
        stopWatchdog();
        watchdogRunnable = new Runnable() {
            @Override
            public void run() {
                if (isAlwaysListening) {
                    long now = System.currentTimeMillis();
                    // If no audio event or restart occurred for > 8 seconds, gently restart recognizer
                    if (!isListeningActive && (now - lastAudioEventTime > 8000)) {
                        Log.d(TAG, "Watchdog: restarting idle recognizer to maintain continuous listening");
                        restartListening();
                    }
                    mainHandler.postDelayed(this, 3000);
                }
            }
        };
        mainHandler.postDelayed(watchdogRunnable, 3000);
    }

    private void stopWatchdog() {
        if (watchdogRunnable != null) {
            mainHandler.removeCallbacks(watchdogRunnable);
            watchdogRunnable = null;
        }
        if (restartRunnable != null) {
            mainHandler.removeCallbacks(restartRunnable);
            restartRunnable = null;
        }
    }

    private void vibrateFeedback() {
        try {
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(60, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(60);
                }
            }
        } catch (Exception ignored) {}
    }

    private void destroyRecognizer() {
        if (speechRecognizer != null) {
            try {
                speechRecognizer.cancel();
                speechRecognizer.destroy();
            } catch (Exception ignored) {}
            speechRecognizer = null;
        }
        isListeningActive = false;
    }
}
