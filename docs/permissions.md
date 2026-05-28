---
title: Permissions
description: "macOS Reminders permissions for remindctl."
---

# Permissions

`remindctl` uses EventKit. macOS grants Reminders access per app, so the terminal app that runs `remindctl` must have permission.

## Check access

```bash
remindctl status
```

## Request access

```bash
remindctl authorize
```

If macOS reports access as denied, enable the terminal app in:

```text
System Settings > Privacy & Security > Reminders
```

If no prompt appears, run this once from the same terminal app:

```bash
osascript -e 'tell application "Reminders" to get name of reminders'
```

Then allow access and rerun:

```bash
remindctl status
```

When running over SSH, grant access on the Mac that actually runs `remindctl`.
