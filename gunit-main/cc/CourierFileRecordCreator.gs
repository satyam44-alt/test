package za.co.santam.cc.contact.santamcard

uses gw.api.database.Query
uses gw.api.database.Relop
uses gw.surepath.suite.integration.outbound.util.OutboundFileConfigFactory
uses gw.surepath.suite.integration.outbound.util.OutboundRecordBuilder
uses org.apache.commons.lang3.StringUtils
uses za.co.santam.cc.common.SantamLoggers
uses za.co.santam.cc.integration.properties.RuntimePropertiesUtil
uses za.co.santam.cc.util.SantamConstants

class CourierFileRecordCreator {

  final static var logger = SantamLoggers.SANTAMCARD

  static function createOutboundRecordForPendingSendSantamCardRequests() : OutboundRecord {
    var openSantamCardSendRequests = getOpenSantamCardSendRequests()

    logger.newStructuredLoggerMap(#createOutboundRecordForPendingSendSantamCardRequests())
        .withMessage("Total open SantamCard requests: ${openSantamCardSendRequests.Count}")
        .logDebugIfEnabled()

    if (not openSantamCardSendRequests.HasElements) {
      logger.newStructuredLoggerMap(#createOutboundRecordForPendingSendSantamCardRequests())
          .withMessage("There are no open Santam Card requests.")
          .logInfo()
      return null
    }

    var content = getContent(openSantamCardSendRequests)
    logger.newStructuredLoggerMap(#createOutboundRecordForPendingSendSantamCardRequests())
        .withMessage("Content created.")
        .addToParameters("ContentHash", content?.hashCode())
        .logDebugIfEnabled()

    var outboundRecord : OutboundRecord
    gw.transaction.Transaction.runWithNewBundle(\bundle -> {
      outboundRecord = createOutboundRecord(content)
      updateSantamCardHistory(openSantamCardSendRequests, outboundRecord)
    }, User.util.CurrentUser)

    logger.newStructuredLoggerMap(#createOutboundRecordForPendingSendSantamCardRequests())
        .withMessage("Updated ${openSantamCardSendRequests.Count} open SantamCard requests as processed for outbound record #: ${outboundRecord.Content.hashCode()}.")
        .addToParameters("outboundRecord.ContentHash", outboundRecord.Content.hashCode())
        .logInfo()

    return outboundRecord
  }

  private static function getContent(openSantamCardSendRequests : List<SantamCardHistory_Ext>) : String {
    var cardsForCourierFileEntries = openSantamCardSendRequests
        .map(\elt -> elt.Card.CourierFileEntry)
        .toSet()
    var body = cardsForCourierFileEntries
        .join("\n")
    var count = StringUtils.leftPad("${cardsForCourierFileEntries.Count}", 12, "0")
    var eof = "0".repeat(12)
    var footer = "T${count},${eof}"
    return {body, footer}.join("\n").trim()
  }

  private static function getOpenSantamCardSendRequests() : List<SantamCardHistory_Ext> {
    return Query.make(SantamCardHistory_Ext)
        .compare(SantamCardHistory_Ext#ClaimNumber, Relop.NotEquals, null)
        .compare(SantamCardHistory_Ext#OutboundRecordID, Relop.Equals, null)
        .compare(SantamCardHistory_Ext#CardStatus, Relop.Equals, SantamCardStatus_Ext.TC_SEND)
        .select()
        .toList()
  }

  private static function updateSantamCardHistory(openSantamCardSendRequests : List<SantamCardHistory_Ext>, outboundRecord : OutboundRecord) {
    var bundle = gw.transaction.Transaction.Current
    openSantamCardSendRequests.each(\santamCardHistoryExt -> {
      santamCardHistoryExt = bundle.add(santamCardHistoryExt)
      santamCardHistoryExt.OutboundRecordHash = outboundRecord.Content.hashCode()
    })
  }

  private static function createOutboundRecord(content : String) : OutboundRecord {
    var config = OutboundFileConfigFactory.makeConfig(RuntimePropertiesUtil.getRuntimeProperty(
        RuntimePropertyGroup.TC_INTEGRATION,
        SantamConstants.OUTBOUND_CONFIG_NAME))

    var outboundRecord : OutboundRecord
    var bundle = gw.transaction.Transaction.Current
    outboundRecord = new OutboundRecordBuilder()
        .withConfig(config)
        .withContent(content)
        .build()
    outboundRecord = bundle.add(outboundRecord)
    return outboundRecord
  }

}

