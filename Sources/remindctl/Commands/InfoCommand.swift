import Commander
import Foundation
import RemindCore

enum InfoCommand {
  static var spec: CommandSpec {
    CommandSpec(
      name: "info",
      abstract: "Show reminder details",
      discussion: "Use an index from the default show view or an ID prefix.",
      signature: CommandSignatures.withRuntimeFlags(
        CommandSignature(
          arguments: [
            .make(label: "id", help: "Index or ID prefix", isOptional: false)
          ]
        )
      ),
      usageExamples: [
        "remindctl info 1",
        "remindctl info 4A83",
        "remindctl info 4A83 --json",
      ]
    ) { values, runtime in
      guard let input = values.argument(0) else {
        throw ParsedValuesError.missingArgument("id")
      }

      let store = RemindersStore()
      try await store.requestAccess()
      let reminders = try await store.reminders(in: nil)
      let resolved = try CommandHelpers.resolveShowIdentifiers([input], from: reminders)
      guard let reminder = resolved.first else {
        throw RemindCoreError.reminderNotFound(input)
      }

      OutputRenderer.printReminderDetail(reminder, format: runtime.outputFormat)
    }
  }
}
