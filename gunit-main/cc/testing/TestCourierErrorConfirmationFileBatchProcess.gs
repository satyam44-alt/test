package za.co.santam.cc.contact.santamcard.testing

uses gw.api.database.Query
uses gw.api.database.QuerySelectColumns
uses gw.api.database.Relop
uses gw.api.path.Paths
uses gw.surepath.suite.integration.outbound.util.OutboundFileConfigFactory
uses gw.surepath.suite.integration.outbound.util.OutboundRecordBuilder
uses za.co.santam.cc.common.SantamLoggers
uses za.co.santam.cc.integration.properties.PropertiesUtil

class TestCourierErrorConfirmationFileBatchProcess extends com.guidewire.outboundfile.batch.OutboundFileBatchProcess {

  construct() {
    this({OutboundFileConfigFactory.makeConfig("TestSantamCardCourierErrorConfirmation")})
  }

  construct(args : Object[]) {

    super(BatchProcessType.TC_TESTSANTAMCARDERRORCONFIRMATIONFILE_EXT,
        {
            OutboundFileConfigFactory.makeConfig("TestSantamCardCourierErrorConfirmation")
        })
  }

  static final var TEST_SANTAM_CARD_COURIER_ERROR_CONFIRMATION = OutboundFileConfigFactory.makeConfig("TestSantamCardCourierErrorConfirmation")
  static final var SANTAM_CARD_COURIER_LOCAL = OutboundFileConfigFactory.makeConfig("SantamCardCourierLocal")

  override function doWork() {
    var test = (PropertiesUtil.getInstance().getProperty("TestSantamCardErrorConfirmation")?.toLowerCase() ?: "").trim().split(" ")
    SantamLoggers.SANTAMCARD.logInfo("TestSantamCardErrorConfirmation:[${test.join(" ")}]")

    switch (test?.first()) {
      case "make_a_file_that_indicates_no_records":
        make_a_file_that_indicates_no_records()
        break;
      case "make_a_file":
        make_a_file(test)
        break;
      case "make_a_file_that_contains_error_confirmations":
        make_a_file_that_contains_confirmations(test)
      default:
        SantamLoggers.SANTAMCARD.newStructuredLoggerMap(#doWork())
            .withMessage("No tests executed. TestSantamCardErrorConfirmation:[${test.join(" ")}]")
            .logError()
        break;
    }

    super.doWork()
  }

  private function make_a_file_that_contains_confirmations(test : String[]) {
    gw.transaction.Transaction.runWithNewBundle(\b -> {
      var elt = getLastProcessedOutboundRecord()
      if (elt == null) {
        return
      }
      var splitContent = elt.Content
          .split("\n")
          .reduce(new ArrayList<String>(), \agg, item -> {
            if (not item.startsWith("T")) {
              agg.add(item)
            }
            return agg
          })
      var body = splitContent
          .mapWithIndex(\item, idx -> {
            var errorCode = test.length > 1 ? test[1] : "GN"
            var santamCardResponseExt = SantamCardResponse_Ext.get(errorCode)
            return "${item},,,${santamCardResponseExt.Code},${santamCardResponseExt.DisplayName}"
          })
          .toSet()
          .join("\n")
          .trim()
      var fileName = new java.io.File(elt.OutboundFile.FileName).NameSansExtension
      var fileSequence = fileName
          .split("_")
          .first()

      fileSequence = gw.util.GosuStringUtil.leftPad(fileSequence, 12, "0")
      var i = test.length > 2 ? Integer.parseInt(test[2]) : 0
      var counter = "${splitContent.Count - i}"
      counter = gw.util.GosuStringUtil.leftPad(counter, 12, "0")
      var tail = "T${fileSequence},${counter},${"0".repeat(12)}"
      var content = {body, tail}.join("\n").trim()
      var outboundRecord = new OutboundRecordBuilder()
          .withConfig(TEST_SANTAM_CARD_COURIER_ERROR_CONFIRMATION)
          .withContent(content)
          .build()
      b.add(outboundRecord)
    }, User.util.UnrestrictedUser)
  }

  private function make_a_file_that_indicates_no_records() {
    gw.transaction.Transaction.runWithNewBundle(\b -> {
      var lastOutboundRecord : OutboundRecord = getLastProcessedOutboundRecord()
      if (lastOutboundRecord == null) {
        return
      }
      var fileName = new java.io.File(lastOutboundRecord.OutboundFile.FileName).NameSansExtension
      var fileSequence = fileName
          .split("_")
          .first()

      fileSequence = gw.util.GosuStringUtil.leftPad(fileSequence, 12, "0")
      var counter = "0".repeat(12)
      var tail = "T${fileSequence},${counter},${"0".repeat(12)}"
      var content = tail
      var outboundRecord = new OutboundRecordBuilder()
          .withConfig(TEST_SANTAM_CARD_COURIER_ERROR_CONFIRMATION)
          .withContent(content)
          .build()
      b.add(outboundRecord)
    }, User.util.UnrestrictedUser)
  }

  private function make_a_file(test : String[]) {
    gw.transaction.Transaction.runWithNewBundle(\b -> {
      var content = test.length > 2 ? test[2] : " "
      var outboundRecord = new OutboundRecordBuilder()
          .withConfig(TEST_SANTAM_CARD_COURIER_ERROR_CONFIRMATION)
          .withContent(content)
          .build()
      b.add(outboundRecord)
    }, User.util.UnrestrictedUser)
  }

  private function getLastProcessedOutboundRecord() : OutboundRecord {
    return Query.make(OutboundRecord)
        .compare(OutboundRecord#Config, Relop.Equals, SANTAM_CARD_COURIER_LOCAL)
        .compare(OutboundRecord#Status, Relop.Equals, OutboundRecordStatus.TC_PROCESSED)
        .select()
        .orderBy(QuerySelectColumns.path(Paths.make(OutboundRecord#ID)))
        .last();
  }

}