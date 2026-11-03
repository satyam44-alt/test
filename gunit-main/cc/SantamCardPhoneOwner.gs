package za.co.santam.cc.contact.santamcard

uses gw.api.locale.DisplayKey
uses gw.api.phone.PhoneFields
uses gw.api.phone.PhoneOwnerFieldId
uses gw.api.phone.StandardPhoneOwner

class SantamCardPhoneOwner extends StandardPhoneOwner {

  construct(card : SantamCard_Ext, phoneType : PhoneType) {
    super(getFields(card, phoneType), getLabel(phoneType), getRequired(phoneType, card.PrimaryPhone))
  }

  static function getLabel(phoneType : PhoneType) : String {
    return phoneType == PhoneType.TC_HOME ? DisplayKey.get("Web.ContactDetail.Phone.Home")
        : phoneType == PhoneType.TC_WORK ? DisplayKey.get("Web.ContactDetail.Phone.Work")
        : phoneType == PhoneType.TC_CELL ? DisplayKey.get("Web.ContactDetail.Phone.Cell")
        : ""
  }

  static function getRequired(phoneType : PhoneType, primaryPhone : PrimaryPhoneType) : Boolean {
    return phoneType == PhoneType.TC_HOME and primaryPhone == PrimaryPhoneType.TC_HOME
        || phoneType == PhoneType.TC_WORK and primaryPhone == PrimaryPhoneType.TC_WORK
        || phoneType == PhoneType.TC_CELL and primaryPhone == PrimaryPhoneType.TC_MOBILE
  }

  static function getFields(card : SantamCard_Ext, phoneType : PhoneType) : PhoneFields {
    return phoneType == PhoneType.TC_HOME ? new gw.api.phone.ContactPhoneDelegate(card, SantamCard_Ext#HomePhone)
        : phoneType == PhoneType.TC_WORK ? new gw.api.phone.ContactPhoneDelegate(card, SantamCard_Ext#WorkPhone)
        : phoneType == PhoneType.TC_CELL ? new gw.api.phone.ContactPhoneDelegate(card, SantamCard_Ext#CellPhone)
        : null
  }

  override function isEditable(fieldId : PhoneOwnerFieldId) : boolean {
    return not{PhoneOwnerFieldId.COUNTRY_CODE}.contains(fieldId)
  }
}