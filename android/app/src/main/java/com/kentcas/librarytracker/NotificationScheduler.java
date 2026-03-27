package com.kentcas.librarytracker;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;

public final class NotificationScheduler {
    public static final String CHANNEL_ID = "library_updates";
    private static final long UPDATE_INTERVAL_MS = AlarmManager.INTERVAL_HALF_HOUR;

    private NotificationScheduler() {}

    public static void schedule(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;
        ensureChannel(context);
        alarmManager.setInexactRepeating(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            SystemClock.elapsedRealtime() + 60_000L,
            UPDATE_INTERVAL_MS,
            getPendingIntent(context)
        );
    }

    public static void cancel(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;
        alarmManager.cancel(getPendingIntent(context));
    }

    public static PendingIntent getPendingIntent(Context context) {
        Intent intent = new Intent(context, RssCheckReceiver.class);
        intent.setAction("com.kentcas.librarytracker.ACTION_CHECK_UPDATES");
        return PendingIntent.getBroadcast(
            context,
            1001,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
        if (notificationManager == null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Library Updates",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("Notifications for new chapters detected in tracked RSS feeds.");
        notificationManager.createNotificationChannel(channel);
    }
}
