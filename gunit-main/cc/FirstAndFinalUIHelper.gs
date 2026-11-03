package gw.api.claim

uses gw.api.locale.DisplayKey
uses entity.Address

@Export
class FirstAndFinalUIHelper {

  private var _claim : Claim

  construct (claim: Claim) {
    _claim = claim
  }

  property get IsAutoFirstAndFinalRelated(): boolean {
    return _claim.LossType == TC_AUTO &&
        _claim.State == TC_OPEN &&
        _claim.Exposures != null &&
        _claim.Exposures.length == 1 &&
        _claim.NumTransactions == 1
  }
}