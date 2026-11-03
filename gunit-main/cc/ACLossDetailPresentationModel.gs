package za.co.santam.cc.claim.lossdetail

uses gw.api.financials.CurrencyAmount
uses gw.api.locale.DisplayKey
uses za.co.santam.cc.claim.crop.CropHelper
uses za.co.santam.cc.claim.crop.FarmLandAssessment
uses za.co.santam.cc.util.CropConstants

uses java.math.RoundingMode

class ACLossDetailPresentationModel extends CropLossDetailPresentationModelBase {

 private static final var AMOUNT_ONLY_LOSS_CAUSES = {
     LossCause.TC_ACFIRE,
     LossCause.TC_ACINTRANSIT,
     LossCause.TC_ACINFRASTRUCTURE,
     LossCause.TC_ACREESTABLISHMENTCOST,
     LossCause.TC_ACFIREPOSTHARVEST,
     LossCause.TC_ACEXCESSIVERAIN,
     LossCause.TC_ACEXTENDEDPERIL
 }

 private var _estimatedDamagePercentage : Integer as EstimatedDamagePercentage
 private var _estimatedDamageAmount : CurrencyAmount as EstimatedDamageAmount
 private var _manualAssessmentLabel : String as ManualAssementLabel

 construct(claim : Claim) {
   super(claim)
   var farmLandIncident = claim.FarmLandIncidentsOnly.firstVerifiedIncident()
   _estimatedDamagePercentage = farmLandIncident.EstimatedDamagePercentage
   _estimatedDamageAmount = farmLandIncident.LossEstimate
 }

 private function amountOnlyLossCauseLossCauseOrManualClaimOfferings() : boolean {
   return AMOUNT_ONLY_LOSS_CAUSES.contains(getClaim().LossCause)
       or CropConstants.CROP_MANUAL_CLAIM_OFFERINGS.contains(getClaim().Policy.Offering_Ext) or CropConstants.REST_OF_AFRICA_POLICY_TYPES.contains(getClaim().Policy.PolicyType)
 }

 property get EstimatedDamagePercentageVisible() : boolean {

   if (CropHelper.isAmountOrPercentageValueLossCause(getClaim().LossCause)) return true

   return not amountOnlyLossCauseLossCauseOrManualClaimOfferings()
 }

 property get EstimatedDamageAmountVisible() : boolean {

   if (CropHelper.isAmountOrPercentageValueLossCause(getClaim().LossCause)) return true

   return amountOnlyLossCauseLossCauseOrManualClaimOfferings()
 }

 function farmLandIncidentsLabel() : String {
   var anyVerifiedIncident = getClaim().FarmLandIncidentsOnly.firstVerifiedIncident()
   if (anyVerifiedIncident == null or anyVerifiedIncident.farmLandRiskUnit() == null) {
     return DisplayKey.get("Santam.Loss.Details.Farm.Land.Incident.Farm.Land.Incidents", getClaim().LossLocation)
   }
   return DisplayKey.get("Santam.Loss.Details.Farm.Land.Incident.Farm.Land.Incidents", anyVerifiedIncident.farmLandRiskUnit().PolicyLocation)
 }

 function onEstimatedDamagePercentageChanged() {
   _estimatedDamageAmount = null
   if (_estimatedDamagePercentage != null) {
     calculateDamageValue()
   }
 }

 function onEstimatedDamageAmountChanged() {
   if (_estimatedDamageAmount != null) {
     if (CropHelper.isAmountOrPercentageValueLossCause(getClaim().LossCause)) {
       _estimatedDamagePercentage = null
     } else {
       var totalSumInsured = getClaim().FarmLandIncidentsOnly.sum(\farmLandIncident -> farmLandIncident.FarmLand.SumInsured)
       _estimatedDamagePercentage = (_estimatedDamageAmount.Amount / totalSumInsured.Amount * 100).setScale(0, RoundingMode.HALF_UP).intValue()
     }
   }
   calculateDamageValue()
 }

 function manualAssessment(assessmentType : FarmLandAssmntType_Ext) {
   if (assessmentType == FarmLandAssmntType_Ext.TC_1) {
     FarmLandAssessment.initialFarmLandAssessment(getClaim())
   } else {
     if (getClaim().State == ClaimState.TC_CLOSED) {
       reopenClaim(assessmentType)
     }
     FarmLandAssessment.createFarmLandAssessment(getClaim(), assessmentType)
   }
   _manualAssessmentLabel = assessmentType.DisplayName
 }

 function isEstimatesEditable() : boolean {
   return getClaim().FarmLandIncidentsOnly.allMatch(\farmLandIncident -> farmLandIncident.mostRecentAssessment()?.Status != FarmLandAssmntStatus_Ext.TC_COMPLETED)
       and not CropHelper.isPreInsurance(getClaim())
 }

 private function calculateDamageValue() {
   getClaim().FarmLandIncidentsOnly.each(\farmLandIncident -> {
     farmLandIncident.EstimatedDamagePercentage = _estimatedDamagePercentage
     farmLandIncident.LossEstimate = _estimatedDamageAmount
   })
   getClaim().FarmLandIncidentsOnly.calculateDamageValues()
 }

 private function reopenClaim(assessmentType : FarmLandAssmntType_Ext) {
   if (assessmentType == FarmLandAssmntType_Ext.TC_5) {
     reopenClaimAndExposures(TC_AGRICROPQUALITYCONTROL_EXT, TC_AGRICROPQUALITYCONTROL_EXT)
   } else if (assessmentType == FarmLandAssmntType_Ext.TC_7) {
     reopenClaimAndExposures(TC_AGRICROPREASSESSMENT_EXT, TC_AGRICROPREASSESSMENT_EXT)
   }
 }

 private function reopenClaimAndExposures(claimReopenedReason : ClaimReopenedReason, exposureReopenedReason : ExposureReopenedReason) {
   getClaim().reopen(claimReopenedReason, "")
   getClaim().Exposures.each(\exposure -> {
     if (exposure.State == ExposureState.TC_CLOSED) {
       exposure.reopen(exposureReopenedReason, "")
     }
   })
 }

 function canSendSettlementAdvice() : boolean {
   return perm.System.acsettlementadvice_Ext
       and (getClaim().FarmLandIncidentsOnly.HasElements
       and getClaim().FarmLandIncidentsOnly.hasMatch(\farmLandIncident -> farmLandIncident.DataConfirmed) and not CropConstants.REST_OF_AFRICA_POLICY_TYPES.contains(getClaim().Policy.PolicyType))
 }

 function canSelectPremiumOffsetIndicator() : boolean {
   return perm.System.acpremiumoffset_Ext
 }

 function validateEstimateCaptured() : String {

   if ((EstimatedDamagePercentageVisible and EstimatedDamagePercentage != null)
       and (EstimatedDamageAmountVisible and EstimatedDamageAmount != null)) {
     return DisplayKey.get("Santam.Validation.FarmLandIncident.Estimate.Amount.Percentage.Error")
   }

   return null
 }

 function canSelectManualAssessementButton() : boolean {
   return perm.System.acmanualassessment_Ext
 }


}
