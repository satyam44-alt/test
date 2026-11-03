package za.co.santam.cc.contact.santamcard

uses gw.api.database.Query
uses gw.api.database.Relop
uses za.co.santam.cc.integration.properties.RuntimePropertiesUtil
uses za.co.santam.cc.util.SantamConstants


class CourierConfirmationFileBatchProcess extends  com.guidewire.inboundfile.batch.InboundFileBatchProcess {

  static final var BATCH_NAME = "CourierConfirmationFileBatchProcess"

  construct() {
    super(BatchProcessType.TC_SANTAMCARDCONFIRMATIONFILE_EXT, getInboundConfigs(), BATCH_NAME)
  }

  static function getInboundConfigs() : List<InboundFileConfig> {
    return Query.make(InboundFileConfig)
        .compare(InboundFileConfig#Name, Relop.Equals, RuntimePropertiesUtil.getRuntimeProperty(RuntimePropertyGroup.TC_INTEGRATION, SantamConstants.INBOUND_CONFIG_NAME))
        .select()
        .toList();
  }

}