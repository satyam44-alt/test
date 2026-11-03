package gw.api.claim

/**
 * Formatter UI helper for the list of claim Claimants displayed in ListViews using comma separator
 */
@Export
class ClaimantsUIHelper {

  var _claimantList : String[] as readonly ClaimantList

  construct (claimantList: String[]) {
    _claimantList = claimantList
  }

  property get FormattedClaimantList() : String {
    return _claimantList.join(", ")
  }

}