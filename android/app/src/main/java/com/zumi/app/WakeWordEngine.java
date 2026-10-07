package com.zumi.app;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Lightweight, on-device Wake-Word Engine for "Hey Zumi".
 * Supports fast phonetic and prefix matching with child-friendly pronunciation tolerance.
 */
public class WakeWordEngine {

    public static class DetectionResult {
        public final boolean detected;
        public final String matchedPhrase;
        public final String remainingText;
        public final boolean isWakeOnly;
        public final long timestamp;

        public DetectionResult(boolean detected, String matchedPhrase, String remainingText, boolean isWakeOnly) {
            this.detected = detected;
            this.matchedPhrase = matchedPhrase;
            this.remainingText = remainingText;
            this.isWakeOnly = isWakeOnly;
            this.timestamp = System.currentTimeMillis();
        }
    }

    private String primaryWakePhrase = "hey zumi";
    
    // Child-friendly phonetic variations for "Hey Zumi"
    private final List<String> wakeWordAliases = Arrays.asList(
            "hey zumi",
            "hey zoomi",
            "hey zoomy",
            "ay zumi",
            "hi zumi",
            "hello zumi",
            "ok zumi",
            "zumi"
    );

    private static final Pattern CLEAN_PATTERN = Pattern.compile("[^a-zA-Z0-9\\s]");

    public WakeWordEngine() {}

    public void setWakePhrase(String phrase) {
        if (phrase != null && !phrase.trim().isEmpty()) {
            this.primaryWakePhrase = normalize(phrase);
        }
    }

    public String getPrimaryWakePhrase() {
        return primaryWakePhrase;
    }

    /**
     * Normalizes text by lowercasing and stripping punctuation.
     */
    public static String normalize(String text) {
        if (text == null) return "";
        return CLEAN_PATTERN.matcher(text.toLowerCase(Locale.ROOT))
                .replaceAll(" ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    /**
     * Evaluates a streaming or final transcript against wake-word patterns.
     */
    public DetectionResult processTranscript(String rawTranscript) {
        if (rawTranscript == null || rawTranscript.trim().isEmpty()) {
            return new DetectionResult(false, "", "", true);
        }

        String normalized = normalize(rawTranscript);

        // Check primary wake phrase first
        if (matchesPhrase(normalized, primaryWakePhrase)) {
            return extractResult(normalized, primaryWakePhrase);
        }

        // Check aliases (e.g. "zumi", "hey zoomi", "ay zumi")
        for (String alias : wakeWordAliases) {
            if (matchesPhrase(normalized, alias)) {
                return extractResult(normalized, alias);
            }
        }

        return new DetectionResult(false, "", "", true);
    }

    private boolean matchesPhrase(String text, String phrase) {
        if (text.equals(phrase)) return true;
        if (text.startsWith(phrase + " ")) return true;
        
        // Also check if phrase appears inside continuous speech stream
        int index = text.indexOf(phrase);
        if (index >= 0) {
            boolean startBoundary = (index == 0 || text.charAt(index - 1) == ' ');
            boolean endBoundary = (index + phrase.length() == text.length() || text.charAt(index + phrase.length()) == ' ');
            return startBoundary && endBoundary;
        }
        return false;
    }

    private DetectionResult extractResult(String normalizedText, String phrase) {
        int index = normalizedText.lastIndexOf(phrase);
        String after = "";
        if (index >= 0) {
            after = normalizedText.substring(index + phrase.length()).trim();
        }

        boolean isWakeOnly = after.isEmpty();
        return new DetectionResult(true, phrase, after, isWakeOnly);
    }
}
