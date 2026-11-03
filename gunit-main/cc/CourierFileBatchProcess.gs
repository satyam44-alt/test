package za.co.santam.cc.contact.santamcard

uses gw.surepath.suite.integration.outbound.util.OutboundFileConfigFactory
uses za.co.santam.cc.integration.properties.RuntimePropertiesUtil
uses za.co.santam.cc.util.SantamConstants

class CourierFileBatchProcess extends com.guidewire.outboundfile.batch.OutboundFileBatchProcess {

  private var _outboundRecord : OutboundRecord


  construct() {
    this({RuntimePropertiesUtil.getRuntimeProperty(RuntimePropertyGroup.TC_INTEGRATION, SantamConstants.OUTBOUND_CONFIG_NAME)})
  }

  construct(args : Object[]) {

    super(BatchProcessType.TC_SANTAMCARDCOURIERFILE_EXT,
        {
            args != null and args.length == 1
                ? OutboundFileConfigFactory.makeConfig(String.valueOf(args[0]))
                : OutboundFileConfigFactory.makeConfig(RuntimePropertiesUtil.getRuntimeProperty(RuntimePropertyGroup.TC_INTEGRATION, SantamConstants.OUTBOUND_CONFIG_NAME))
        })
  }

  override function doWork() {
    _outboundRecord = CourierFileRecordCreator.createOutboundRecordForPendingSendSantamCardRequests()

    if (_outboundRecord == null) {
      return
    }

    super.doWork()
    CourierFileRecordProcessor.updateProcessedSantamCards(_outboundRecord)
  }


}