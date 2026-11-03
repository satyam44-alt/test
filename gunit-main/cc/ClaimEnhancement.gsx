package za.co.santam.cc.contact.santamcard

uses gw.api.database.Query
uses gw.api.database.Relop

enhancement ClaimEnhancement : Claim {
  property get IsClosing() : boolean {
    return this.isFieldChanged("State")
        and this.getOriginalValue("State") == ClaimState.TC_OPEN
        and this.State == ClaimState.TC_CLOSED
  }

  property get HasOpenSantamCardRequests() : boolean {
    var openCardStatuses = {SantamCardStatus_Ext.TC_SEND, SantamCardStatus_Ext.TC_PENDING}.toTypedArray()
    return Query.make(SantamCardHistory_Ext)
        .compareIn(SantamCardHistory_Ext#CardStatus, openCardStatuses)
        .compare(SantamCardHistory_Ext#ClaimNumber, Relop.Equals, this.ClaimNumber)
        .select()
        .hasMatch(\santamCardHistoryExt -> santamCardHistoryExt.Card.ClaimNumber == this.ClaimNumber)
  }
}
