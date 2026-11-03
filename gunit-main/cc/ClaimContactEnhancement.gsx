package za.co.santam.cc.contact.santamcard

enhancement ClaimContactEnhancement : ClaimContact {

  property get HasClaimantAndInsuredRole() : boolean {
    return {ContactRole.TC_CLAIMANT, ContactRole.TC_INSURED}.allMatch(\elt1 -> this.Roles.hasMatch(\role -> role.Role == elt1))
  }

}
