package za.co.santam.cc.contact.santamcard

uses entity.OutboundFileConfig
uses gw.api.outboundfile.BaseOutboundFileHandler
uses za.co.santam.cc.common.SantamLoggers

class CourierFileHandler extends BaseOutboundFileHandler {

  construct(config : OutboundFileConfig) {
    super(config)
  }

  override function createFilename(batchID : String) : String {
    var fileName = CourierFileSequenceGenerator.getNextFileName()
    SantamLoggers.SANTAMCARD.newStructuredLoggerMap(#createFilename(String))
        .withMessage("The next courier file name is: ${fileName}")
        .logDebugIfEnabled()
    return fileName
  }

}