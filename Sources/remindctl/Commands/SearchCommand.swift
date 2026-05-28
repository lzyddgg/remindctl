import Commander
import Foundation
import RemindCore

enum SearchCommand {
  static var spec: CommandSpec {
    CommandSpec(
      name: "search",
      abstract: "Search reminder titles, notes, and URLs",
      discussion: "By default searches incomplete reminders. Use --completed to include completed reminders.",
      signature: CommandSignatures.withRuntimeFlags(
        CommandSignature(
          arguments: [
            .make(label: "query", help: "Search text", isOptional: false)
          ],
          options: [
            .make(
              label: "list",
              names: [.short("l"), .long("list")],
              help: "Limit to a specific list",
              parsing: .singleValue
            )
          ],
          flags: [
            .make(label: "completed", names: [.long("completed")], help: "Include completed reminders")
          ]
        )
      ),
      usageExamples: [
        "remindctl search milk",
        "remindctl search \"project notes\" --list Work",
        "remindctl search invoice --completed --json",
      ]
    ) { values, runtime in
      guard let query = values.argument(0)?.trimmingCharacters(in: .whitespacesAndNewlines), !query.isEmpty else {
        throw ParsedValuesError.missingArgument("query")
      }

      let store = RemindersStore()
      try await store.requestAccess()
      let reminders = try await store.reminders(in: values.option("list"))
      let includeCompleted = values.flag("completed")
      let matches = reminders.filter { reminder in
        (includeCompleted || !reminder.isCompleted)
          && CommandHelpers.reminder(reminder, matchesSearch: query)
      }

      OutputRenderer.printSearchResults(matches, format: runtime.outputFormat)
    }
  }
}
