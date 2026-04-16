"use client";

import React from "react";
import { Header } from "@/components/dashboard/header";
import { NotificationsPage as NotificationsList } from "@/components/notifications";

export default function NotificationsPage() {
    return (
        <div className="flex flex-col">
            <Header
                title="Notifications"
                description="View all your notifications and updates"
            />
            <div className="p-6">
                <NotificationsList />
            </div>
        </div>
    );
}
