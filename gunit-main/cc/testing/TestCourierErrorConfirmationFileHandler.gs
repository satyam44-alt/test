package za.co.santam.cc.contact.santamcard.testing

uses entity.OutboundFileConfig
uses gw.api.database.Query
uses gw.api.database.QuerySelectColumns
uses gw.api.database.Relop
uses gw.api.outboundfile.BaseOutboundFileHandler
uses gw.api.path.Paths
uses gw.surepath.suite.integration.outbound.util.OutboundFileConfigFactory
uses za.co.santam.cc.integration.properties.PropertiesUtil

uses java.io.File

class TestCourierErrorConfirmationFileHandler extends BaseOutboundFileHandler {

  construct(config : OutboundFileConfig) {
    super(config)
  }

  override function createFilename(batchID : String) : String {
    var test = (PropertiesUtil.getInstance().getProperty("TestSantamCardErrorConfirmation")?.toLowerCase() ?: "").trim().split(" ")
    switch (test?.first()) {
      case "make_a_file":
        var sequence = test.length > 1 ? test[1] : "0_0"
        return "${sequence}_SantamCourierConfirmation"
      default:
        return getFileNameFromOutboundRecord()
    }
  }

  private function getFileNameFromOutboundRecord() : String {
    var santamCardCourierLocal = OutboundFileConfigFactory.makeConfig("SantamCardCourierLocal")
    var outboundRecord = Query.make(OutboundRecord)
        .compare(OutboundRecord#Config, Relop.Equals, santamCardCourierLocal)
        .compare(OutboundRecord#Status, Relop.Equals, OutboundRecordStatus.TC_PROCESSED)
        .select()
        .orderByDescending(QuerySelectColumns.path(Paths.make(OutboundRecord#CreateDate)))
        .first()

    if (outboundRecord != null) {
      var filename = new File(outboundRecord.OutboundFile.FileName).NameSansExtension
      var suffix = PropertiesUtil.getInstance().getProperty("TestSantamCardConfirmationFileSuffix") ?: "SantamCourierConfirmation"
      return filename.replace("SANTAMCOURIER", suffix)
    } else {
      return "0_0_SantamCourierConfirmation"
    }
  }
}