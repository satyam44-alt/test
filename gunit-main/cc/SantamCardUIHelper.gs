package za.co.santam.cc.contact.santamcard

uses entity.Contact

class SantamCardUIHelper {

  static function canIssueCard(selectedClaimContact : ClaimContact) : Boolean {
    if (selectedClaimContact == null) {
      return false
    }

    var claim = selectedClaimContact.Claim
    var claimIsNotOpen = not{ClaimState.TC_OPEN}.contains(claim.State)
    if (claimIsNotOpen) {
      return false
    }

    if (not(selectedClaimContact.Contact typeis Person)) {
      return false
    }

    var person = selectedClaimContact.Contact as Person
    var cardIsActiveOrError = person.SantamCard_Ext?.CardStatus == null or {SantamCardStatus_Ext.TC_ACTIVE, SantamCardStatus_Ext.TC_ERROR}.contains(person.SantamCard_Ext?.CardStatus)
    if (not cardIsActiveOrError) {
      return false
    }

    return true
  }

  static function initOrGetSantamCard(contact : Contact) : SantamCard_Ext {
    var santamCard : SantamCard_Ext = null
    if (contact typeis Person) {
      santamCard = contact.SantamCard_Ext ?: new SantamCard_Ext() {
        :CardHolder = contact
      }
      santamCard.CardDeliveryRequest = null
    }
    return santamCard
  }

  static function initSantamCardAddressOwner(santamCard : SantamCard_Ext) : SantamCardAddressOwner {
    if (santamCard == null) {
      return new SantamCardAddressOwner(null)
    }

    var santamCardAddressOwner = new SantamCardAddressOwner(santamCard)
    if (santamCard.DeliveryAddress == null) {
      santamCard.DeliveryAddress = santamCardAddressOwner.getOrCreateNewAddress()
    }

    return santamCardAddressOwner
  }

  static function orderHistory(history : SantamCardHistory_Ext[]) : SantamCardHistory_Ext[] {
    if (history == null) {
      return {}
    }
    return history
        .orderByDescending(\h -> h.SendRequest.EffectiveDate)
        .thenBy(\h -> h.EffectiveDate)
        .toTypedArray()
  }

  static function filterCardDeliveryOptions(card : SantamCard_Ext, value : CardDeliveryRequest_Ext) : boolean {
    var santamCardTypeExt = card.History.HasElements ? SantamCardType_Ext.TC_REPLACE : SantamCardType_Ext.TC_NEW
    return value.hasCategory(santamCardTypeExt)
  }

}