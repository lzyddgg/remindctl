import Testing

@testable import remindctl

@MainActor
struct ListCommandTests {
  @Test("Multiple list names are allowed for read-only listing")
  func multipleNamesAllowedForListing() throws {
    let name = try ListCommand.singleListName(["Work", "Home"], forMutation: false)
    #expect(name == "Work")
  }

  @Test("Multiple list names are rejected for mutations")
  func multipleNamesRejectedForMutations() {
    #expect(throws: Error.self) {
      _ = try ListCommand.singleListName(["Work", "Home"], forMutation: true)
    }
  }
}
