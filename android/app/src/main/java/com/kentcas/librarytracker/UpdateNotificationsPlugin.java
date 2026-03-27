package com.kentcas.librarytracker;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(
    name = "UpdateNotifications",
    permissions = {
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class UpdateNotificationsPlugin extends Plugin {
    private static final String PREFS_NAME = "update_notifications";
    private static final String KEY_ENABLED = "enabled";
    private static final String KEY_FEEDS_JSON = "feeds_json";

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(buildStatus(getContext()));
    }

    @PluginMethod
    public void syncFeeds(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        JSArray incomingBooks = call.getArray("books", new JSArray());
        saveFeeds(getContext(), incomingBooks, enabled);
        if (enabled && notificationsPermissionGranted(getContext()) && incomingBooks.length() > 0) {
            NotificationScheduler.schedule(getContext());
        } else {
            NotificationScheduler.cancel(getContext());
        }
        call.resolve(buildStatus(getContext()));
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            call.resolve(buildStatus(getContext()));
            return;
        }

        if (getPermissionState("notifications") == PermissionState.GRANTED) {
            call.resolve(buildStatus(getContext()));
            return;
        }

        requestPermissionForAlias("notifications", call, "permissionResult");
    }

    @PermissionCallback
    private void permissionResult(PluginCall call) {
        if (getStoredEnabled(getContext()) && notificationsPermissionGranted(getContext())) {
            try {
                JSONArray books = new JSONArray(getFeedsJson(getContext()));
                if (books.length() > 0) NotificationScheduler.schedule(getContext());
            } catch (JSONException ignored) {}
        } else {
            NotificationScheduler.cancel(getContext());
        }
        call.resolve(buildStatus(getContext()));
    }

    public static SharedPreferences getPrefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static boolean getStoredEnabled(Context context) {
        return getPrefs(context).getBoolean(KEY_ENABLED, false);
    }

    public static String getFeedsJson(Context context) {
        return getPrefs(context).getString(KEY_FEEDS_JSON, "[]");
    }

    public static boolean notificationsPermissionGranted(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true;
        return ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    public static JSObject buildStatus(Context context) {
        JSObject status = new JSObject();
        boolean enabled = getStoredEnabled(context) && notificationsPermissionGranted(context);
        String permission = notificationsPermissionGranted(context)
            ? "granted"
            : (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ? "prompt" : "granted");
        status.put("supported", true);
        status.put("permission", permission);
        status.put("enabled", enabled);
        try {
            status.put("watchCount", new JSONArray(getFeedsJson(context)).length());
        } catch (JSONException ignored) {
            status.put("watchCount", 0);
        }
        return status;
    }

    private static void saveFeeds(Context context, JSArray incomingBooks, boolean enabled) {
        JSONArray existingBooks;
        try {
          existingBooks = new JSONArray(getFeedsJson(context));
        } catch (JSONException error) {
          existingBooks = new JSONArray();
        }

        JSONArray mergedBooks = new JSONArray();

        for (int index = 0; index < incomingBooks.length(); index++) {
            JSONObject incoming = incomingBooks.optJSONObject(index);
            if (incoming == null) continue;
            JSONObject existing = findById(existingBooks, incoming.optString("id", ""));
            JSONObject merged = new JSONObject();
            try {
                merged.put("id", incoming.optString("id", ""));
                merged.put("title", incoming.optString("title", ""));
                merged.put("author", incoming.optString("author", ""));
                merged.put("feedUrl", incoming.optString("feedUrl", ""));
                merged.put("sourceUrl", incoming.optString("sourceUrl", ""));
                merged.put("latestTitle", incoming.optString("latestTitle", ""));
                merged.put("latestDate", incoming.optString("latestDate", ""));
                merged.put("latestUrl", incoming.optString("latestUrl", ""));
                merged.put("rssHasUpdate", incoming.optBoolean("rssHasUpdate", false));

                String existingNotified = existing != null ? existing.optString("notifiedTitle", "") : "";
                String incomingLatest = incoming.optString("latestTitle", "");
                String nextNotified;
                if (incoming.optBoolean("rssHasUpdate", false) && !incomingLatest.isEmpty()) {
                    nextNotified = incomingLatest;
                } else if (incomingLatest.equals(existingNotified)) {
                    nextNotified = "";
                } else {
                    nextNotified = existingNotified;
                }
                merged.put("notifiedTitle", nextNotified);
            } catch (JSONException ignored) {}
            mergedBooks.put(merged);
        }

        getPrefs(context)
            .edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putString(KEY_FEEDS_JSON, mergedBooks.toString())
            .apply();
    }

    private static JSONObject findById(JSONArray books, String id) {
        if (id == null || id.isEmpty()) return null;
        for (int index = 0; index < books.length(); index++) {
            JSONObject candidate = books.optJSONObject(index);
            if (candidate != null && id.equals(candidate.optString("id", ""))) return candidate;
        }
        return null;
    }
}
