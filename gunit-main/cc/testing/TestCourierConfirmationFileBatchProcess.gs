package za.co.santam.cc.contact.santamcard.testing

uses gw.api.database.Query
uses gw.api.database.QuerySelectColumns
uses gw.api.database.Relop
uses gw.api.path.Paths
uses gw.surepath.suite.integration.outbound.util.OutboundFileConfigFactory
uses gw.surepath.suite.integration.outbound.util.OutboundRecordBuilder

class TestCourierConfirmationFileBatchProcess extends com.guidewire.outboundfile.batch.OutboundFileBatchProcess {

  construct() {
    this({OutboundFileConfigFactory.makeConfig("TestSantamCardCourierConfirmation")})
  }

  construct(args : Object[]) {

    super(BatchProcessType.TC_TESTSANTAMCARDCONFIRMATIONFILE_EXT,
        {
            OutboundFileConfigFactory.makeConfig("TestSantamCardCourierConfirmation")
        })
  }

  override function doWork() {
    var testSantamCardCourierConfirmation = OutboundFileConfigFactory.makeConfig("TestSantamCardCourierConfirmation")
    var santamCardCourierLocal = OutboundFileConfigFactory.makeConfig("SantamCardCourierLocal")
    gw.transaction.Transaction.runWithNewBundle(\b -> {
      var elt = Query.make(OutboundRecord)
          .compare(OutboundRecord#Config, Relop.Equals, santamCardCourierLocal)
          .compare(OutboundRecord#Status, Relop.Equals, OutboundRecordStatus.TC_PROCESSED)
          .select()
          .orderBy(QuerySelectColumns.path(Paths.make(OutboundRecord#ID)))
          .last()
      if (elt == null) {
        return
      }
      var splitContent = elt.Content
          .split("\n")
      var body = splitContent
          .mapWithIndex(\item, idx -> changeContent(item, idx, splitContent.Count))
          .toSet()
          .join("\n")
          .trim()
      var fileName = new java.io.File(elt.OutboundFile.FileName).NameSansExtension
      var fileSequence = fileName
          .split("_")
          .first()

      fileSequence = gw.util.GosuStringUtil.leftPad(fileSequence, 12, "0")
      var counter = "${splitContent.Count - 1}"
      counter = gw.util.GosuStringUtil.leftPad(counter, 12, "0")
      var tail = "T${fileSequence},${counter},${"0".repeat(12)}"
      var content = {body, tail}.join("\n").trim()
      var outboundRecord = new OutboundRecordBuilder()
          .withConfig(testSantamCardCourierConfirmation)
          .withContent(content)
          .build()
      b.add(outboundRecord)
    }, User.util.UnrestrictedUser)
    super.doWork()
  }

  private function changeContent(content : String, i : Integer, count : Integer) : String {
    if (i < count - 1) {
      var cardNumber = "1234********${(gw.util.GosuStringUtil.leftPad(i.toString(), 4, "0"))}"
      return "${content},${cardNumber},,00,Approved or completed successfully"
    } else {
      return ""
    }
  }


}