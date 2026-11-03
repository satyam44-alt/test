package za.co.santam.cc.contact.santamcard

uses gw.api.database.Query
uses gw.api.database.Relop
uses gw.api.util.DateUtil
uses za.co.santam.cc.common.SantamLoggers

class CourierFileRecordProcessor {
  final static var logger = SantamLoggers.SANTAMCARD

  static function updateProcessedSantamCards(outboundRecord : OutboundRecord) {
    var outboundRecordHash = outboundRecord.Content.hashCode()

    var openSantamCardSendRequests = Query.make(SantamCardHistory_Ext)
        .compare(SantamCardHistory_Ext#OutboundRecordHash, Relop.Equals, outboundRecordHash)
        .compare(SantamCardHistory_Ext#OutboundRecordID, Relop.Equals, null)
        .compare(SantamCardHistory_Ext#ClaimNumber, Relop.NotEquals, null)
        .select()

    if(logger.DebugEnabled) {
      var claimnumbers = openSantamCardSendRequests.map(\elt -> elt.ClaimNumber).join(",")
      logger.newStructuredLoggerMap(#updateProcessedSantamCards(OutboundRecord))
          .withMessage("Updating ${openSantamCardSendRequests.Count} processed SantamCards for outbound record #: ${outboundRecordHash}")
          .addToParameters("Claims", claimnumbers)
          .logDebug()
    }

    if (openSantamCardSendRequests.HasElements) {
      gw.transaction.Transaction.runWithNewBundle(\bundle -> {
        var effectiveDate = DateUtil.currentDate()
        openSantamCardSendRequests.each(\openSantamCardSendRequest -> {
          if (openSantamCardSendRequest.Card.LatestHistory == openSantamCardSendRequest) {
            openSantamCardSendRequest = bundle.add(openSantamCardSendRequest)
            openSantamCardSendRequest.OutboundRecordID = outboundRecord.ID.Value
            openSantamCardSendRequest.Card.moveToPending(effectiveDate)
          }
        })
      }, User.util.CurrentUser)
    }
  }
}