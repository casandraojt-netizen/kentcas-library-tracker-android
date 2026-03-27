package com.kentcas.librarytracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class RssCheckReceiver extends BroadcastReceiver {
    private static final Pattern ITEM_PATTERN = Pattern.compile("<item>(.*?)</item>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern TITLE_PATTERN = Pattern.compile("<title[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:]]>)?</title>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern PUBDATE_PATTERN = Pattern.compile("<(pubDate|dc:date|published)[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:]]>)?</\\1>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern LINK_PATTERN = Pattern.compile("<link>(.*?)</link>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern GUID_PATTERN = Pattern.compile("<guid[^>]*>(.*?)</guid>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    @Override
    public void onReceive(Context context, Intent intent) {
        final PendingResult pendingResult = goAsync();
        new Thread(() -> {
            try {
                checkFeeds(context);
            } finally {
                pendingResult.finish();
            }
        }).start();
    }

    private void checkFeeds(Context context) {
        if (!UpdateNotificationsPlugin.getStoredEnabled(context) || !UpdateNotificationsPlugin.notificationsPermissionGranted(context)) {
            return;
        }

        String feedsJson = UpdateNotificationsPlugin.getFeedsJson(context);
        JSONArray books;
        try {
            books = new JSONArray(feedsJson);
        } catch (JSONException error) {
            return;
        }

        boolean changed = false;

        for (int index = 0; index < books.length(); index++) {
            JSONObject book = books.optJSONObject(index);
            if (book == null) continue;
            String feedUrl = book.optString("feedUrl", "");
            if (feedUrl.isEmpty()) continue;

            LatestItem latest = fetchLatestItem(feedUrl);
            if (latest == null || latest.title.isEmpty()) continue;

            String appKnownTitle = book.optString("latestTitle", "");
            String notifiedTitle = book.optString("notifiedTitle", "");
            if (!latest.title.equals(appKnownTitle) && !latest.title.equals(notifiedTitle)) {
                notify(context, book, latest);
                try {
                    book.put("notifiedTitle", latest.title);
                    changed = true;
                } catch (JSONException ignored) {}
            }
        }

        if (changed) {
            UpdateNotificationsPlugin.getPrefs(context).edit().putString("feeds_json", books.toString()).apply();
        }
    }

    private LatestItem fetchLatestItem(String feedUrl) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(feedUrl).openConnection();
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(15000);
            connection.setRequestProperty("Accept", "application/rss+xml, application/xml, text/xml, */*");
            connection.setRequestProperty("User-Agent", "LibraryTrackerAndroid/1.0");

            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) return null;

            InputStream stream = connection.getInputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) builder.append(line).append('\n');
            String xml = builder.toString();
            if (xml.trim().isEmpty() || xml.trim().startsWith("<!DOCTYPE") || xml.trim().startsWith("<html")) return null;

            Matcher itemMatcher = ITEM_PATTERN.matcher(xml);
            if (!itemMatcher.find()) return null;
            String block = itemMatcher.group(1);

            String title = extractTag(block, TITLE_PATTERN);
            if (title.isEmpty()) return null;

            String pubDate = extractTag(block, PUBDATE_PATTERN);
            String link = extractTag(block, LINK_PATTERN);
            if (link.isEmpty()) link = extractTag(block, GUID_PATTERN);

            return new LatestItem(title, pubDate, link);
        } catch (Exception error) {
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private String extractTag(String block, Pattern pattern) {
        Matcher matcher = pattern.matcher(block);
        if (!matcher.find()) return "";
        String value = matcher.group(matcher.groupCount()).trim();
        return value
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'");
    }

    private void notify(Context context, JSONObject book, LatestItem latest) {
        if (!UpdateNotificationsPlugin.notificationsPermissionGranted(context)) return;

        NotificationScheduler.ensureChannel(context);

        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        openIntent.putExtra("bookId", book.optString("id", ""));

        int pendingFlags = android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE;
        android.app.PendingIntent contentIntent = android.app.PendingIntent.getActivity(
            context,
            book.optString("id", "").hashCode(),
            openIntent,
            pendingFlags
        );

        String bookTitle = book.optString("title", "Tracked story");
        String content = latest.title.isEmpty() ? "A new chapter is available." : latest.title;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, NotificationScheduler.CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(bookTitle)
            .setContentText(content)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(content))
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT);

        NotificationManagerCompat.from(context).notify(book.optString("id", bookTitle).hashCode(), builder.build());
    }

    private static class LatestItem {
        final String title;
        final String pubDate;
        final String link;

        LatestItem(String title, String pubDate, String link) {
            this.title = title;
            this.pubDate = pubDate;
            this.link = link;
        }
    }
}
