package santam.pc.lob.common.underwriting

uses gw.suites.PCExampleServerSuite
uses gw.testharness.v3.Suites
uses za.co.santam.suites.SantamServerTestSuite_Ext

@Suites(PCExampleServerSuite.NAME)
class HumanRiskEmailRuleTest extends AbstractHumanRiskRuleTest {

  function testFlaggedHumanRiskEmailRule() {
    var rule = new HumanRiskEmailRule()
    var accountHolder = PolicyPeriodInQuestion.Policy.Account.AccountHolderContact as Person
    accountHolder.EmailAddress1 = "flagged@santam.co.za"
    rule.execute(Context, PolicyPeriodInQuestion)
    assertTrue(PolicyPeriodInQuestion.UWIssuesActiveOnly.map(\uwIssue -> uwIssue.IssueType).contains(HumanRiskEmailReferralUWIssueType))
  }

  function testHumanRiskEmailRule() {
    var rule = new HumanRiskEmailRule()
    var accountHolder = PolicyPeriodInQuestion.Policy.Account.AccountHolderContact as Person
    accountHolder.EmailAddress1 = "gunit@santam.co.za"
    rule.execute(Context, PolicyPeriodInQuestion)
    assertFalse(PolicyPeriodInQuestion.UWIssuesActiveOnly.map(\uwIssue -> uwIssue.IssueType).contains(HumanRiskEmailReferralUWIssueType))
  }

}