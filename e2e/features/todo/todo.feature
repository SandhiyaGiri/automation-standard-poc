@todo
Feature: Todo list

  @TODO-ADD @Regression
  Scenario: Add tasks to the list
    When I add the tasks "Write test plan, Review pull request, Update release notes"
    Then I should see the tasks "Write test plan, Review pull request, Update release notes" in the "All" view

  @TODO-COMPLETE @Regression
  Scenario: Complete a task and clear it
    Given I add the tasks "Write test plan, Review pull request"
    When I complete the task "Write test plan"
    Then I should see the task "Write test plan" in the "Completed" view
    And I should not see the task "Write test plan" in the "Active" view
    When I clear completed tasks
    Then I should not see the task "Write test plan" in the "All" view
    And I should see the task "Review pull request" in the "All" view

  @TODO-FILTER @Regression
  Scenario: Filter tasks by status
    Given I add the tasks "Task A, Task B, Task C"
    When I complete the task "Task B"
    Then I should see the task "Task A" in the "Active" view
    And I should not see the task "Task B" in the "Active" view
    And I should see the task "Task B" in the "Completed" view
    And I should see the tasks "Task A, Task B, Task C" in the "All" view
