package santam.pc.lob.common.uwsegmentation

uses gw.api.database.Query
uses gw.api.database.Relop
uses za.co.santam.common.SantamLoggers

uses java.math.BigDecimal

class AffinityGroupSegmentation {
  private var _period : PolicyPeriod
  private final var _commodityLowLimit = 5000000bd // 5 mil
  private final var _commodityLimit = 30000000bd // 30 mil
  private final var _specialistLimitLow = 150000000bd // 150 mil
  private final var _specialistLimitMid = 250000000bd // 250 mil
  private final var _specialistLimitHigh = 500000000bd // 500 mil
  private final var _liabilityLimit = 10000000bd // 10 mil
  private var _logger = SantamLoggers.CLSegmentation


  construct(policyPeriod : PolicyPeriod) {
    _period = policyPeriod
  }


  function assignToPeriod() {
    var propertyReinsurables = _period?.AllReinsurables?.where(\reinsurable -> reinsurable.CoverageGroup == RICoverageGroupType.TC_PROPERTY)
    var policySubmsnNumber = determinePolicyOrSubmissionNumber()
    var liabilityAmount = determineLiabilityAmount(policySubmsnNumber)


    //liability section is on policy, no property section
    if (evaluateLiabilitySectionOnly(liabilityAmount, propertyReinsurables.HasElements, policySubmsnNumber))
      return


    //property section is on policy, no liability section
    var highestTotalInsuredValue = propertyReinsurables.sortByDescending(\reinsurable -> reinsurable.TotalInsuredValue.Amount).first().TotalInsuredValue.Amount
    if (evaluatePropertySectionOnly(propertyReinsurables, policySubmsnNumber, highestTotalInsuredValue))
      return


    //both property and liability sections are on policy (specialist does not require a liability check)
    var highestUWReinsurable = propertyReinsurables.sortByDescending(\reinsurable -> reinsurable.HighestOccAsUWRiskCode).first().HighestOccAsUWRiskCode
    var hasQualifyingLiability = liabilityAmount > 0 and liabilityAmount <= _liabilityLimit
    var message = "Policy/Submission '${policySubmsnNumber}' found with InsuredValue: ${highestTotalInsuredValue}, UWRiskCode: ${highestUWReinsurable}, liability: ${liabilityAmount}. Updating AffinityGroup to "


    if (evaluateComodityLow(highestTotalInsuredValue, highestUWReinsurable, hasQualifyingLiability, policySubmsnNumber, message))
      return


    if (evaluateComodity(highestTotalInsuredValue, highestUWReinsurable, hasQualifyingLiability, policySubmsnNumber, message))
      return


    if (evaluateSpecialist(highestTotalInsuredValue, highestUWReinsurable, policySubmsnNumber, message))
      return


    // default to 'Complex' when it does not match any of the criteria for other AffinityGroups
    updateAffinityGroup(:affinityGroupName = AffinityGroupName_Ext.TC_COMPLEX.DisplayName,
        :policySubmsnNumber = policySubmsnNumber,
        :message = message)
  }


  public function evaluateLiabilitySectionOnly(liabilityAmount : BigDecimal, hasPropertyReinsurables : boolean, policySubmsnNumber : String) : boolean {
    if (_period.LIALineExists and not hasPropertyReinsurables) {
      if (liabilityAmount <= _liabilityLimit) {
        updateAffinityGroup(:affinityGroupName = AffinityGroupName_Ext.TC_COMMODITYLOW.DisplayName,
            :policySubmsnNumber = policySubmsnNumber,
            :message = "Policy/Submission '${policySubmsnNumber}' found with liability only (${liabilityAmount}), updating AffinityGroup to ")

        return true
      } else {
        updateAffinityGroup(:affinityGroupName = AffinityGroupName_Ext.TC_COMPLEX.DisplayName,
            :policySubmsnNumber = policySubmsnNumber,
            :message = "Policy/Submission '${policySubmsnNumber}' found with liability only (${liabilityAmount}), updating AffinityGroup to ")

        return true
      }
    }

    return false
  }


  public function evaluatePropertySectionOnly(propertyReinsurables : List<Reinsurable>, policySubmsnNumber : String, highestTotalInsuredValue : BigDecimal) : boolean {
    if (propertyReinsurables.HasElements and not _period.LIALineExists) {
      if (highestTotalInsuredValue < _commodityLowLimit) {
        updateAffinityGroup(:affinityGroupName = AffinityGroupName_Ext.TC_COMMODITYLOW.DisplayName,
            :policySubmsnNumber = policySubmsnNumber,
            :message = "Policy/Submission '${policySubmsnNumber}' found without liability, TIV (${highestTotalInsuredValue}), updating AffinityGroup to ")

        return true
      } else if (highestTotalInsuredValue > _commodityLowLimit and highestTotalInsuredValue < _commodityLimit) {
        updateAffinityGroup(:affinityGroupName = AffinityGroupName_Ext.TC_COMMODITY.DisplayName,
            :policySubmsnNumber = policySubmsnNumber,
            :message = "Policy/Submission '${policySubmsnNumber}' found without liability, TIV (${highestTotalInsuredValue}), updating AffinityGroup to ")

        return true
      }
    }

    return false
  }


  public function evaluateComodityLow(highestTotalInsuredValue : BigDecimal, highestUWReinsurable : String, hasQualifyingLiability : boolean, policySubmsnNumber : String, message : String) : boolean {
    if ((highestUWReinsurable >= "AA" and highestUWReinsurable <= "CZ")
        and highestTotalInsuredValue < _commodityLowLimit
        and hasQualifyingLiability) {

      updateAffinityGroup(:affinityGroupName = AffinityGroupName_Ext.TC_COMMODITYLOW.DisplayName,
          :policySubmsnNumber = policySubmsnNumber,
          :message = message)

      return true
    }

    return false
  }


  public function evaluateComodity(highestTotalInsuredValue : BigDecimal, highestUWReinsurable : String, hasQualifyingLiability : boolean, policySubmsnNumber : String, message : String) : boolean {
    if ((highestUWReinsurable >= "AA" and highestUWReinsurable <= "AK")
        and (highestTotalInsuredValue > _commodityLowLimit and highestTotalInsuredValue < _commodityLimit)
        and hasQualifyingLiability) {

      updateAffinityGroup(:affinityGroupName = AffinityGroupName_Ext.TC_COMMODITY.DisplayName,
          :policySubmsnNumber = policySubmsnNumber,
          :message = message)

      return true
    }

    return false
  }


  public function evaluateSpecialist(highestTotalInsuredValue : BigDecimal, highestUWReinsurable : String, policySubmsnNumber : String, message : String) : boolean {
    if ((highestUWReinsurable >= "AT" and highestUWReinsurable <= "CZ") and highestTotalInsuredValue >= _specialistLimitLow) {
      updateAffinityGroup(:affinityGroupName = AffinityGroupName_Ext.TC_SPECIALIST.DisplayName,
          :policySubmsnNumber = policySubmsnNumber,
          :message = message)

      return true
    }


    if ((highestUWReinsurable >= "AD" and highestUWReinsurable <= "AS") and highestTotalInsuredValue >= _specialistLimitMid) {
      updateAffinityGroup(:affinityGroupName = AffinityGroupName_Ext.TC_SPECIALIST.DisplayName,
          :policySubmsnNumber = policySubmsnNumber,
          :message = message)

      return true
    }


    if ({"AA", "AB", "AC"}.contains(highestUWReinsurable) and highestTotalInsuredValue >= _specialistLimitHigh) {
      updateAffinityGroup(:affinityGroupName = AffinityGroupName_Ext.TC_SPECIALIST.DisplayName,
          :policySubmsnNumber = policySubmsnNumber,
          :message = message)

      return true
    }

    return false
  }


  private function updateAffinityGroup(affinityGroupName : String, policySubmsnNumber : String, message : String) {
    var affinityGroup = Query.make(AffinityGroup)
        .compare(AffinityGroup#Name, Relop.Equals, affinityGroupName)
        .select().AtMostOneRow

    if (null != affinityGroup) {
      message += "'${affinityGroupName}'"
      SantamLoggers.logIfDebugEnabled(_logger, message, AffinityGroupSegmentation#updateAffinityGroup(String, String, String))
      _period.PolicyTerm.AffinityGroup = affinityGroup
    } else {
      SantamLoggers.logIfDebugEnabled(_logger, "Policy/Submission '${policySubmsnNumber}' no affinity group found using '${affinityGroupName}', no action will be taken", AffinityGroupSegmentation#updateAffinityGroup(String, String, String))
    }
  }


  private function determinePolicyOrSubmissionNumber() : String {
    if (null != _period.PolicyNumber)
      return _period.PolicyNumber
    else
      return _period.Job.JobNumber
  }


  private function determineLiabilityAmount(policySubmsnNumber : String) : BigDecimal {
    var liabilityAmount = 0bd
    try {
      if (_period.LIALineExists) {
        liabilityAmount = _period.LIALine.LIAItem_Ext.sortByDescending(\item -> item.LIAGeneralLiability.LIAGenLiabLimitOfIndemnityEventTerm.Value)
            .first()?.LIAGeneralLiability?.LIAGenLiabLimitOfIndemnityEventTerm?.Value
      }
    } catch (e : Exception) {
      liabilityAmount = 0bd
      _logger.error("Error encounter with assigning liability amount for Policy/Submission '${policySubmsnNumber}', setting amount to 0",
          AffinityGroupSegmentation#determineLiabilityAmount(), e)
    }

    return liabilityAmount
  }


}