---
title: Commands
description: "Common remindctl commands and options."
---

# Commands

## Show reminders

```bash
remindctl today
remindctl tomorrow
remindctl week
remindctl overdue
remindctl upcoming
remindctl open
remindctl completed
remindctl all
remindctl 2026-01-03
```

Limit a view to one list:

```bash
remindctl show overdue --list Work
```

Show multiple lists together:

```bash
remindctl list Work Errands
```

## Create reminders

```bash
remindctl add "Review notes"
remindctl add "Call Sam" --list Work --due tomorrow
remindctl add "Take vitamins" --due tomorrow --repeat daily
remindctl add "Check mailbox" --location "1 Apple Park Way, Cupertino, CA"
```

Useful `add` options:

- `--list <name>` chooses the target list.
- `--due <date>` sets a due date.
- `--alarm <date>` sets a notification alarm.
- `--notes <text>` adds notes.
- `--repeat <rule>` sets simple recurrence.
- `--priority <none|low|medium|high>` sets priority.
- `--location <address>` creates an arriving geofence trigger.
- `--leaving` changes a location trigger to leaving.
- `--radius <meters>` adjusts the geofence radius.

## Edit reminders

```bash
remindctl edit 1 --title "New title"
remindctl edit 4A83 --due "2026-01-04 09:00"
remindctl edit 4A83 --clear-due
remindctl edit 4A83 --list Office
remindctl edit 4A83 --no-repeat
```

`edit`, `complete`, and `delete` accept indexes from the current default listing or ID prefixes.

## Lists

```bash
remindctl list
remindctl list Work
remindctl list Projects --create
remindctl list Work --rename Office
remindctl list OldList --delete --force
```

Mutating list operations accept one list name. Read-only list views can accept multiple names.

## Output

```bash
remindctl all --json
remindctl list --json
remindctl today --plain
remindctl status --json
```

Global output flags:

- `--json` emits machine-readable JSON.
- `--plain` emits stable tab-separated lines.
- `--quiet` emits minimal output.
- `--no-color` disables colored output.
- `--no-input` disables interactive prompts.
