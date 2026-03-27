package com.kentcas.librarytracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import org.json.JSONArray;
import org.json.JSONException;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;
        if (!UpdateNotificationsPlugin.getStoredEnabled(context) || !UpdateNotificationsPlugin.notificationsPermissionGranted(context)) return;

        try {
            JSONArray books = new JSONArray(UpdateNotificationsPlugin.getFeedsJson(context));
            if (books.length() > 0) NotificationScheduler.schedule(context);
        } catch (JSONException ignored) {}
    }
}
