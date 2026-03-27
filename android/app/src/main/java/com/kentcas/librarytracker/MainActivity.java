package com.kentcas.librarytracker;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UpdateNotificationsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
