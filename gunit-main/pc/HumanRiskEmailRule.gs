package santam.pc.lob.common.underwriting

uses gw.api.database.DBFunction
uses gw.api.database.Query
uses gw.api.database.QuerySelectColumns
uses gw.api.database.Relop
uses gw.api.locale.DisplayKey
uses gw.api.path.Paths
uses gw.policy.PolicyEvalContext
uses za.co.santam.pc.rules.UWRuleBase
uses za.co.santam.pc.rules.Underwrites

@Underwrites(PolicyPeriod)
class HumanRiskEmailRule extends UWRuleBase {

  private var _uwRuleCode : String as UWRuleCode = "HumanRiskEmailReferral"
  private var _targetProducts : List as TargetProducts = {SPPPersonalProperty.Type.RelativeName, NamibiaPersonal.Type.RelativeName}

  private var _targetInsuredTypes : Map<Type<PolicyContactRole>, String> as TargetInsuredTypes = {
      PolicyPriNamedInsured -> "Primary Named insured",
      PolicyAddlNamedInsured -> "Additional named insured",
      PolicyDriver -> "Regular driver"
  }

  override property get CheckingSet() : UWIssueCheckingSet[] {
    return {UWIssueCheckingSet.TC_PREQUOTE}
  }

  protected override function execute(context : PolicyEvalContext, period : PolicyPeriod) {

    if(TargetProducts.contains(period.Policy.ProductCode)){
      period.AccountContactRoleMap
            .filterByValues(\filterByValue -> filterByValue.hasMatch(\value -> TargetInsuredTypes.Keys.contains(typeof value)))
            .filterByKeys(\filterByKey -> typeof filterByKey.Contact == Person and ((filterByKey.Contact.EmailAddress1 != null and not filterByKey.Contact.EmailAddress1.trim().Empty) or (filterByKey.Contact.EmailAddress2 != null and not filterByKey.Contact.EmailAddress2.trim().Empty)))
            .eachKeyAndValue(\key, value -> {

              var contact = key.Contact
              var possibleEmailConflicts = new ArrayList<String>()

              if (contact.EmailAddress1 != null and not contact.EmailAddress1.trim().Empty) {
                possibleEmailConflicts.add(contact.EmailAddress1)
              }

              if (contact.EmailAddress2 != null and not contact.EmailAddress2.trim().Empty) {
                possibleEmailConflicts.add(contact.EmailAddress2)
              }

              if (possibleEmailConflicts.HasElements) {

                var hits = Query.make(HumanRiskContactDetail_Ext)
                    .compare(HumanRiskContactDetail_Ext#TypeOfContactDetail, Relop.Equals, HumanRiskContactType_Ext.TC_EMAIL)
                    .and(\andRestriction -> {
                      andRestriction.or(\orRestriction -> {
                        possibleEmailConflicts.each(\possibleEmailConflict -> {
                          orRestriction.compareIgnoreCase(HumanRiskContactDetail_Ext#ContactInformation, Relop.Equals, possibleEmailConflict)
                        })
                      })
                    })
                    .join(HumanRiskContactDetail_Ext#HumanRisk)
                    .select()

                if (hits.HasElements) {
                  var contactIDNumber = contact.TaxID
                  var conflictingEmails = hits.map(\hit -> hit.ContactInformation).toSet().join(", ")
                  var conflictingIDNumbers = hits.map(\hit -> hit.HumanRisk.IDNumber).toSet().join(",")
                  var uwRuleKey = UWRuleCode + contactIDNumber + conflictingEmails
                  var shortDescription = \-> DisplayKey.get("UWIssue.AllLines.HumanRisk.ContactDetails.Email.ShortDesc")
                  var longDescription = \-> DisplayKey.get("UWIssue.AllLines.HumanRisk.ContactDetails.Email.LongDesc", conflictingEmails, TargetInsuredTypes.get(typeof determineInsuredType(value)), contactIDNumber, conflictingIDNumbers)

                  context.addIssue(UWRuleCode, uwRuleKey, shortDescription, longDescription)
                }

              }

          })
    }

  }

  private function determineInsuredType(policyContactRoles : List<PolicyContactRole>) : PolicyContactRole{
    var contactRoles = new ArrayList<PolicyContactRole>()
    TargetInsuredTypes.Keys.each(\key -> {
      contactRoles.addAll(policyContactRoles.whereTypeIs(key))
    })
    return contactRoles.first()
  }

}