import Foundation
import RemindCore

enum OutputFormat {
  case standard
  case plain
  case json
  case quiet
}

struct ListSummary: Codable, Sendable, Equatable {
  let id: String
  let title: String
  let reminderCount: Int
  let overdueCount: Int
}

struct AuthorizationSummary: Codable, Sendable, Equatable {
  let status: String
  let authorized: Bool
}

enum OutputRenderer {
  static func printReminders(_ reminders: [ReminderItem], format: OutputFormat) {
    switch format {
    case .standard:
      printRemindersStandard(reminders)
    case .plain:
      printRemindersPlain(reminders)
    case .json:
      printJSON(reminders)
    case .quiet:
      Swift.print(reminders.count)
    }
  }

  static func printSearchResults(_ reminders: [ReminderItem], format: OutputFormat) {
    switch format {
    case .standard:
      printSearchResultsStandard(reminders)
    case .plain:
      printRemindersPlain(reminders)
    case .json:
      printJSON(reminders)
    case .quiet:
      Swift.print(reminders.count)
    }
  }

  static func printLists(_ summaries: [ListSummary], format: OutputFormat) {
    switch format {
    case .standard:
      printListsStandard(summaries)
    case .plain:
      printListsPlain(summaries)
    case .json:
      printJSON(summaries)
    case .quiet:
      Swift.print(summaries.count)
    }
  }

  static func printReminder(_ reminder: ReminderItem, format: OutputFormat) {
    switch format {
    case .standard:
      let due =
        reminder.dueDate.map {
          DateParsing.formatDisplay($0, isDateOnly: reminder.dueDateIsAllDay)
        } ?? "no due date"
      let recurrence = recurrenceSuffix(for: reminder)
      Swift.print("✓ \(reminder.title) [\(reminder.listName)] — \(due)\(recurrence)")
    case .plain:
      Swift.print(plainLine(for: reminder))
    case .json:
      printJSON(reminder)
    case .quiet:
      break
    }
  }

  static func printReminderDetail(_ reminder: ReminderItem, format: OutputFormat) {
    switch format {
    case .standard:
      printReminderDetailStandard(reminder)
    case .plain:
      Swift.print(plainLine(for: reminder))
    case .json:
      printJSON(reminder)
    case .quiet:
      Swift.print(reminder.id)
    }
  }

  static func printDeleteResult(_ count: Int, format: OutputFormat) {
    switch format {
    case .standard:
      Swift.print("Deleted \(count) reminder(s)")
    case .plain:
      Swift.print("\(count)")
    case .json:
      let payload = ["deleted": count]
      printJSON(payload)
    case .quiet:
      break
    }
  }

  static func printAuthorizationStatus(_ status: RemindersAuthorizationStatus, format: OutputFormat) {
    switch format {
    case .standard:
      Swift.print("Reminders access: \(status.displayName)")
    case .plain:
      Swift.print(status.rawValue)
    case .json:
      printJSON(AuthorizationSummary(status: status.rawValue, authorized: status.isAuthorized))
    case .quiet:
      Swift.print(status.isAuthorized ? "1" : "0")
    }
  }

  private static func printRemindersStandard(_ reminders: [ReminderItem]) {
    let sorted = ReminderFiltering.sort(reminders)
    guard !sorted.isEmpty else {
      Swift.print("No reminders found")
      return
    }
    for (index, reminder) in sorted.enumerated() {
      let status = reminder.isCompleted ? "x" : " "
      let due =
        reminder.dueDate.map {
          DateParsing.formatDisplay($0, isDateOnly: reminder.dueDateIsAllDay)
        } ?? "no due date"
      let priority = reminder.priority == .none ? "" : " priority=\(reminder.priority.rawValue)"
      let recurrence = recurrenceSuffix(for: reminder)
      Swift.print(
        "[\(index + 1)] [\(status)] \(reminder.title) [\(reminder.listName)] — \(due)\(priority)\(recurrence)")
    }
  }

  private static func printRemindersPlain(_ reminders: [ReminderItem]) {
    let sorted = ReminderFiltering.sort(reminders)
    for reminder in sorted {
      Swift.print(plainLine(for: reminder))
    }
  }

  private static func printSearchResultsStandard(_ reminders: [ReminderItem]) {
    let sorted = ReminderFiltering.sort(reminders)
    guard !sorted.isEmpty else {
      Swift.print("No reminders found")
      return
    }
    for reminder in sorted {
      let status = reminder.isCompleted ? "x" : " "
      let due =
        reminder.dueDate.map {
          DateParsing.formatDisplay($0, isDateOnly: reminder.dueDateIsAllDay)
        } ?? "no due date"
      let priority = reminder.priority == .none ? "" : " priority=\(reminder.priority.rawValue)"
      let recurrence = recurrenceSuffix(for: reminder)
      Swift.print(
        "[\(status)] \(reminder.title) [\(reminder.listName)] — \(due)\(priority)\(recurrence) id=\(reminder.id)")
    }
  }

  private static func printReminderDetailStandard(_ reminder: ReminderItem) {
    Swift.print("ID: \(reminder.id)")
    Swift.print("Title: \(reminder.title)")
    Swift.print("List: \(reminder.listName)")
    Swift.print("Status: \(reminder.isCompleted ? "completed" : "open")")
    Swift.print("Priority: \(reminder.priority.rawValue)")

    if let dueDate = reminder.dueDate {
      Swift.print("Due: \(DateParsing.formatDisplay(dueDate, isDateOnly: reminder.dueDateIsAllDay))")
    }
    if let alarmDate = reminder.alarmDate {
      Swift.print("Alarm: \(DateParsing.formatDisplay(alarmDate))")
    }
    if let recurrenceRule = reminder.recurrenceRule {
      Swift.print("Repeat: \(recurrenceRule.displayString)")
    }
    if let locationTrigger = reminder.locationTrigger {
      Swift.print(
        "Location: \(locationTrigger.address) (\(locationTrigger.proximity.rawValue), \(locationTrigger.radius)m)")
    }
    if let url = reminder.url {
      Swift.print("URL: \(url.absoluteString)")
    }
    if let creationDate = reminder.creationDate {
      Swift.print("Created: \(DateParsing.formatDisplay(creationDate))")
    }
    if let lastModifiedDate = reminder.lastModifiedDate {
      Swift.print("Modified: \(DateParsing.formatDisplay(lastModifiedDate))")
    }
    if let completionDate = reminder.completionDate {
      Swift.print("Completed: \(DateParsing.formatDisplay(completionDate))")
    }
    if let notes = reminder.notes, !notes.isEmpty {
      Swift.print("Notes:")
      Swift.print(notes)
    }
  }

  private static func plainLine(for reminder: ReminderItem) -> String {
    let due: String
    if let dueDate = reminder.dueDate {
      due =
        reminder.dueDateIsAllDay
        ? dateOnlyFormatter().string(from: dueDate)
        : isoFormatter().string(from: dueDate)
    } else {
      due = ""
    }
    return [
      reminder.id,
      reminder.listName,
      reminder.isCompleted ? "1" : "0",
      reminder.priority.rawValue,
      due,
      reminder.title,
    ].joined(separator: "\t")
  }

  private static func printListsStandard(_ summaries: [ListSummary]) {
    guard !summaries.isEmpty else {
      Swift.print("No reminder lists found")
      return
    }
    for summary in summaries.sorted(by: { $0.title < $1.title }) {
      let overdue = summary.overdueCount > 0 ? " (\(summary.overdueCount) overdue)" : ""
      Swift.print("\(summary.title) — \(summary.reminderCount) reminders\(overdue)")
    }
  }

  private static func printListsPlain(_ summaries: [ListSummary]) {
    for summary in summaries.sorted(by: { $0.title < $1.title }) {
      Swift.print("\(summary.title)\t\(summary.reminderCount)\t\(summary.overdueCount)")
    }
  }

  private static func printJSON<T: Encodable>(_ payload: T) {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys, .prettyPrinted]
    encoder.dateEncodingStrategy = .iso8601
    do {
      let data = try encoder.encode(payload)
      if let json = String(data: data, encoding: .utf8) {
        Swift.print(json)
      }
    } catch {
      Swift.print("Failed to encode JSON: \(error)")
    }
  }

  private static func isoFormatter() -> ISO8601DateFormatter {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }

  private static func dateOnlyFormatter() -> DateFormatter {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone.current
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
  }

  private static func recurrenceSuffix(for reminder: ReminderItem) -> String {
    reminder.recurrenceRule.map { " repeat=\($0.displayString)" } ?? ""
  }
}
