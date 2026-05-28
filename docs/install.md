---
title: Install
description: "Install remindctl with Homebrew or build it from source."
---

# Install

## Homebrew

```bash
brew install steipete/tap/remindctl
```

## From source

```bash
git clone https://github.com/openclaw/remindctl.git
cd remindctl
pnpm install
pnpm build
./bin/remindctl status
```

## Requirements

- macOS 14 or later.
- Swift 6.2 or later when building from source.
- Full Reminders access for the terminal app that runs `remindctl`.

## First run

```bash
remindctl status
remindctl authorize
```

If macOS reports access as denied, enable the terminal app in:

```text
System Settings > Privacy & Security > Reminders
```
