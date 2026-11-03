package za.co.santam.cc.contact.santamcard.testing

uses entity.OutboundFileConfig
uses gw.api.database.Query
uses gw.api.database.QuerySelectColumns
uses gw.api.database.Relop
uses gw.api.intentionallogging.IntentionalLogger
uses gw.api.outboundfile.BaseOutboundFileHandler
uses gw.api.path.Paths
uses gw.surepath.suite.integration.outbound.util.OutboundFileConfigFactory
uses org.slf4j.Marker
uses za.co.santam.cc.contact.santamcard.CourierFileSequenceGenerator
uses za.co.santam.cc.integration.properties.RuntimePropertiesUtil
uses za.co.santam.cc.util.SantamConstants

uses java.io.File

class TestCourierConfirmationFileHandler extends BaseOutboundFileHandler {

  construct(config : OutboundFileConfig) {
    super(config)
  }

  override function createFilename(batchID : String) : String {
    var santamCardCourierLocal = OutboundFileConfigFactory.makeConfig("SantamCardCourierLocal")
    var outboundRecord = Query.make(OutboundRecord)
        .compare(OutboundRecord#Config, Relop.Equals, santamCardCourierLocal)
        .compare(OutboundRecord#Status, Relop.Equals, OutboundRecordStatus.TC_PROCESSED)
        .select()
        .orderByDescending(QuerySelectColumns.path(Paths.make(OutboundRecord#CreateDate)))
        .first()

    var d = new File(outboundRecord.OutboundFile.FileName).NameSansExtension
    return d.replace("SANTAMCOURIER", "SantamCourierConfirmation")
  }
}