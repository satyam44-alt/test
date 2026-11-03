package za.co.santam.cc.contact.santamcard

uses za.co.santam.cc.common.SantamLoggers

class ConfirmationDTO {
  private final var data : String[]
  private static final var logger = SantamLoggers.SANTAMCARD

  construct(confirmation : String) {
    data = confirmation.split(",")
  }

  property get Infrakey() : String {
    return data[0].trim()
  }

  property get CardDeliveryRequest() : CardDeliveryRequest_Ext {
    var scenarioFlag = data[15].trim()
    var deliveryRequest = CardDeliveryRequest_Ext.get(scenarioFlag)
    return deliveryRequest
  }

  property get CardNumber() : String {
    return data[16].trim()
  }

  property get CardResponse() : SantamCardResponse_Ext {
    var code = data[18]
    var cardResponseExt = SantamCardResponse_Ext.AllTypeKeys.firstWhere(\elt -> elt.Code == code)
    return cardResponseExt ?: SantamCardResponse_Ext.TC_GN
  }

  property get CardStatus() : SantamCardStatus_Ext {
    return CardResponse == TC_00 ? TC_ACTIVE : TC_ERROR
  }



}