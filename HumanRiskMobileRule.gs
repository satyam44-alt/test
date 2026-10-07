package santam.pc.lob.common.underwriting

uses gw.api.database.Query
uses gw.api.database.Relop
uses gw.api.locale.DisplayKey
uses gw.policy.PolicyEvalContext
uses za.co.santam.pc.rules.UWRuleBase
uses za.co.santam.pc.rules.Underwrites

@Underwrites(PolicyPeriod)
class HumanRiskMobileRule extends UWRuleBase {

  private var _uwRuleCode : String as UWRuleCode = "HumanRiskMobileNumberReferral"
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

    if(TargetProducts.contains(period.Policy.ProductCode)) {
      period.AccountContactRoleMap
            .filterByValues(\filterByValue -> filterByValue.hasMatch(\value -> TargetInsuredTypes.Keys.contains(typeof value)))
            .filterByKeys(\filterByKey -> typeof filterByKey.Contact == Person and ((filterByKey.Contact as Person).GWCellPhone != null and not(filterByKey.Contact as Person).GWCellPhone.NationalNumber.trim().Empty))
            .eachKeyAndValue(\key, value -> {

              var person = key.Contact as Person
              var cellPhone = person.GWCellPhone
              var formattedNationalNumber = cellPhone.NationalNumberFormatted

              var hits = Query.make(HumanRiskContactDetail_Ext)
                  .compare(HumanRiskContactDetail_Ext#TypeOfContactDetail, Relop.Equals, HumanRiskContactType_Ext.TC_MOBILE_NUMBER)
                  .compare(HumanRiskContactDetail_Ext#ContactInformation, Relop.Equals, formattedNationalNumber)
                  .join(HumanRiskContactDetail_Ext#HumanRisk)
                  .select()

              if (hits.HasElements) {
                var contactIDNumber = person.TaxID
                var conflictingIDNumbers = hits.map(\hit -> hit.HumanRisk.IDNumber).toSet().join(",")
                var uwRuleKey = UWRuleCode + contactIDNumber + cellPhone

                var shortDescription = \-> DisplayKey.get("UWIssue.AllLines.HumanRisk.ContactDetails.Mobile.ShortDesc")
                var longDescription = \-> DisplayKey.get("UWIssue.AllLines.HumanRisk.ContactDetails.Mobile.LongDesc", cellPhone, TargetInsuredTypes.get(typeof determineInsuredType(value)), contactIDNumber, conflictingIDNumbers)
                context.addIssue(UWRuleCode, uwRuleKey, shortDescription, longDescription)
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