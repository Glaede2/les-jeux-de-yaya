package fr.yaya.jeux;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.Set;

/**
 * Une seule activité : une WebView plein écran qui affiche les jeux
 * (fichiers HTML/JS dans assets/www), plus un pont vers la synthèse vocale.
 * Aucune permission, aucun accès Internet.
 */
public class MainActivity extends Activity implements TextToSpeech.OnInitListener {

    private static final String HOST = "appassets.androidplatform.net";
    private static final int PICK_IMAGE = 42;

    private WebView web;
    private TextToSpeech tts;
    private boolean ttsReady;
    private ValueCallback<Uri[]> fileCallback;

    private static String mimeOf(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".js")) return "text/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".mp3")) return "audio/mpeg";
        return "application/octet-stream";
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_IMAGE || fileCallback == null) return;
        fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
        fileCallback = null;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        web = new WebView(this);
        web.setBackgroundColor(0xFFFFF7E8);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setHapticFeedbackEnabled(false);
        web.setLongClickable(false);
        web.setOnLongClickListener(v -> true);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setTextZoom(100); // ignore la taille de police système

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return true; // on ne quitte jamais la page des jeux
            }

            // Les fichiers des jeux sont servis depuis les assets sous une adresse https locale :
            // ça donne une vraie origine web, nécessaire pour stocker les images (IndexedDB).
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (!HOST.equals(url.getHost())) return null;
                String path = url.getPath() == null ? "" : url.getPath().replaceFirst("^/", "");
                try {
                    InputStream in = getAssets().open(path);
                    return new WebResourceResponse(mimeOf(path), "utf-8", in);
                } catch (IOException e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                            null, new ByteArrayInputStream(new byte[0]));
                }
            }
        });
        // Sélecteur de fichiers pour ajouter des images depuis l'espace parents
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);
                pick.setType("image/*");
                try {
                    startActivityForResult(Intent.createChooser(pick, "Choisir une image"), PICK_IMAGE);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });
        web.loadUrl("https://" + HOST + "/www/index.html");

        tts = new TextToSpeech(this, this);
        hideSystemUi();
    }

    @Override
    public void onInit(int status) {
        if (status != TextToSpeech.SUCCESS) return;
        int r = tts.setLanguage(Locale.FRANCE);
        if (r < 0) r = tts.setLanguage(Locale.FRENCH);
        pickBestVoice();
        // Un peu plus aigu et posé : plus doux pour une petite oreille
        tts.setSpeechRate(0.92f);
        tts.setPitch(1.2f);
        ttsReady = r >= 0;
    }

    /** Choisit la plus jolie voix française installée sur la tablette (hors ligne de préférence). */
    private void pickBestVoice() {
        try {
            Set<Voice> voices = tts.getVoices();
            if (voices == null) return;
            Voice best = null;
            int bestScore = Integer.MIN_VALUE;
            for (Voice v : voices) {
                Locale l = v.getLocale();
                if (l == null || !"fra".equals(l.getISO3Language())) continue;
                Set<String> f = v.getFeatures();
                if (f != null && f.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
                int score = v.getQuality() * 10 - v.getLatency();
                if ("FR".equals(l.getCountry())) score += 50;
                if (v.isNetworkConnectionRequired()) score -= 300; // la tablette n'a pas toujours Internet
                if (score > bestScore) { bestScore = score; best = v; }
            }
            if (best != null) tts.setVoice(best);
        } catch (RuntimeException e) {
            // certains moteurs ne gèrent pas les voix : on garde la voix par défaut
        }
    }

    /** Fonctions appelables depuis le JavaScript (window.AndroidBridge). */
    private class Bridge {
        @JavascriptInterface
        public void speak(String text) {
            if (ttsReady) tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "yaya");
        }

        /** Moteur de synthèse vocale utilisé (pour conseiller les parents). */
        @JavascriptInterface
        public String voiceEngine() {
            try {
                String e = tts.getDefaultEngine();
                return (ttsReady ? "" : "!") + (e == null ? "" : e);
            } catch (RuntimeException ex) {
                return "!";
            }
        }

        /** Ouvre les réglages Android de la synthèse vocale. */
        @JavascriptInterface
        public void openVoiceSettings() {
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent("com.android.settings.TTS_SETTINGS"));
                } catch (ActivityNotFoundException e) {
                    startActivity(new Intent(android.provider.Settings.ACTION_SETTINGS));
                }
            });
        }

        @JavascriptInterface
        public void exit() {
            runOnUiThread(MainActivity.this::finishAndRemoveTask);
        }
    }

    @SuppressWarnings("deprecation")
    private void hideSystemUi() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUi();
    }

    /** Retour : dans un jeu -> menu ; dans le menu -> on reste (sortie via le cadenas). */
    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("App.back()", null);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.evaluateJavascript("App.pause()", null);
        web.onPause();
        web.pauseTimers();
        if (tts != null) tts.stop();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        web.resumeTimers();
        hideSystemUi();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) tts.shutdown();
        web.destroy();
        super.onDestroy();
    }
}
