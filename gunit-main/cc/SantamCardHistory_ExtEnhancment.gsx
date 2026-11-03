package za.co.santam.cc.contact.santamcard

enhancement SantamCardHistory_ExtEnhancment : SantamCardHistory_Ext {
  property get SendRequest() : SantamCardHistory_Ext {
    return this.Card
        .History
        .orderByDescending(\h -> h.EffectiveDate)
        .firstWhere(\elt -> elt.CardStatus == SantamCardStatus_Ext.TC_SEND and elt.EffectiveDate <= this.EffectiveDate)
  }
}
