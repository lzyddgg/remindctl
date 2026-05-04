import Foundation
import Testing

@testable import RemindCore

@MainActor
struct ReminderItemCodingTests {
  @Test("JSON includes creation date")
  func jsonIncludesCreationDate() throws {
    let item = ReminderItem(
      id: "abc",
      title: "Created",
      notes: nil,
      isCompleted: false,
      completionDate: nil,
      creationDate: Date(timeIntervalSince1970: 1_700_000_000),
      priority: .none,
      dueDate: nil,
      listID: "list",
      listName: "Inbox"
    )

    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601
    let data = try encoder.encode(item)
    let json = try #require(String(data: data, encoding: .utf8))
    #expect(json.contains(#""creationDate""#))
  }
}
