import Foundation
import Testing

@testable import RemindCore
@testable import remindctl

@MainActor
struct SearchCommandTests {
  @Test("Search matches title, notes, and URL case-insensitively")
  func searchMatchesCommonTextFields() {
    let reminder = ReminderItem(
      id: "ABCD-1234",
      title: "Review Launch Plan",
      notes: "Bring invoice numbers",
      url: URL(string: "https://example.com/Specs"),
      isCompleted: false,
      completionDate: nil,
      priority: .none,
      dueDate: nil,
      listID: "LIST-1",
      listName: "Work"
    )

    #expect(CommandHelpers.reminder(reminder, matchesSearch: "launch"))
    #expect(CommandHelpers.reminder(reminder, matchesSearch: "INVOICE"))
    #expect(CommandHelpers.reminder(reminder, matchesSearch: "specs"))
    #expect(!CommandHelpers.reminder(reminder, matchesSearch: "missing"))
    #expect(!CommandHelpers.reminder(reminder, matchesSearch: "   "))
  }
}
